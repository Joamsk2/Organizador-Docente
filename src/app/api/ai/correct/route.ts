import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { geminiFlash } from '@/lib/ai/gemini'
import { batchCorrectionSchema } from '@/lib/ai/schemas'
import { CORRECTION_PROMPT } from '@/lib/ai/prompts'
import { createClient } from '@/lib/supabase/server'

// Batch size for corrections (reduced to 1 to avoid Vercel Hobby timeouts)
const BATCH_SIZE = 1

// Max Vercel Function Duration (Seconds)
export const maxDuration = 60

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        let { assignment_id, digest, student_ids } = await request.json()

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

        // Fetch submissions
        let query = supabase
            .from('assignment_submissions')
            .select(`
                id,
                student_id,
                file_urls,
                feedback,
                students!inner(first_name, last_name)
            `)
            .eq('assignment_id', assignment_id)
        
        // If specific student_ids are provided, filter by them and allow 'corregido' status
        if (student_ids && Array.isArray(student_ids) && student_ids.length > 0) {
            query = query.in('student_id', student_ids)
        } else {
            // Default batch: include 'entregado' (new) and 'corregido' (re-correction allowed)
            query = query.in('status', ['entregado', 'corregido']).limit(2) // Limitamos a 2 para evitar timeout de 10s en Vercel Hobby
        }

        const { data: submissions, error: subError } = await query

        if (subError || !submissions?.length) {
            return NextResponse.json(
                { error: 'No hay entregas para corregir' },
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
                
                // Supabase join can return an object or an array depending on the query/config
                const studentData = sub.students as any
                const student = Array.isArray(studentData) ? studentData[0] : studentData

                if (!student) {
                    console.warn(`No student data found for submission ${sub.id}`)
                    continue
                }
                
                // Skip students with no content to avoid AI confusion/failure
                if (!sub.feedback && (!sub.file_urls || sub.file_urls.length === 0)) {
                    console.log(`Skipping student ${student.first_name} ${student.last_name} (no content)`)
                    continue
                }

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

            try {
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
                    maxRetries: 1, // Reduced for faster failure detection during debugging
                })

                console.log(`AI Response for batch starting at ${i}:`, object.corrections.length, 'corrections received')

                // Map corrections to submissions by matching student_id
                object.corrections.forEach((correction) => {
                    const sub = batch.find(s => s.student_id === correction.student_id)
                    if (sub) {
                        allCorrections.push({
                            submission_id: sub.id,
                            student_id: sub.student_id,
                            correction: correction as unknown as Record<string, unknown>,
                        })
                    } else {
                        console.warn(`AI returned correction for student_id ${correction.student_id} not in current batch`)
                        // Fallback to position if student_id matching fails (AI might hallucinate ID)
                        // but let's be strict for now to avoid data corruption
                    }
                })
            } catch (aiError: any) {
                console.error('AI Generation Error Details:', JSON.stringify(aiError, null, 2))
                // If it's a validation error, log the response if available
                if (aiError.response) {
                    console.error('AI Raw Response:', aiError.response)
                }
                throw new Error(`Error de IA: ${aiError.message || 'Fallo en la generación'}`)
            }
        }

        // Save all corrections to database using upsert to allow re-correcciones
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
                updated_at: new Date().toISOString(),
            }

            const { error: upsertError } = await supabase
                .from('ai_corrections')
                .upsert(insertData, { onConflict: 'submission_id' })

            if (upsertError) {
                console.error('Upsert error:', upsertError)
            }
        }

        return NextResponse.json({
            success: true,
            corrected_count: allCorrections.length,
            batch_calls_made: Math.ceil(submissions.length / BATCH_SIZE),
            corrections: allCorrections,
        })

    } catch (error: any) {
        console.error('CRITICAL ERROR in /api/ai/correct:')
        console.error('Message:', error.message)
        console.error('Stack:', error.stack)
        if (error.cause) console.error('Cause:', error.cause)
        
        return NextResponse.json(
            { 
                error: 'Error en la corrección automática',
                details: error.message || String(error)
            },
            { status: 500 }
        )
    }
}
