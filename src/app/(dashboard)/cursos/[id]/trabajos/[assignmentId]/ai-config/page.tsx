import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AiConfigView } from '@/components/assignments/ai-config-view'

export const metadata: Metadata = {
    title: 'Configurar Corrección IA | Organizador Docente',
    description: 'Genera una clave de corrección asistida por IA para tus trabajos prácticos.',
}

export default async function AiConfigPage({
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
        <div className="w-full flex-1 pt-4 pb-8">
            <AiConfigView courseId={courseId} assignment={assignment} />
        </div>
    )
}
