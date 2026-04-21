'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Database } from '@/lib/types/database'

type Student = Database['public']['Tables']['students']['Row']
type Attendance = Database['public']['Tables']['attendance']['Row']
type Grade = Database['public']['Tables']['grades']['Row']
type AssignmentSubmission = Database['public']['Tables']['assignment_submissions']['Row']
type Assignment = Database['public']['Tables']['assignments']['Row']

export interface StudentProfileData {
    student: Student | null
    attendanceStats: {
        total: number
        present: number
        absent: number
        late: number
        justified: number
        percentage: number
        recentAttendance: Attendance[]
        attendanceNotes: Attendance[]
    }
    gradesStats: {
        average: number
        recentGrades: Grade[]
    }
    assignmentStats: {
        totalAssigned: number
        delivered: number
        deliveryRate: number
        recentSubmissions: (AssignmentSubmission & { assignments: { title: string, due_date: string | null } | null })[]
    }
}

export function useStudentProfile(studentId: string, courseId: string) {
    const [profile, setProfile] = useState<StudentProfileData | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchProfile = useCallback(async () => {
        if (!studentId || !courseId) return

        setLoading(true)
        const supabase = createClient()

        try {
            // 1. Fetch Student Base Data
            const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select('*')
                .eq('id', studentId)
                .single()

            if (studentError) throw studentError

            // 2. Fetch Attendance for this course
            const { data: attendanceData, error: attendanceError } = await supabase
                .from('attendance')
                .select('*')
                .eq('student_id', studentId)
                .eq('course_id', courseId)
                .order('date', { ascending: false })

            if (attendanceError) throw attendanceError

            // 3. Fetch Grades for this course
            const { data: gradesData, error: gradesError } = await supabase
                .from('grades')
                .select('*')
                .eq('student_id', studentId)
                .eq('course_id', courseId)
                .order('created_at', { ascending: false })

            if (gradesError) throw gradesError

            // 4. Fetch Assignments and Submissions
            // Since filtering joined tables is tricky in JS client, we fetch submissions for student and assignments for course
            const { data: submissionsData, error: submissionsError } = await supabase
                .from('assignment_submissions')
                .select(`
                    *,
                    assignments ( id, title, due_date, course_id )
                `)
                .eq('student_id', studentId)

            if (submissionsError) throw submissionsError

            // Filter submissions to only those belonging to assignments from this course
            const courseSubmissions = (submissionsData || []).filter(
                (sub) => sub.assignments?.course_id === courseId
            ) as (AssignmentSubmission & { assignments: { title: string, due_date: string | null } })[]

            // Also fetch total assignments for this course to calculate delivery rate
            const { count: totalAssignmentsCount } = await supabase
                .from('assignments')
                .select('id', { count: 'exact', head: true })
                .eq('course_id', courseId)

            // --- COMPUTING METRICS ---

            // Attendance
            const att = attendanceData || []
            const presents = att.filter(a => a.status === 'presente').length
            const absences = att.filter(a => a.status === 'ausente').length
            const lates = att.filter(a => a.status === 'tardanza').length
            const justified = att.filter(a => a.status === 'justificado').length
            // "Presentes" include lates usually, but let's count percentage of attendance (presents + lates / total * 100)
            const attendedCount = presents + lates
            const totalAtt = att.length
            const attendancePercentage = totalAtt > 0 ? Math.round((attendedCount / totalAtt) * 100) : 100

            // Grades
            const grd = gradesData || []
            const sumGrades = grd.reduce((acc, curr) => acc + Number(curr.value), 0)
            const average = grd.length > 0 ? Number((sumGrades / grd.length).toFixed(1)) : 0

            // Assignments
            const totalAssigned = totalAssignmentsCount || 0
            const deliveredCount = courseSubmissions.filter(s => s.status === 'entregado' || s.status === 'corregido').length
            const deliveryRate = totalAssigned > 0 ? Math.round((deliveredCount / totalAssigned) * 100) : 100

            const computedData: StudentProfileData = {
                student: studentData,
                attendanceStats: {
                    total: totalAtt,
                    present: presents,
                    absent: absences,
                    late: lates,
                    justified: justified,
                    percentage: attendancePercentage,
                    recentAttendance: att.slice(0, 5), // Last 5
                    attendanceNotes: att.filter(a => a.notes && a.notes.trim() !== '') // All with notes
                },
                gradesStats: {
                    average: average,
                    recentGrades: grd.slice(0, 5) // Last 5
                },
                assignmentStats: {
                    totalAssigned: totalAssigned,
                    delivered: deliveredCount,
                    deliveryRate: deliveryRate,
                    recentSubmissions: courseSubmissions.slice(0, 5) // Last 5
                }
            }

            setProfile(computedData)

        } catch (error: any) {
            console.error('Error fetching student profile:', error)
            toast.error('Error al cargar el perfil del alumno')
        } finally {
            setLoading(false)
        }
    }, [studentId, courseId])

    return {
        profile,
        loading,
        fetchProfile
    }
}
