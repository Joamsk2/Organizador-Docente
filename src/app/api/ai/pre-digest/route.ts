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
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { assignment_id } = await request.json()

        if (!assignment_id) {
            return NextResponse.json({ error: 'assignment_id es requerido' }, { status: 400 })
        }

        // Fetch all reference materials for this assignment
        const { data: materials, error: materialsError } = await supabase
            .from('assignment_reference_materials')
            .select('*')
            .eq('assignment_id', assignment_id)

        if (materialsError || !materials?.length) {
            return NextResponse.json(
                { error: 'No se encontraron materiales de referencia para este trabajo' },
                { status: 404 }
            )
        }

        // Compose the content to digest
        const contentParts = materials.map((m) => {
            const typeLabel =
                m.material_type === 'reading_material' ? '📄 Material de Lectura' :
                    m.material_type === 'instructions' ? '📋 Consignas' :
                        '✅ Criterios de Evaluación'

            return `### ${typeLabel}: ${m.title}\n${m.content_text || '[Archivo adjunto - ver file_url]'}`
        }).join('\n\n---\n\n')

        // Generate digest with structured output
        const { object } = await generateObject({
            model: geminiFlashLite,
            schema: preDigestSchema,
            system: PRE_DIGEST_PROMPT,
            prompt: `Analiza y condensa el siguiente material:\n\n${contentParts}`,
            maxRetries: 3,
        })

        // Store the digest back in the first reference material (or a dedicated field)
        // For now, update topics based on AI analysis
        const readingMaterial = materials.find(m => m.material_type === 'reading_material')
        if (readingMaterial) {
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

    } catch (error) {
        console.error('Pre-digest error:', error)
        return NextResponse.json(
            { error: 'Error al procesar los materiales' },
            { status: 500 }
        )
    }
}
