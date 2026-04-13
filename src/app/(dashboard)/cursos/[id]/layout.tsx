import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { CourseTabs } from '@/components/dashboard/course-tabs'

export default async function CourseLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch course with school details
    const { data: course } = await supabase
        .from('courses')
        .select(`
            *,
            school:schools(name)
        `)
        .eq('id', id)
        .single()

    if (!course) {
        redirect('/escuelas')
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto flex flex-col h-full">
            <div className="flex-shrink-0 space-y-4">
                <Link href="/escuelas" className="inline-flex items-center text-sm font-medium text-text-muted hover:text-text-primary transition-colors">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Volver a Escuelas
                </Link>

                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: course.color || '#6366f1' }} />
                            <h1 className="text-2xl lg:text-3xl font-bold text-text-primary capitalize">
                                {course.name} {course.year} {course.division}
                            </h1>
                        </div>
                        <p className="text-text-secondary text-sm ml-6">
                            {(course.school as any)?.name}
                        </p>
                    </div>
                </div>

                <CourseTabs courseId={id} />
            </div>

            <div className="flex-1 min-h-0">
                {children}
            </div>
        </div>
    )
}
