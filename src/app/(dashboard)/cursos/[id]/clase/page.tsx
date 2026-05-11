import { createClient } from '@/lib/supabase/server'
import { ActiveClassView } from '@/components/course-summary/active-class-view'
import { notFound } from 'next/navigation'

export default async function ClaseDeHoyPage({ 
    params,
    searchParams 
}: { 
    params: Promise<{ id: string }>,
    searchParams: Promise<{ date?: string }>
}) {
    const { id } = await params
    const { date } = await searchParams
    const supabase = await createClient()

    // Load students for this course
    const { data: studentsEnrollments, error } = await supabase
        .from('course_students')
        .select(`
            students (
                id,
                first_name,
                last_name
            )
        `)
        .eq('course_id', id)
        .eq('status', 'activo')

    if (error) {
        console.error(error)
        return <div>Error loading students</div>
    }

    const students = studentsEnrollments
        ?.map(en => en.students)
        .filter(s => s !== null) as { id: string, first_name: string, last_name: string }[]

    // Sort alphabetically
    students.sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`))

    return (
        <div className="pt-6 pb-20">
            <ActiveClassView 
                courseId={id} 
                students={students} 
                initialDate={date} 
            />
        </div>
    )
}
