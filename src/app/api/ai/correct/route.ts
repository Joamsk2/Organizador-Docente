import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { geminiFlashLite } from '@/lib/ai/gemini'
import { batchCorrectionSchema } from '@/lib/ai/schemas'
import { CORRECTION_PROMPT } from '@/lib/ai/prompts'
import { createClient } from '@/lib/supabase/server'

// Batch size for corrections (optimize: 1 call per batch)
const BATCH_SIZE = 6

// Max Vercel Function Duration (Seconds)
export const maxDuration = 60

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { assignment_id, digest } = await request.json()

        if (!assignment_id || !digest) {
            return NextResponse.json(
                { error: 'assignment_id y digest son requeridos. Ejecute pre-digest primero.' },
                { status: 400 }
            )
        }

        // Fetch evaluation criteria
        const { data: criteria } = await supabase
            .from('assignment_reference_materials')
            .select('content_text, title')
            .eq('assignment_id', assignment_id)
            .eq('material_type', 'evaluation_criteria')

        // Fetch all pending submissions for this assignment
        const { data: submissions, error: subError } = await supabase
            .from('assignment_submissions')
            .select(`
        id,
        student_id,
        file_urls,
        feedback,
        students!inner(first_name, last_name)
      `)
            .eq('assignment_id', assignment_id)
            .eq('status', 'entregado')

        if (subError || !submissions?.length) {
            return NextResponse.json(
                { error: 'No hay entregas pendientes para corregir' },
                { status: 404 }
            )
        }

        // Build context (same prefix for cache optimization)
        const contextPrefix = `## DIGEST DEL MATERIAL DE REFERENCIA\n${digest}\n\n## CRITERIOS DE EVALUACIÓN\n${criteria?.map(c => `### ${c.title}\n${c.content_text}`).join('\n\n') || 'No se definieron criterios específicos. Evalúa según el contenido del digest.'}`

        // Process in batches
        const allCorrections: Array<{
            submission_id: string
            student_id: string
            correction: Record<string, unknown>
        }> = []

        for (let i = 0; i < submissions.length; i += BATCH_SIZE) {
            const batch = submissions.slice(i, i + BATCH_SIZE)

            // Build student responses for this batch
            const studentsBlock = batch.map((sub, idx) => {
                const student = sub.students as unknown as { first_name: string; last_name: string }
                return `### Alumno ${idx + 1} (ID: ${sub.student_id})\nNombre: ${student.first_name} ${student.last_name}\nRespuesta: ${sub.feedback || '[Sin texto - revisar archivos adjuntos]'}`
            }).join('\n\n---\n\n')

            const { object } = await generateObject({
                model: geminiFlashLite,
                schema: batchCorrectionSchema,
                system: CORRECTION_PROMPT,
                prompt: `${contextPrefix}\n\n---\n\n## RESPUESTAS DE LOS ALUMNOS A CORREGIR\n\n${studentsBlock}`,
                maxRetries: 3,
            })

            // Map corrections to submissions
            object.corrections.forEach((correction, idx) => {
                if (batch[idx]) {
                    allCorrections.push({
                        submission_id: batch[idx].id,
                        student_id: batch[idx].student_id,
                        correction: correction as unknown as Record<string, unknown>,
                    })
                }
            })
        }

        // Save all corrections to database
        for (const { submission_id, correction } of allCorrections) {
            const insertData: any = {
                submission_id,
                criteria_scores: correction.criteria_scores,
                suggested_grade: correction.suggested_grade,
                detected_errors: correction.detected_errors,
                student_feedback: correction.student_feedback,
                improvement_suggestions: correction.improvement_suggestions,
                correction_summary: correction.correction_summary,
                status: 'corrected_by_ai',
            }

            const { error: insertError } = await supabase
                .from('ai_corrections')
                .insert(insertData)

            if (insertError) {
                console.error('Insert error:', insertError)
            }
        }

        return NextResponse.json({
            success: true,
            corrected_count: allCorrections.length,
            batch_calls_made: Math.ceil(submissions.length / BATCH_SIZE),
            corrections: allCorrections,
        })

    } catch (error) {
        console.error('Correction error:', error)
        return NextResponse.json(
            { error: 'Error en la corrección automática' },
            { status: 500 }
        )
    }
}
