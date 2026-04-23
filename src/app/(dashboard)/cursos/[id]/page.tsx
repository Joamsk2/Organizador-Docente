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
        <div className="space-y-12 pt-8 pb-12">
            {/* Header / Metrics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Metrics Layer */}
                <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-surface-secondary/40 rounded-[2.5rem] p-10 border border-white/5 shadow-2xl backdrop-blur-xl group hover:bg-surface-secondary/60 transition-all duration-500">
                        <div className="flex items-center justify-between mb-8">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Comunidad Educativa</span>
                                <h3 className="text-xl font-black text-text-primary">Alumnos Regulares</h3>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-primary-600/10 flex items-center justify-center text-primary-500 group-hover:scale-110 transition-transform duration-500">
                                <Users className="w-7 h-7" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-3">
                            <span className="text-6xl font-black text-text-primary tracking-tighter">{studentsCount || 0}</span>
                            <span className="text-sm font-bold text-text-muted">Inscriptos</span>
                        </div>
                        <div className="mt-8 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 w-full opacity-50" />
                        </div>
                    </div>

                    <div className="bg-surface-secondary/40 rounded-[2.5rem] p-10 border border-white/5 shadow-2xl backdrop-blur-xl group hover:bg-surface-secondary/60 transition-all duration-500">
                        <div className="flex items-center justify-between mb-8">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Progreso del Ciclo</span>
                                <h3 className="text-xl font-black text-text-primary">Clases Dictadas</h3>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform duration-500">
                                <Clock className="w-7 h-7" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-3">
                            <span className="text-6xl font-black text-text-primary tracking-tighter">
                                {attendanceCount ? Math.floor(attendanceCount / (studentsCount || 1)) : 0}
                            </span>
                            <span className="text-sm font-bold text-text-muted">Encuentros</span>
                        </div>
                        <div className="mt-8 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-[65%] opacity-50" />
                        </div>
                    </div>
                </div>

                {/* Quick Info / Risk Layer */}
                <div className="lg:col-span-4 space-y-6">
                    <StudentsAtRisk students={atRiskStudents} onDismissRisk={handleDismissRisk} />
                </div>
            </div>

            {/* Content Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Chart Section - Professional View */}
                {chartData.length > 0 && (
                    <div className="lg:col-span-8">
                        <div className="bg-surface-secondary/20 rounded-[3rem] p-1 border border-white/5 shadow-inner">
                            <MetricsChart
                                data={chartData}
                                title="Análisis de Asistencia"
                                dataKey="Asistencias"
                                color="rgba(99, 102, 241, 0.8)"
                            />
                        </div>
                    </div>
                )}

                {/* Side Content */}
                <div className="lg:col-span-4">
                    <UpcomingAssignments assignments={assignments || []} />
                </div>
            </div>
        </div>
    )
}

