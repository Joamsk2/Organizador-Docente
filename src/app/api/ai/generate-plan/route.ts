import { geminiFlash } from '@/lib/ai/gemini'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { title, type } = await req.json()

        if (!title) {
            return NextResponse.json({ error: 'Falta el título de la planificación' }, { status: 400 })
        }

        const prompt = `Eres un asistente educativo hiperprofesional experto en diagramación docente.
El profesor requiere generar bases para una planificación de tipo "${type}" y el tema a tratar es "${title}".

DEBES crear un contenido hiperprofesional. ESTRICTAMENTE utiliza la siguiente estructura y devuelve TODO el resultado en formato HTML estructural limpio (sin la etiqueta doctype ni <html><body>, solo contenido usando etiquetas típicas como <h1>, <h2>, <h3>, <p>, <ul>, <li>, <b>). NUNCA envuelvas la respuesta en bloques de código markdown, entrega el HTML crudo directamente.

=== ESTRUCTURA OBLIGATORIA ===

<h1>${title}</h1>

<h2>1. Objetivos</h2>
<ul>
  <li>(Objetivos claros, específicos y procedimentales sobre el tema)</li>
</ul>

<h2>2. Desarrollo</h2>
<p>(Explicación de cómo iniciará la secuencia educativa y el anclaje pedagógico)</p>

<h3>Actividades a realizar</h3>
<ul>
  <li>(Actividades de apertura, desarrollo y validación de comprensión)</li>
</ul>

<h3>Material Bibliográfico</h3>
<p>
  (Escribe aquí un texto enriquecido, directo y sustancioso que abarque teóricamente el tema apuntado. 
  Debe ser lo suficientemente rico como para que el docente pueda usarlo de fotocopia, lectura 
  o de material de biblioteca para que el alumno consuma la teoría y estudie de este fragmento).
</p>

<h2>3. Cierre</h2>
<p>(Reflexión final, actividad de fijación, y modo en el que se validará si se entendió o no el tema tratado).</p>
`

        const { text } = await generateText({
            model: geminiFlash, 
            prompt
        })


        // Sanitización para evitar que devuelva "```html" al principio
        const cleanHtml = text.replace(/```html/g, '').replace(/```/g, '').trim()

        return NextResponse.json({ html: cleanHtml })

    } catch (error: any) {
        console.error('Error in generate-plan:', error)
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
    }
}
