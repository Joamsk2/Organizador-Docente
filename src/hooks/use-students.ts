import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'
import { toast } from 'sonner'

type Student = Database['public']['Tables']['students']['Row']
type InsertStudent = Database['public']['Tables']['students']['Insert']
type CourseStudent = Database['public']['Tables']['course_students']['Row']

export type StudentWithCourses = Student & {
    course_students: (CourseStudent & {
        courses: { id: string; name: string; year: string | null; division: string | null } | null
    })[]
}

export function useStudents(courseIdFilter?: string | null) {
    const [students, setStudents] = useState<StudentWithCourses[]>([])
    const [loading, setLoading] = useState(true)

    const fetchStudents = useCallback(async () => {
        setLoading(true)
        const supabase = createClient()

        // We fetch all students for the teacher and their enrollments
        // Row Level Security ensures we only get this teacher's students.
        let query = supabase
            .from('students')
            .select(`
        *,
        course_students (
          id, status, course_id,
          courses (id, name, year, division)
        )
      `)
            .order('last_name')
            .order('first_name')

        const { data, error } = await query

        if (error) {
            toast.error('Error al cargar alumnos', { description: error.message })
        } else {
            let resultData = data as unknown as StudentWithCourses[]

            // If filtering by course, apply filter
            if (courseIdFilter) {
                resultData = resultData.filter(student =>
                    student.course_students?.some(cs => cs.course_id === courseIdFilter)
                )
            }

            setStudents(resultData || [])
        }
        setLoading(false)
    }, [courseIdFilter])

    const createStudent = async (studentData: Omit<InsertStudent, 'teacher_id'>, courseIdsToEnroll: string[]) => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return false

        // 1. Create student
        const { data: newStudent, error: studentError } = await supabase
            .from('students')
            .insert({ ...studentData, teacher_id: user.id })
            .select()
            .single()

        if (studentError) {
            toast.error('Error al crear alumno', { description: studentError.message })
            return false
        }

        // 2. Enroll in courses
        if (courseIdsToEnroll.length > 0 && newStudent) {
            const enrollments = courseIdsToEnroll.map(courseId => ({
                student_id: newStudent.id,
                course_id: courseId,
                status: 'activo' as const
            }))

            const { error: enrollError } = await supabase
                .from('course_students')
                .insert(enrollments)

            if (enrollError) {
                toast.error('Alumno creado, pero hubo un error al matricularlo en algunos cursos')
            }
        }

        toast.success('Alumno creado exitosamente')
        fetchStudents()
        return true
    }

    const createStudentsBulk = async (studentsData: Omit<InsertStudent, 'teacher_id'>[], courseIdsToEnroll: string[]) => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return false

        const studentsWithTeacher = studentsData.map(student => ({
            ...student,
            teacher_id: user.id
        }))

        // 1. Create students
        const { data: newStudents, error: studentsError } = await supabase
            .from('students')
            .insert(studentsWithTeacher)
            .select()

        if (studentsError) {
            toast.error('Error al importar alumnos', { description: studentsError.message })
            return false
        }

        // 2. Enroll in courses
        if (courseIdsToEnroll.length > 0 && newStudents && newStudents.length > 0) {
            const enrollments = newStudents.flatMap(student =>
                courseIdsToEnroll.map(courseId => ({
                    student_id: student.id,
                    course_id: courseId,
                    status: 'activo' as const
                }))
            )

            const { error: enrollError } = await supabase
                .from('course_students')
                .insert(enrollments)

            if (enrollError) {
                toast.error('Alumnos creados, pero hubo un error al matricularlos en algunos cursos')
            }
        }

        toast.success(`${newStudents?.length || 0} alumnos importados exitosamente`)
        fetchStudents()
        return true
    }

    const updateStudent = async (id: string, updates: Partial<InsertStudent>, newCourseIds: string[]) => {
        const supabase = createClient()

        // Update basic info
        const { error } = await supabase
            .from('students')
            .update(updates)
            .eq('id', id)

        if (error) {
            toast.error('Error al actualizar alumno', { description: error.message })
            return false
        }

        // Handle course enrollments:
        // This is simple: fetch existing, compute differences, insert/delete
        const { data: existingEnrollments } = await supabase
            .from('course_students')
            .select('course_id')
            .eq('student_id', id)

        const existingIds = existingEnrollments?.map(e => e.course_id) || []
        const toAdd = newCourseIds.filter(id => !existingIds.includes(id))
        const toRemove = existingIds.filter(id => !newCourseIds.includes(id))

        if (toAdd.length > 0) {
            await supabase.from('course_students').insert(toAdd.map(cid => ({ student_id: id, course_id: cid, status: 'activo' as const })))
        }
        if (toRemove.length > 0) {
            await supabase.from('course_students').delete().eq('student_id', id).in('course_id', toRemove)
        }

        toast.success('Alumno actualizado')
        fetchStudents()
        return true
    }

    const deleteStudent = async (id: string) => {
        const supabase = createClient()
        const { error } = await supabase
            .from('students')
            .delete()
            .eq('id', id)

        if (error) {
            toast.error('Error al eliminar alumno', { description: error.message })
            return false
        }

        toast.success('Alumno eliminado')
        fetchStudents()
        return true
    }

    return {
        students,
        loading,
        fetchStudents,
        createStudent,
        createStudentsBulk,
        updateStudent,
        deleteStudent,
    }
}
