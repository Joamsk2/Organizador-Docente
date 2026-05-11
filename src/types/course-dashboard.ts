import type { Database } from '@/lib/types/database'

type StudentRow = Database['public']['Tables']['students']['Row']
type AttendanceRow = Database['public']['Tables']['attendance']['Row']
type GradeRow = Database['public']['Tables']['grades']['Row']
type AssignmentRow = Database['public']['Tables']['assignments']['Row']
type ClassSessionRow = Database['public']['Tables']['class_sessions']['Row']
type CurriculumModuleRow = Database['public']['Tables']['curriculum_modules']['Row']
type CurriculumTopicRow = Database['public']['Tables']['curriculum_topics']['Row']

export interface AtRiskStudent {
    id: string
    name: string
    averageGrade: number
    attendanceScore: number
    reasons: ('attendance' | 'grades')[]
}

export interface KpiData {
    totalStudents: number
    courseAttendanceRate: number
    courseAverageGrade: number
    pendingAssignments: number
    classesThisMonth: number
    curriculumCoverage: number
}

export interface WeeklyAttendance {
    week: string
    percentage: number
}

export interface GradeDistribution {
    range: string
    count: number
}

export interface PeriodAverage {
    name: string
    promedio: number
}

export interface RecentActivity {
    id: string
    type: 'class' | 'grade' | 'assignment'
    title: string
    subtitle: string
    date: string
    icon?: string
}

export interface ModuleProgress {
    id: string
    title: string
    totalTopics: number
    completedTopics: number
    percentage: number
}

export interface CourseDashboardData {
    kpis: KpiData
    atRiskStudents: AtRiskStudent[]
    upcomingAssignments: AssignmentRow[]
    weeklyAttendance: WeeklyAttendance[]
    gradeDistribution: GradeDistribution[]
    periodAverages: PeriodAverage[]
    recentActivity: RecentActivity[]
    curriculumProgress: ModuleProgress[]
}
