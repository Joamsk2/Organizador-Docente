import { createClient } from '@/lib/supabase/server'
import { Users, Clock } from 'lucide-react'
import { UpcomingAssignments } from '@/components/course-summary/upcoming-assignments'
import { StudentsAtRisk, type AtRiskStudent } from '@/components/course-summary/students-at-risk'
import { MetricsChart } from '@/components/course-summary/metrics-chart'
import { revalidatePath } from 'next/cache'

export default async function CourseOverviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch all data in parallel
    const [
        { data: studentsEnrollments, count: studentsCount },
        { data: attendance, count: attendanceCount },
        { data: assignments },
        { data: grades }
    ] = await Promise.all([
        supabase
            .from('course_students')
            .select('students (*)', { count: 'exact' })
            .eq('course_id', id)
            .eq('status', 'activo'),
        supabase
            .from('attendance')
            .select('*', { count: 'exact' })
            .eq('course_id', id),
            supabase
                .from('assignments')
                .select('*')
                .eq('course_id', id)
                .gte('due_date', (() => {
                    const d = new Date()
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                })())
                .order('due_date', { ascending: true })
                .limit(5),
        supabase
            .from('grades')
            .select('*')
            .eq('course_id', id)
    ])

    const activeStudents = studentsEnrollments?.map(se => se.students).filter(Boolean) || []

    // Calculate Students at Risk
    const atRiskStudents: AtRiskStudent[] = []

    activeStudents.forEach((student: any) => {
        const studentAttendance = attendance?.filter(a => a.student_id === student.id) || []
        const totalClasses = studentAttendance.length
        const absences = studentAttendance.filter(a => a.status === 'ausente').length
        const attendanceScore = totalClasses > 0 ? ((totalClasses - absences) / totalClasses) * 100 : 100

        const studentGrades = grades?.filter(g => g.student_id === student.id) || []
        const numericGrades = studentGrades.map((g: any) => parseFloat(g.value)).filter((g: any) => !isNaN(g))
        const averageGrade = numericGrades.length > 0 ? numericGrades.reduce((a: number, b: number) => a + b, 0) / numericGrades.length : 10

        const reasons: ('attendance' | 'grades')[] = []
        if (attendanceScore < 70) reasons.push('attendance')
        if (averageGrade < 6 && numericGrades.length > 0) reasons.push('grades')

        if (reasons.length > 0 && !student.is_risk_handled) {
            atRiskStudents.push({
                id: student.id,
                name: `${student.last_name}, ${student.first_name}`,
                attendanceScore,
                averageGrade,
                reasons
            })
        }
    })

    // Sort risk by most severe (lowest attendance/grades)
    atRiskStudents.sort((a, b) => {
        if (a.reasons.length !== b.reasons.length) return b.reasons.length - a.reasons.length // those with both reasons first
        if (a.reasons.includes('attendance') && b.reasons.includes('attendance')) return a.attendanceScore - b.attendanceScore
        return a.averageGrade - b.averageGrade
    })

    const handleDismissRisk = async (studentId: string) => {
        'use server'
        const supabaseAction = await createClient()
        await supabaseAction.from('students').update({ is_risk_handled: true }).eq('id', studentId)
        revalidatePath(`/cursos/${id}`)
    }

    // Calculate Chart Data (e.g. Attendance trend over last 5 classes, grouped by date)
    const chartDataMap = new Map<string, { present: number, absent: number }>()
    if (attendance) {
        const sortedAttendance = [...attendance].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        sortedAttendance.forEach(a => {
            // Simplify date to dd/MM
            const dateObj = new Date(a.date)
            const dateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`

            if (!chartDataMap.has(dateStr)) {
                chartDataMap.set(dateStr, { present: 0, absent: 0 })
            }
            const current = chartDataMap.get(dateStr)!

            if (a.status === 'ausente') {
                current.absent += 1
            } else {
                // present, tardanza, justificado
                current.present += 1
            }
        })
    }

    // Take last 7 dates for the chart
    const chartData = Array.from(chartDataMap.entries())
        .slice(-7)
        .map(([name, data]) => ({
            name,
            Asistencias: data.present,
            // Inasistencias: data.absent // If we want stacked bars later
        }))

    return (
        <div className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric Cards - Taking up half the top row on large screens */}
                <div className="col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Alumnos Regulares</span>
                            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Users className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-4xl font-bold text-text-primary">{studentsCount || 0}</div>
                    </div>

                    <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Clases Dictadas</span>
                            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Clock className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-4xl font-bold text-text-primary">{attendanceCount ? Math.floor(attendanceCount / (studentsCount || 1)) : 0}</div>
                    </div>
                </div>

                {/* Sub-components */}
                <div className="col-span-1 lg:col-span-1">
                    <UpcomingAssignments assignments={assignments || []} />
                </div>

                <div className="col-span-1 lg:col-span-1">
                    <StudentsAtRisk students={atRiskStudents} onDismissRisk={handleDismissRisk} />
                </div>
            </div>

            {/* Chart Section */}
            {chartData.length > 0 && (
                <div className="grid grid-cols-1 gap-4">
                    <MetricsChart
                        data={chartData}
                        title="Tendencia de Asistencia (Últimas Clases)"
                        dataKey="Asistencias"
                        color="#3b82f6"
                    />
                </div>
            )}
        </div>
    )
}

