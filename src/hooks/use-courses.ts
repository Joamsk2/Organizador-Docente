import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'
import { toast } from 'sonner'

type Course = Database['public']['Tables']['courses']['Row']
type InsertCourse = Database['public']['Tables']['courses']['Insert']
type CourseSchedule = Database['public']['Tables']['course_schedules']['Row']
type InsertSchedule = Database['public']['Tables']['course_schedules']['Insert']

export type CourseWithSchedules = Course & {
    course_schedules: CourseSchedule[]
}

export function useCourses(schoolId?: string | null) {
    const [courses, setCourses] = useState<CourseWithSchedules[]>([])
    const [loading, setLoading] = useState(true)

    const fetchCourses = useCallback(async () => {
        setLoading(true)
        const supabase = createClient()

        let query = supabase
            .from('courses')
            .select(`
        *,
        course_schedules (*)
      `)
            .order('year')
            .order('name')

        if (schoolId) {
            query = query.eq('school_id', schoolId)
        }

        const { data, error } = await query

        if (error) {
            toast.error('Error al cargar cursos', { description: error.message })
        } else {
            setCourses((data as CourseWithSchedules[]) || [])
        }
        setLoading(false)
    }, [schoolId])

    const createCourse = async (courseData: InsertCourse, schedulesData: Omit<InsertSchedule, 'course_id'>[]) => {
        const supabase = createClient()

        // 1. Create course
        const { data: newCourse, error: courseError } = await supabase
            .from('courses')
            .insert(courseData)
            .select()
            .single()

        if (courseError) {
            toast.error('Error al crear curso', { description: courseError.message })
            return false
        }

        // 2. Create schedules if any
        if (schedulesData.length > 0 && newCourse) {
            const schedulesToInsert = schedulesData.map(s => ({
                ...s,
                course_id: newCourse.id
            }))

            const { error: schedulesError } = await supabase
                .from('course_schedules')
                .insert(schedulesToInsert)

            if (schedulesError) {
                toast.error('Curso creado, pero hubo un error al guardar los horarios', { description: schedulesError.message })
            }
        }

        toast.success('Curso creado exitosamente')
        fetchCourses()
        return true
    }

    const deleteCourse = async (id: string) => {
        const supabase = createClient()
        const { error } = await supabase
            .from('courses')
            .delete()
            .eq('id', id)

        if (error) {
            toast.error('Error al eliminar curso', { description: error.message })
            return false
        }

        toast.success('Curso eliminado')
        fetchCourses()
        return true
    }

    const updateCourse = async (id: string, courseData: any, schedulesData: any[]) => {
        const supabase = createClient()

        const { error: courseError } = await supabase
            .from('courses')
            .update(courseData)
            .eq('id', id)

        if (courseError) {
            toast.error('Error al actualizar curso', { description: courseError.message })
            return false
        }

        // Replace schedules
        const { error: deleteError } = await supabase
            .from('course_schedules')
            .delete()
            .eq('course_id', id)

        if (deleteError) {
            toast.error('Error al actualizar horarios', { description: deleteError.message })
        }

        if (schedulesData.length > 0) {
            const schedulesToInsert = schedulesData.map(s => {
                const { id: _id, ...rest } = s
                return { ...rest, course_id: id }
            })

            const { error: schedulesError } = await supabase
                .from('course_schedules')
                .insert(schedulesToInsert)

            if (schedulesError) {
                toast.error('Curso guardado, pero fallaron los horarios', { description: schedulesError.message })
            }
        }

        toast.success('Curso actualizado')
        fetchCourses()
        return true
    }

    return {
        courses,
        loading,
        fetchCourses,
        createCourse,
        updateCourse,
        deleteCourse,
    }
}
