import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AiStudioView } from '@/components/assignments/ai-studio-view'

export const metadata: Metadata = {
    title: 'Estudio de Correcciones IA | Organizador Docente',
    description: 'Revisa, edita y aprueba las correcciones generadas por Gemini.',
}

export default async function AiStudioPage({
    params,
}: {
    params: Promise<{ id: string; assignmentId: string }>
}) {
    const { id: courseId, assignmentId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Fetch the assignment to ensure it exists and belongs to this course
    const { data: assignment, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', assignmentId)
        .eq('course_id', courseId)
        .single()

    if (error || !assignment) {
        redirect(`/cursos/${courseId}/trabajos`)
    }

    return (
        <div className="w-full h-[calc(100vh-80px)] pt-4 pb-4">
            <AiStudioView courseId={courseId} assignment={assignment} />
        </div>
    )
}
