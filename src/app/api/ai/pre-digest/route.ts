import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { geminiFlashLite } from '@/lib/ai/gemini'
import { preDigestSchema } from '@/lib/ai/schemas'
import { PRE_DIGEST_PROMPT } from '@/lib/ai/prompts'
import { createClient } from '@/lib/supabase/server'

// Max Vercel Function Duration (Seconds)
export const maxDuration = 60

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            console.error('[Pre-digest] No user found in session')
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json().catch(() => ({}))
        const { assignment_id } = body

        if (!assignment_id) {
            console.error('[Pre-digest] Missing assignment_id in request body')
            return NextResponse.json({ error: 'assignment_id es requerido' }, { status: 400 })
        }

        console.log(`[Pre-digest] Starting process for assignment: ${assignment_id}`)

        // Fetch all reference materials for this assignment
        const { data: materials, error: materialsError } = await supabase
            .from('assignment_reference_materials')
            .select('*')
            .eq('assignment_id', assignment_id)

        if (materialsError) {
            console.error('[Pre-digest] Database error fetching materials:', materialsError)
            return NextResponse.json({ error: 'Error al consultar la base de datos' }, { status: 500 })
        }

        if (!materials || materials.length === 0) {
            console.warn(`[Pre-digest] No materials found for assignment ${assignment_id}`)
            return NextResponse.json(
                { error: 'No se encontraron materiales de referencia. Por favor, agregue consignas o textos al trabajo.' },
                { status: 404 }
            )
        }

        // Compose the content to digest
        const contentParts = materials.map((m) => {
            const typeLabel =
                m.material_type === 'reading_material' ? '📄 Material de Lectura' :
                    m.material_type === 'instructions' ? '📋 Consignas' :
                        '✅ Criterios de Evaluación'

            return `### ${typeLabel}: ${m.title}\n${m.content_text || '[Archivo adjunto sin texto extraído]'}`
        }).join('\n\n---\n\n')

        console.log(`[Pre-digest] Processing ${materials.length} materials. Total content: ${contentParts.length} chars.`)

        if (contentParts.length < 5) { // Relaxed check
             return NextResponse.json(
                { error: 'El material de referencia está vacío. Por favor, asegúrese de que el trabajo tenga consignas o material de lectura.' },
                { status: 400 }
            )
        }

        // Generate digest with structured output
        console.log('[Pre-digest] Calling AI model...')
        let result;
        try {
            result = await generateObject({
                model: geminiFlashLite,
                schema: preDigestSchema,
                system: PRE_DIGEST_PROMPT,
                prompt: `Analiza y condensa el siguiente material:\n\n${contentParts}`,
                maxRetries: 3,
            })
        } catch (aiError: any) {
            console.error('[Pre-digest] AI Generation failed:', aiError)
            return NextResponse.json({ 
                error: `Fallo la generación por IA: ${aiError.message || 'Error desconocido'}`,
                details: aiError.stack
            }, { status: 502 })
        }

        const { object } = result
        console.log(`[Pre-digest] AI Success. Digest length: ${object.digest?.length || 0}`)

        if (!object.digest) {
            throw new Error('El modelo no generó un resumen válido')
        }

        // Store the digest back in the assignment table
        const { error: updateError } = await supabase
            .from('assignments')
            .update({ digest: object.digest })
            .eq('id', assignment_id)

        if (updateError) {
            console.error('[Pre-digest] Error saving digest to assignments table:', updateError)
            // Continue anyway, we can return the digest to the client
        }

        // Also update topics in reading material if exists
        const readingMaterial = materials.find(m => m.material_type === 'reading_material')
        if (readingMaterial && object.key_topics?.length > 0) {
            await supabase
                .from('assignment_reference_materials')
                .update({ topics: object.key_topics })
                .eq('id', readingMaterial.id)
        }

        return NextResponse.json({
            success: true,
            digest: object.digest,
            key_topics: object.key_topics,
        })

    } catch (error: any) {
        console.error('[Pre-digest] Unexpected system error:', error)
        return NextResponse.json(
            { error: `Error interno: ${error.message || 'Ocurrió un error inesperado'}` },
            { status: 500 }
        )
    }

}
