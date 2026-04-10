import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { geminiFlashLite } from '@/lib/ai/gemini'
import { transcriptionSchema } from '@/lib/ai/schemas'
import { TRANSCRIPTION_PROMPT } from '@/lib/ai/prompts'
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

        const { image_base64, mime_type = 'image/webp' } = await request.json()

        if (!image_base64) {
            return NextResponse.json({ error: 'image_base64 es requerido' }, { status: 400 })
        }

        // Send compressed image to Gemini for transcription only
        const { object } = await generateObject({
            model: geminiFlashLite,
            schema: transcriptionSchema,
            system: TRANSCRIPTION_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image' as const,
                            image: `data:${mime_type};base64,${image_base64}`,
                        },
                        {
                            type: 'text' as const,
                            text: 'Transcribe exactamente lo que escribió el alumno en esta imagen.',
                        },
                    ],
                },
            ],
            maxRetries: 3,
        })

        return NextResponse.json({
            success: true,
            transcription: object,
        })

    } catch (error) {
        console.error('Transcription error:', error)
        return NextResponse.json(
            { error: 'Error al transcribir la imagen' },
            { status: 500 }
        )
    }
}
