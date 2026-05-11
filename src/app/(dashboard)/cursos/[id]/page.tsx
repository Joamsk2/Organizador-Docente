import { createClient } from '@/lib/supabase/server'
import { UpcomingAssignments } from '@/components/course-summary/upcoming-assignments'
import { StudentsAtRisk } from '@/components/course-summary/students-at-risk'
import { MetricsChart } from '@/components/course-summary/metrics-chart'
import { KpiCards } from '@/components/course-summary/kpi-cards'
import { AttendanceTrendChart } from '@/components/course-summary/attendance-trend-chart'
import { GradeDistributionChart } from '@/components/course-summary/grade-distribution-chart'
import { RecentActivity } from '@/components/course-summary/recent-activity'
import { CurriculumProgress } from '@/components/course-summary/curriculum-progress'
import type {
    AtRiskStudent, KpiData, WeeklyAttendance, GradeDistribution,
    PeriodAverage, RecentActivity as RecentActivityItem, ModuleProgress
} from '@/types/course-dashboard'
import { getISOWeek, startOfWeek, subWeeks, parseISO } from 'date-fns'

export default async function CourseDashboardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: courseId } = await params
    const supabase = await createClient()

    // --- 1. Fetch all data in parallel ---
    const [
        studentsRes,
        attendanceRes,
        gradesRes,
        assignmentsRes,
        sessionsRes,
        curriculumRes
    ] = await Promise.all([
        supabase
            .from('course_students')
            .select('students (id, first_name, last_name, is_risk_handled)')
            .eq('course_id', courseId)
            .eq('status', 'activo'),
        supabase
            .from('attendance')
            .select('*')
            .eq('course_id', courseId),
        supabase
            .from('grades')
            .select('*')
            .eq('course_id', courseId),
        supabase
            .from('assignments')
            .select('id, title, type, due_date, status, created_at')
            .eq('course_id', courseId)
            .in('status', ['asignado', 'entregado'])
            .order('due_date', { ascending: true }),
        supabase
            .from('class_sessions')
            .select(`
                id, date, topic, created_at,
                class_session_topics (topic_id)
            `)
            .eq('course_id', courseId)
            .order('date', { ascending: false }),
        supabase
            .from('curriculum_modules')
            .select('id, title, curriculum_topics (id, title, status)')
            .eq('course_id', courseId)
            .order('order_index', { ascending: true })
    ])

    const rawStudents = (studentsRes.data || [])
        .map((se: any) => se.students)
        .filter(Boolean) as { id: string; first_name: string; last_name: string; is_risk_handled: boolean | null }[]

    const attendance = attendanceRes.data || []
    const grades = gradesRes.data || []
    const assignments = assignmentsRes.data || []
    const sessions = sessionsRes.data || []
    const sessionsError = sessionsRes.error
    const curriculumModules = curriculumRes.data || []

    // DEBUG: Log counts to help diagnose issues
    console.log(`Course Dashboard Debug [${courseId}]:`, {
        sessionsCount: sessions.length,
        gradesCount: grades.length,
        assignmentsCount: assignments.length
    })

    // --- 2. Compute KPIs ---
    const totalStudents = rawStudents.length

    // Attendance rate (all records, present + tardanza count as attended)
    const totalAttendanceRecords = attendance.length
    const attendedCount = attendance.filter(a => ['presente', 'tardanza'].includes(a.status)).length
    const courseAttendanceRate = totalAttendanceRecords > 0
        ? Math.round((attendedCount / totalAttendanceRecords) * 100)
        : 100

    // Course average grade (include qualitative mapping if desired, but here we use all values)
    const courseAverageGrade = grades.length > 0
        ? Number((grades.reduce((acc, g) => acc + g.value, 0) / grades.length).toFixed(1))
        : 0

    // Pending assignments (status = 'asignado')
    const pendingAssignments = assignments.filter(a => a.status === 'asignado').length

    // Classes this month (robust comparison)
    const now = new Date()
    const currentMonthStr = (now.getMonth() + 1).toString().padStart(2, '0')
    const currentYearStr = now.getFullYear().toString()
    const monthPrefix = `${currentYearStr}-${currentMonthStr}`
    
    const classesThisMonth = sessions.filter(s => s.date && s.date.includes(monthPrefix)).length

    // Curriculum coverage
    let totalTopics = 0
    let completedTopics = 0
    curriculumModules.forEach((mod: any) => {
        const topics = (mod.curriculum_topics || []) as { status: string | null }[]
        totalTopics += topics.length
        completedTopics += topics.filter(t => t.status === 'completed').length
    })
    const curriculumCoverage = totalTopics > 0
        ? Math.round((completedTopics / totalTopics) * 100)
        : 0

    const kpis: KpiData = {
        totalStudents,
        courseAttendanceRate,
        courseAverageGrade,
        pendingAssignments,
        classesThisMonth,
        curriculumCoverage
    }

    // --- 3. Compute Students at Risk ---
    const MIN_GRADE = 7.0
    const MIN_ATTENDANCE = 65
    
    const atRiskStudents: AtRiskStudent[] = rawStudents
        .filter(s => !s.is_risk_handled)
        .map(student => {
            const studentGrades = grades.filter(g => g.student_id === student.id)
            const avgGrade = studentGrades.length > 0
                ? studentGrades.reduce((acc, curr) => acc + curr.value, 0) / studentGrades.length
                : 10

            const studentAttendance = attendance.filter(a => a.student_id === student.id)
            const presentCount = studentAttendance.filter(a => ['presente', 'tardanza'].includes(a.status)).length
            const attendanceScore = studentAttendance.length > 0
                ? (presentCount / studentAttendance.length) * 100
                : 100

            const reasons: ('attendance' | 'grades')[] = []
            
            // Solo marcar riesgo si hay datos suficientes
            if (studentGrades.length > 0 && avgGrade < MIN_GRADE) reasons.push('grades')
            if (studentAttendance.length >= 3 && attendanceScore < MIN_ATTENDANCE) reasons.push('attendance')

            return {
                id: student.id,
                name: `${student.last_name}, ${student.first_name}`,
                averageGrade: avgGrade,
                attendanceScore,
                reasons
            }
        })
        .filter(s => s.reasons.length > 0)
        .sort((a, b) => b.reasons.length - a.reasons.length || a.name.localeCompare(b.name))

    // --- 4. Weekly Attendance Trend (last 8 weeks) ---
    const weeklyAttendance: WeeklyAttendance[] = []
    const today = new Date()
    for (let i = 7; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 })
        const weekLabel = `S${getISOWeek(weekStart)}`
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)

        const weekRecords = attendance.filter(a => {
            const d = parseISO(a.date)
            return d >= weekStart && d <= weekEnd
        })

        const weekPresent = weekRecords.filter(a => ['presente', 'tardanza'].includes(a.status)).length
        const percentage = weekRecords.length > 0
            ? Math.round((weekPresent / weekRecords.length) * 100)
            : 0

        weeklyAttendance.push({ week: weekLabel, percentage })
    }

    // --- 5. Grade Distribution ---
    const ranges = [
        { min: 0, max: 4, label: '0-4' },
        { min: 4, max: 6, label: '4-6' },
        { min: 6, max: 7, label: '6-7' },
        { min: 7, max: 8, label: '7-8' },
        { min: 8, max: 9, label: '8-9' },
        { min: 9, max: 10.1, label: '9-10' },
    ]
    const gradeDistribution: GradeDistribution[] = ranges.map(r => ({
        range: r.label,
        count: grades.filter(g => g.value >= r.min && g.value < r.max).length
    }))

    // --- 6. Period Averages ---
    const gradesByPeriod = grades.reduce((acc, curr) => {
        if (!curr.period) return acc
        const periodName = curr.period.replace(/_/g, ' ')
        if (!acc[periodName]) acc[periodName] = { total: 0, count: 0 }
        acc[periodName].total += curr.value
        acc[periodName].count += 1
        return acc
    }, {} as Record<string, { total: number; count: number }>)

    const periodAverages: PeriodAverage[] = Object.keys(gradesByPeriod).map(period => ({
        name: period,
        promedio: Number((gradesByPeriod[period].total / gradesByPeriod[period].count).toFixed(1))
    }))

    // --- 7. Recent Activity ---
    const recentActivity: RecentActivityItem[] = []

    // Add sessions
    sessions.slice(0, 5).forEach(s => {
        recentActivity.push({
            id: `session-${s.id}`,
            type: 'class',
            title: s.topic || 'Clase registrada',
            subtitle: 'Bitácora de clase',
            date: new Date(s.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
        })
    })

    // Add recent grades
    const recentGrades = [...grades]
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 5)

    recentGrades.forEach(g => {
        const student = rawStudents.find(s => s.id === g.student_id)
        recentActivity.push({
            id: `grade-${g.id}`,
            type: 'grade',
            title: `${student ? `${student.last_name}, ${student.first_name}` : 'Alumno'} — ${g.category}`,
            subtitle: `Nota: ${g.value}`,
            date: g.created_at
                ? new Date(g.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
                : ''
        })
    })

    // Add assignments
    assignments.slice(0, 3).forEach(a => {
        if (a.due_date) {
            recentActivity.push({
                id: `assignment-${a.id}`,
                type: 'assignment',
                title: a.title,
                subtitle: `Vence: ${new Date(a.due_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`,
                date: new Date(a.due_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
            })
        }
    })

    // Sort by recency (simplified: just keep creation order mixed, then sort by date string)
    recentActivity.sort((a, b) => {
        // Parse dates roughly
        const da = a.date ? new Date(2025, 0, parseInt(a.date.split('/')[0] || '1')) : new Date()
        const db = b.date ? new Date(2025, 0, parseInt(b.date.split('/')[0] || '1')) : new Date()
        return db.getTime() - da.getTime()
    })

    // --- 8. Curriculum Progress ---
    const curriculumProgress: ModuleProgress[] = curriculumModules.map((mod: any) => {
        const topics = (mod.curriculum_topics || []) as { id: string; status: string | null }[]
        const total = topics.length
        const completed = topics.filter((t: any) => t.status === 'completed').length
        return {
            id: mod.id,
            title: mod.title,
            totalTopics: total,
            completedTopics: completed,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        }
    })

    // --- 9. Submission counts for assignments ---
    const submissionCounts: Record<string, number> = {}
    // Fetch all submissions for this course's assignments
    const assignmentIds = assignments.map(a => a.id)
    if (assignmentIds.length > 0) {
        const { data: allSubs } = await supabase
            .from('assignment_submissions')
            .select('assignment_id')
            .in('assignment_id', assignmentIds)

        ;(allSubs || []).forEach((sub: any) => {
            submissionCounts[sub.assignment_id] = (submissionCounts[sub.assignment_id] || 0) + 1
        })
    }

    // Upcoming assignments (due_date >= today or no due_date, limit 5)
    const upcomingAssignments = assignments
        .filter(a => !a.due_date || new Date(a.due_date) >= new Date(new Date().setHours(0, 0, 0, 0)))
        .slice(0, 5)

    return (
        <div className="space-y-5 pt-4 pb-20 max-w-7xl mx-auto px-3 sm:px-4">
            {/* Header */}
            <div>
                <h2 className="text-xl sm:text-2xl font-bold text-text-primary">Dashboard del Aula</h2>
                <p className="text-sm text-text-secondary mt-1">Vistazo general del curso</p>
            </div>

            {/* KPI Cards */}
            <KpiCards data={kpis} />

            {/* Risk + Assignments */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="min-h-[280px]">
                    <StudentsAtRisk students={atRiskStudents} courseId={courseId} />
                </div>
                <div className="min-h-[280px]">
                    <UpcomingAssignments assignments={upcomingAssignments} submissionCounts={submissionCounts} />
                </div>
            </div>

            {/* Charts row 1: Attendance trend + Period averages */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AttendanceTrendChart data={weeklyAttendance} />
                {periodAverages.length > 0 ? (
                    <MetricsChart
                        data={periodAverages}
                        title="Promedio por Período"
                        dataKey="promedio"
                        color="#3b82f6"
                    />
                ) : (
                    <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                        <h3 className="text-base sm:text-lg font-bold text-text-primary mb-4">Promedio por Período</h3>
                        <div className="h-[200px] flex items-center justify-center text-text-secondary text-sm">
                            Sin calificaciones registradas
                        </div>
                    </div>
                )}
            </div>

            {/* Charts row 2: Grade distribution + Curriculum */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <GradeDistributionChart data={gradeDistribution} />
                <CurriculumProgress modules={curriculumProgress} />
            </div>

            {/* Recent Activity */}
            <RecentActivity items={recentActivity} />
        </div>
    )
}
