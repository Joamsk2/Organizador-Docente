import { NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { geminiFlashLite } from '@/lib/ai/gemini'
import { batchCorrectionSchema } from '@/lib/ai/schemas'
import { CORRECTION_PROMPT } from '@/lib/ai/prompts'

export const maxDuration = 60

export async function GET() {
    console.log('Iniciando prueba de conexión con Gemini 3.1 Flash-Lite...\n')

    const dummyDigest = `
    Tema: Revolución de Mayo.
    Criterios de Evaluación:
    1. Comprensión Histórica (0-4 pts)
    2. Redacción y Ortografía (0-3 pts)
    3. Argumentación (0-3 pts)
    `

    const mockSubmissions = [
        {
            submission_id: 'sub-001',
            student_name: 'Juan Pérez',
            content: 'La Revolución de Mayo fue en 1810, la gente quería ser libre de España. Estaban enojados con el virrey Cisneros porque España había caido ante Napoleón.',
        },
        {
            submission_id: 'sub-002',
            student_name: 'María Gómez',
            content: 'Fue un evento importante en Argentina. Muchos patriotas se juntaron en el cabildo abierto. Hubieron discusiones pero al final formaron la Primera Junta.',
        }
    ]

    try {
        const { object } = await generateObject({
            model: geminiFlashLite,
            system: CORRECTION_PROMPT,
            schema: batchCorrectionSchema,
            messages: [
                {
                    role: 'user',
                    content: `
                    MATERIAL DE REFERENCIA Y CRITERIOS:
                    ${dummyDigest}
                    
                    ENTREGAS DE ALUMNOS (LOTE):
                    ${JSON.stringify(mockSubmissions, null, 2)}
                    `
                }
            ]
        })

        return NextResponse.json({
            success: true,
            data: object
        })

    } catch (error: any) {
        console.error('❌ Error durante la prueba:', error)
        return NextResponse.json({
            success: false,
            error: error.message || 'Error desconocido'
        }, { status: 500 })
    }
}
