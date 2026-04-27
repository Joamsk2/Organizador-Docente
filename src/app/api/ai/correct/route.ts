import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { geminiFlash } from '@/lib/ai/gemini'
import { batchCorrectionSchema } from '@/lib/ai/schemas'
import { CORRECTION_PROMPT } from '@/lib/ai/prompts'
import { createClient } from '@/lib/supabase/server'

// Batch size for corrections (reduced for multi-modal processing)
const BATCH_SIZE = 2

// Max Vercel Function Duration (Seconds)
export const maxDuration = 60

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        let { assignment_id, digest } = await request.json()

        if (!assignment_id) {
            return NextResponse.json({ error: 'assignment_id es requerido' }, { status: 400 })
        }

        // Fallback: if digest is missing in request, try to fetch from assignment record
        if (!digest) {
            const { data: assignmentData } = await supabase
                .from('assignments')
                .select('digest')
                .eq('id', assignment_id)
                .single()

            digest = assignmentData?.digest
        }

        if (!digest) {
            return NextResponse.json(
                { error: 'El digest (resumen de material) no existe. Ejecute pre-digest primero.' },
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

        // Build context (common to all batches)
        const contextPrefix = `## DIGEST DEL MATERIAL DE REFERENCIA\n${digest}\n\n## CRITERIOS DE EVALUACIÓN\n${criteria?.map(c => `### ${c.title}\n${c.content_text}`).join('\n\n') || 'No se definieron criterios específicos. Evalúa según el contenido del digest.'}`

        const allCorrections: Array<{
            submission_id: string
            student_id: string
            correction: Record<string, unknown>
        }> = []

        // Process in small batches
        for (let i = 0; i < submissions.length; i += BATCH_SIZE) {
            const batch = submissions.slice(i, i + BATCH_SIZE)

            // Prepare messages with multi-modal content
            const messageContent: any[] = [
                { type: 'text', text: `${contextPrefix}\n\n## RESPUESTAS DE LOS ALUMNOS A CORREGIR` }
            ]

            for (let idx = 0; idx < batch.length; idx++) {
                const sub = batch[idx]
                const student = sub.students as unknown as { first_name: string; last_name: string }
                
                let studentBlock = `\n\n### Alumno ${idx + 1} (ID: ${sub.student_id})\nNombre: ${student.first_name} ${student.last_name}\nRespuesta de texto: ${sub.feedback || '[Sin texto escrito]'}`
                
                if (sub.file_urls && sub.file_urls.length > 0) {
                    studentBlock += `\n[Se adjuntan ${sub.file_urls.length} archivos a continuación para este alumno]`
                }
                
                messageContent.push({ type: 'text', text: studentBlock })

                // Add file parts if available
                if (sub.file_urls && sub.file_urls.length > 0) {
                    // Process up to 3 files per student to avoid context explosion
                    const filesToProcess = sub.file_urls.slice(0, 3)
                    
                    for (const url of filesToProcess) {
                        try {
                            // Extract path from Supabase URL
                            // Format: .../storage/v1/object/public/bucket/path
                            const pathParts = url.split('/submissions/')
                            if (pathParts.length > 1) {
                                const path = pathParts[1]
                                const { data: fileData, error: downloadError } = await supabase.storage
                                    .from('submissions')
                                    .download(path)

                                if (!downloadError && fileData) {
                                    const arrayBuffer = await fileData.arrayBuffer()
                                    const mimeType = fileData.type || (url.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
                                    
                                    messageContent.push({
                                        type: 'file',
                                        data: Buffer.from(arrayBuffer),
                                        mimeType: mimeType
                                    })
                                }
                            }
                        } catch (e) {
                            console.error(`Error processing file for student ${sub.student_id}:`, e)
                        }
                    }
                }
            }

            const { object } = await generateObject({
                model: geminiFlash,
                schema: batchCorrectionSchema,
                system: CORRECTION_PROMPT,
                messages: [
                    {
                        role: 'user',
                        content: messageContent,
                    }
                ],
                maxRetries: 2,
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
