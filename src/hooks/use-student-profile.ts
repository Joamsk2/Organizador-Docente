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

export interface EvaluationItem {
    id: string
    title: string
    type: 'trabajo' | 'calificacion'
    date: string | null
    dueDate: string | null
    gradeValue: number | null
    status: 'entregado' | 'pendiente' | 'no_presentado'
    submissionStatus?: string | null
    period?: string
}

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
        conceptAverage: number | null
        recentGrades: Grade[] // Legacy for backward compatibility during transition
    }
    assignmentStats: {
        totalAssigned: number
        delivered: number
        deliveryRate: number
        recentSubmissions: (AssignmentSubmission & { assignments: { title: string, due_date: string | null } | null })[]
    }
    // New unified evaluations list
    recentEvaluations: EvaluationItem[]
    courseInfo: { name: string } | null
    teacherInfo: { full_name: string } | null
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

            // 2. Fetch Attendance
            const { data: attendanceData, error: attendanceError } = await supabase
                .from('attendance')
                .select('*')
                .eq('student_id', studentId)
                .eq('course_id', courseId)
                .order('date', { ascending: false })

            if (attendanceError) throw attendanceError

            // 3. Fetch Grades
            const { data: gradesData, error: gradesError } = await supabase
                .from('grades')
                .select('*')
                .eq('student_id', studentId)
                .eq('course_id', courseId)
                .order('created_at', { ascending: false })

            if (gradesError) throw gradesError

            // 4. Fetch Assignments and Submissions
            const { data: assignmentsData, error: assignmentsError } = await supabase
                .from('assignments')
                .select('*')
                .eq('course_id', courseId)
                .in('status', ['asignado', 'entregado'])

            if (assignmentsError) throw assignmentsError

            const { data: submissionsData, error: submissionsError } = await supabase
                .from('assignment_submissions')
                .select(`
                    *,
                    assignments ( id, title, due_date, course_id )
                `)
                .eq('student_id', studentId)

            if (submissionsError) throw submissionsError

            const courseSubmissions = (submissionsData || []).filter(
                (sub) => sub.assignments?.course_id === courseId
            ) as (AssignmentSubmission & { assignments: { title: string, due_date: string | null } })[]

            // 5. Fetch Course and Teacher Info
            const { data: courseData } = await supabase
                .from('courses')
                .select('name')
                .eq('id', courseId)
                .single()

            const { data: teacherData } = await supabase
                .from('teachers')
                .select('full_name')
                .eq('id', studentData.teacher_id)
                .single()

            // --- COMPUTING METRICS ---
            
            const isPerformanceCategory = (cat: string) => cat.startsWith('Desempeño ')
            
            // Attendance
            const att = attendanceData || []
            const presents = att.filter(a => a.status === 'presente').length
            const absences = att.filter(a => a.status === 'ausente').length
            const lates = att.filter(a => a.status === 'tardanza').length
            const justified = att.filter(a => a.status === 'justificado').length
            const attendedCount = presents + lates
            const totalAtt = att.length
            const attendancePercentage = totalAtt > 0 ? Math.round((attendedCount / totalAtt) * 100) : 100

            // Separate grades
            const grd = gradesData || []
            const practicalGrades = grd.filter(g => !isPerformanceCategory(g.category))
            const performanceGrades = grd.filter(g => isPerformanceCategory(g.category))

            const sumPractical = practicalGrades.reduce((acc, curr) => acc + Number(curr.value), 0)
            const practicalAverage = practicalGrades.length > 0 ? Number((sumPractical / practicalGrades.length).toFixed(1)) : 0

            const sumPerformance = performanceGrades.reduce((acc, curr) => acc + Number(curr.value), 0)
            const conceptAverage = performanceGrades.length > 0
                ? Number((sumPerformance / performanceGrades.length).toFixed(1))
                : null

            // --- UNIFIED EVALUATION LOGIC (Anti-duplication) ---
            
            // Map to store unique evaluation entities
            const evaluationsMap = new Map<string, EvaluationItem>()
            const now = new Date()

            // A. Process Assignments first (Formal works)
            ;(assignmentsData || []).forEach(asn => {
                const submission = courseSubmissions.find(s => s.assignment_id === asn.id)
                const grade = practicalGrades.find(g => g.assignment_id === asn.id || g.category === asn.title)
                
                let status: 'entregado' | 'pendiente' | 'no_presentado' = 'pendiente'
                
                if (grade && grade.value > 4) {
                    status = 'entregado'
                } else if (submission && (submission.status === 'entregado' || submission.status === 'corregido')) {
                    status = 'entregado'
                } else {
                    const dueDate = asn.due_date ? new Date(asn.due_date) : null
                    if (dueDate && dueDate < now) {
                        status = 'no_presentado'
                    } else if (!dueDate) {
                        // If no due date and no grade/submission, it's pending by default
                        status = 'pendiente'
                    }
                }

                evaluationsMap.set(asn.id, {
                    id: asn.id,
                    title: asn.title,
                    type: 'trabajo',
                    date: asn.created_at,
                    dueDate: asn.due_date,
                    gradeValue: grade?.value || null,
                    status,
                    submissionStatus: submission?.status,
                    period: grade?.period
                })
            })

            // B. Process Manual Grades (Excel columns)
            practicalGrades.forEach(grade => {
                // Skip if already linked to an assignment processed above
                const isLinked = Array.from(evaluationsMap.values()).some(e => e.id === grade.assignment_id || e.title === grade.category)
                if (isLinked) return

                const status = grade.value > 4 ? 'entregado' : 'no_presentado'

                evaluationsMap.set(grade.id, {
                    id: grade.id,
                    title: grade.category,
                    type: 'calificacion',
                    date: grade.created_at,
                    dueDate: null,
                    gradeValue: grade.value,
                    status,
                    period: grade.period
                })
            })

            const allEvaluations = Array.from(evaluationsMap.values())
                .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())

            const totalAssigned = allEvaluations.length
            const deliveredCount = allEvaluations.filter(e => e.status === 'entregado').length
            const deliveryRate = totalAssigned > 0 ? Math.round((deliveredCount / totalAssigned) * 100) : 0

            const computedData: StudentProfileData = {
                student: studentData,
                attendanceStats: {
                    total: totalAtt,
                    present: presents,
                    absent: absences,
                    late: lates,
                    justified: justified,
                    percentage: attendancePercentage,
                    recentAttendance: att.slice(0, 5),
                    attendanceNotes: [
                        ...att.filter(a => a.notes && a.notes.trim() !== ''),
                        ...performanceGrades.filter(g => {
                            if (!g.observations) return false
                            const dateMatch = g.observations.match(/^Clase \d{4}-\d{2}-\d{2}$/)
                            if (dateMatch) return false
                            return true
                        }).map(g => ({
                            id: g.id,
                            course_id: courseId,
                            student_id: studentId,
                            date: g.created_at ? g.created_at.split('T')[0] : '',
                            notes: g.observations!.replace(/^Clase \d{4}-\d{2}-\d{2} - /, ''),
                            status: 'presente' as const,
                            created_at: g.created_at
                        }))
                    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                },
                gradesStats: {
                    average: practicalAverage,
                    conceptAverage: conceptAverage,
                    recentGrades: practicalGrades.slice(0, 5)
                },
                assignmentStats: {
                    totalAssigned: totalAssigned,
                    delivered: deliveredCount,
                    deliveryRate: deliveryRate,
                    recentSubmissions: courseSubmissions.slice(0, 5)
                },
                recentEvaluations: allEvaluations,
                courseInfo: courseData,
                teacherInfo: teacherData
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
