'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Building2, BookOpen, Users, ClipboardList,
    Clock, ChevronRight, EyeOff, CheckCircle2, AlertTriangle, FileText,
    Sparkles, ArrowUpRight, GraduationCap, Calendar
} from 'lucide-react'
import Link from 'next/link'
import { cn, formatTime } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface Stats {
    schools: number
    courses: number
    students: number
    pendingAssignments: number
}

interface UpcomingClass {
    id: string
    courseName: string
    schoolName: string
    startTime: string
    endTime: string
    classroom: string | null
    color: string
}

interface PendingTP {
    id: string
    title: string
    courseName: string
    courseId: string
    submissionCount: number
    totalStudents: number
}

interface RiskStudent {
    id: string
    first_name: string
    last_name: string
    courseId: string
    courseName: string
    absences: number
    gradesAvg: number
    reasons: string[]
}

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats>({ schools: 0, courses: 0, students: 0, pendingAssignments: 0 })
    const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([])
    const [pendingTPs, setPendingTPs] = useState<PendingTP[]>([])
    const [riskStudents, setRiskStudents] = useState<RiskStudent[]>([])
    const [loading, setLoading] = useState(true)
    const [greeting, setGreeting] = useState('Buenos días')
    const [todayStr, setTodayStr] = useState('')
    const [userName, setUserName] = useState('')
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const hour = new Date().getHours()
        if (hour < 12) setGreeting('Buenos días')
        else if (hour < 19) setGreeting('Buenas tardes')
        else setGreeting('Buenas noches')

        setTodayStr(new Intl.DateTimeFormat('es-AR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        }).format(new Date()))

        // Retrieve the last selected course to make links smart
        setSelectedCourseId(localStorage.getItem('selectedCourseId'))

        fetchData()
    }, [])

    const fetchData = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            setUserName(user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || '')
        }

        const today = new Date().getDay()

        // Fetch everything in parallel
        const [
            schoolsRes, coursesRes, studentsRes, assignmentsCountRes,
            schedulesRes, assignmentsRes, riskStudentsRes
        ] = await Promise.all([
            supabase.from('schools').select('id', { count: 'exact', head: true }),
            supabase.from('courses').select('id', { count: 'exact', head: true }),
            supabase.from('students').select('id', { count: 'exact', head: true }),
            supabase.from('assignments').select('id', { count: 'exact', head: true }).eq('status', 'asignado'),
            supabase
                .from('course_schedules')
                .select(`id, start_time, end_time, classroom, courses (name, color, schools (name))`)
                .eq('day_of_week', today)
                .order('start_time'),
            supabase
                .from('assignments')
                .select(`id, title, course_id, courses (name), assignment_submissions (id)`)
                .eq('status', 'asignado')
                .limit(5),
            supabase
                .from('students')
                .select(`id, first_name, last_name, is_risk_handled, course_students!inner(course_id, courses(name)), attendance(status), grades(value)`)
        ])

        setStats({
            schools: schoolsRes.count || 0,
            courses: coursesRes.count || 0,
            students: studentsRes.count || 0,
            pendingAssignments: assignmentsCountRes.count || 0,
        })

        if (schedulesRes.data) {
            setUpcomingClasses(schedulesRes.data.map((s: any) => ({
                id: s.id,
                courseName: s.courses?.name || '',
                schoolName: s.courses?.schools?.name || '',
                startTime: s.start_time,
                endTime: s.end_time,
                classroom: s.classroom,
                color: s.courses?.color || '#6366f1',
            })))
        }

        if (assignmentsRes.data) {
            setPendingTPs(assignmentsRes.data.map((a: any) => ({
                id: a.id,
                title: a.title,
                courseId: a.course_id,
                courseName: a.courses?.name || '',
                submissionCount: a.assignment_submissions?.length || 0,
                totalStudents: 0,
            })))
        }

        if (riskStudentsRes.data) {
            const risks: RiskStudent[] = []
            const unhandledStudents = riskStudentsRes.data.filter((s: any) => s.is_risk_handled !== true)

            unhandledStudents.forEach((s: any) => {
                const totalAttendance = s.attendance?.length || 0
                const absences = s.attendance?.filter((a: any) => a.status === 'ausente').length || 0
                const attendancePercentage = totalAttendance > 0 ? ((totalAttendance - absences) / totalAttendance) * 100 : 100

                const numericGrades = s.grades?.map((g: any) => parseFloat(g.value)).filter((g: any) => !isNaN(g)) || []
                const avgGrade = numericGrades.length > 0 ? numericGrades.reduce((a: number, b: number) => a + b, 0) / numericGrades.length : 10

                const reasons: string[] = []
                if (attendancePercentage < 70) reasons.push(`Asistencia baja (${Math.round(attendancePercentage)}%)`)
                if (avgGrade < 6) reasons.push(`Promedio bajo (${avgGrade.toFixed(1)})`)

                if (reasons.length > 0) {
                    risks.push({
                        id: s.id,
                        first_name: s.first_name,
                        last_name: s.last_name,
                        courseId: s.course_students?.[0]?.course_id,
                        courseName: s.course_students?.[0]?.courses?.name || 'Curso',
                        absences,
                        gradesAvg: avgGrade,
                        reasons
                    })
                }
            })
            setRiskStudents(risks.sort((a, b) => b.reasons.length - a.reasons.length).slice(0, 4))
        }

        setLoading(false)
    }

    const handleDismissRisk = async (studentId: string) => {
        try {
            const supabase = createClient()
            await supabase.from('students').update({ is_risk_handled: true }).eq('id', studentId)
            setRiskStudents(prev => prev.filter(s => s.id !== studentId))
        } catch (error) {
            console.error('Error dismissing risk:', error)
        }
    }

    const getSmartHref = (module: string) => {
        return selectedCourseId ? `/cursos/${selectedCourseId}/${module}` : '/escuelas'
    }

    const nextClass = upcomingClasses.find(c => {
        const now = new Date()
        const [hours, minutes] = c.startTime.split(':').map(Number)
        const classDate = new Date()
        classDate.setHours(hours, minutes, 0)
        return classDate > now
    }) || upcomingClasses[0]

    const statCards = [
        { label: 'Escuelas', value: stats.schools, icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', href: '/escuelas' },
        { label: 'Cursos', value: stats.courses, icon: BookOpen, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', href: '/escuelas' },
        { label: 'Alumnos', value: stats.students, icon: Users, color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/20', href: getSmartHref('alumnos') },
        { label: 'Pendientes', value: stats.pendingAssignments, icon: ClipboardList, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', href: getSmartHref('trabajos') },
    ]

    return (
        <div className="relative space-y-8 max-w-7xl mx-auto pb-12">
            {/* Background Decorative Element */}
            <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-primary-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
            <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-violet-500/5 blur-[100px] rounded-full pointer-events-none -z-10" />

            {/* Premium Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-sidebar via-sidebar to-primary-900 p-8 md:p-12 text-white shadow-2xl shadow-primary-900/20"
            >
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-4 max-w-2xl">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-primary-200 text-sm font-bold"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>Panel Inteligente</span>
                        </motion.div>

                        <div className="space-y-2">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                                ¡{greeting}{userName ? `, ${userName}` : ''}!
                            </h1>
                            <p className="text-primary-100/80 text-lg md:text-xl font-medium max-w-xl">
                                {nextClass
                                    ? `Hoy das clase en `
                                    : todayStr}
                                {nextClass && (
                                    <span className="text-white font-bold underline decoration-primary-400 decoration-4 underline-offset-4">
                                        {nextClass.courseName}
                                    </span>
                                )}
                                {stats.pendingAssignments > 0 && (
                                    <>
                                        {nextClass ? ' y tenés ' : ' Tenés '}
                                        <span className="text-primary-300 font-bold">{stats.pendingAssignments}</span> entregas por corregir.
                                    </>
                                )}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-4">
                            {nextClass && (
                                <Link
                                    href={`/cursos/${nextClass.id}`}
                                    className="flex items-center gap-2 rounded-2xl bg-white text-primary-900 font-black px-6 py-3.5 hover:bg-primary-50 transition-all shadow-xl shadow-white/10 group"
                                >
                                    Ir al curso actual
                                    <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </Link>
                            )}
                            <Link 
                                href="/agenda"
                                className="flex items-center gap-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3.5 font-bold hover:bg-white/20 transition-all text-white"
                            >
                                <Calendar className="w-5 h-5" />
                                Ver mi agenda
                            </Link>
                        </div>
                    </div>

                    <div className="hidden lg:block relative group">
                        <div className="absolute inset-0 bg-primary-500/20 blur-[60px] rounded-full group-hover:bg-primary-500/30 transition-all" />
                        <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 w-64 text-center space-y-4 shadow-inner">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-400 to-violet-400 p-0.5 mx-auto">
                                <div className="w-full h-full rounded-[0.9rem] bg-sidebar flex items-center justify-center">
                                    <GraduationCap className="w-8 h-8 text-white" />
                                </div>
                            </div>
                            <div>
                                <p className="text-primary-200 text-sm font-bold uppercase tracking-widest">Rendimiento</p>
                                <p className="text-4xl font-black mt-1">94%</p>
                            </div>
                            <div className="pt-4 border-t border-white/10">
                                <p className="text-xs text-primary-300 font-medium">Promedio de asistencia de hoy</p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Stats Section with Glass Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((card, idx) => {
                    const Icon = card.icon
                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * (idx + 3) }}
                            key={card.label}
                        >
                            <Link
                                href={card.href}
                                className="group relative block bg-surface rounded-[2rem] border border-border p-6 transition-all hover:shadow-2xl hover:shadow-primary-500/10 hover:-translate-y-2 overflow-hidden"
                            >
                                <div className={cn('absolute top-0 right-0 w-24 h-24 blur-[40px] rounded-full opacity-20 -mr-12 -mt-12 transition-all group-hover:opacity-40', card.bg)} />

                                <div className="flex items-center justify-between mb-6">
                                    <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg', card.bg, card.color)}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-text-muted group-hover:bg-primary-500 group-hover:border-primary-500 group-hover:text-white transition-all">
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-3xl lg:text-4xl font-black text-text-primary tracking-tight">
                                        {loading ? <span className="inline-block w-8 h-8 bg-surface-secondary rounded animate-pulse" /> : card.value}
                                    </p>
                                    <p className="text-sm font-bold text-text-secondary mt-1 uppercase tracking-wider">{card.label}</p>
                                </div>
                            </Link>
                        </motion.div>
                    )
                })}
            </div>

            <div className="grid lg:grid-cols-3 gap-8 items-start">
                {/* Main Agenda Section */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 }}
                    className="lg:col-span-2 bg-surface rounded-[2.5rem] border border-border shadow-sm p-8"
                >
                    <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black text-text-primary flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/30 flex items-center justify-center">
                                    <Clock className="w-6 h-6 text-primary-500" />
                                </div>
                                Mi Jornada Hoy
                            </h2>
                            <p className="text-text-secondary font-medium pl-13">Horarios de clase asignados</p>
                        </div>
                        <Link 
                            href="/agenda"
                            className="text-sm font-bold text-primary-600 hover:text-primary-700 underline underline-offset-4"
                        >
                            Ver calendario completo
                        </Link>
                    </div>

                    {loading ? (
                        <div className="space-y-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-24 bg-surface-secondary rounded-[2rem] animate-pulse" />
                            ))}
                        </div>
                    ) : upcomingClasses.length === 0 ? (
                        <div className="text-center py-16 px-8 rounded-[2rem] bg-surface-secondary/50 border-2 border-dashed border-border/80">
                            <div className="w-20 h-20 mx-auto mb-6 bg-white dark:bg-surface rounded-3xl flex items-center justify-center shadow-sm">
                                <Clock className="w-10 h-10 text-primary-300" />
                            </div>
                            <h3 className="font-black text-2xl text-text-primary">Día libre de clases</h3>
                            <p className="text-text-secondary mt-2 max-w-sm mx-auto font-medium">No tienes horarios registrados para el día de hoy. ¡Aprovechá para planificar!</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {upcomingClasses.map((cls, idx) => (
                                <Link
                                    href={`/cursos/${cls.id}`}
                                    key={cls.id}
                                    className="group relative flex items-center gap-6 p-6 rounded-[2rem] bg-surface-secondary/50 hover:bg-surface border border-transparent hover:border-border hover:shadow-xl transition-all"
                                >
                                    <div className="flex flex-col items-center justify-center min-w-[80px] space-y-1">
                                        <p className="font-black text-2xl text-text-primary tracking-tighter">
                                            {formatTime(cls.startTime)}
                                        </p>
                                        <div className="w-8 h-1 rounded-full bg-primary-200" style={{ backgroundColor: `${cls.color}40` }} />
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <p className="font-black text-xl text-text-primary group-hover:text-primary-600 transition-colors">{cls.courseName}</p>
                                        <div className="flex items-center gap-3 text-sm text-text-secondary font-medium">
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border">
                                                <Building2 className="w-3.5 h-3.5 opacity-70" /> {cls.schoolName}
                                            </span>
                                            {cls.classroom && (
                                                <span className="opacity-50 text-xs">Aula {cls.classroom}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-surface border border-border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-xs font-bold text-text-primary">Asistencia</span>
                                        <ChevronRight className="w-4 h-4 text-primary-500" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Right Sidebar Widget */}
                <div className="space-y-8">
                    {/* Alumnos en Riesgo Widget */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 }}
                        className="bg-rose-50/50 dark:bg-rose-950/5 rounded-[2.5rem] border border-rose-100 dark:border-rose-900/20 p-8 shadow-sm"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-black text-xl text-rose-800 dark:text-rose-400 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                Alertas IA
                            </h3>
                            <button className="w-8 h-8 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/30 flex items-center justify-center transition-colors">
                                <ChevronRight className="w-4 h-4 text-rose-400" />
                            </button>
                        </div>

                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2].map((i) => <div key={i} className="h-20 bg-rose-100/30 rounded-2xl animate-pulse" />)}
                            </div>
                        ) : riskStudents.length === 0 ? (
                            <div className="text-center py-10 space-y-3">
                                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                                </div>
                                <p className="text-sm font-bold text-rose-900/40 dark:text-rose-400/40">Sin alertas pendientes</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <AnimatePresence>
                                    {riskStudents.map((student) => (
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9, x: 20 }}
                                            key={student.id}
                                            className="bg-white dark:bg-surface p-4 rounded-2xl border border-rose-100 dark:border-rose-900/50 shadow-sm transition-all hover:shadow-md"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <Link href={`/cursos/${student.courseId}/alumnos/${student.id}`} className="min-w-0 flex-1 group">
                                                    <p className="font-black text-text-primary truncate group-hover:text-primary-600 transition-colors uppercase text-sm tracking-tight">{student.last_name}, {student.first_name}</p>
                                                    <p className="text-xs text-text-secondary font-bold truncate mt-0.5">{student.courseName}</p>
                                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                                        {student.reasons.map((r, i) => (
                                                            <span key={i} className="text-[10px] bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 px-2 py-1 rounded-lg font-black border border-rose-100/50 dark:border-transparent">
                                                                {r}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </Link>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleDismissRisk(student.id);
                                                    }}
                                                    className="p-2 text-text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all"
                                                >
                                                    <EyeOff className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </motion.div>

                    {/* Pending Reports / Global TPs */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 }}
                        className="bg-surface rounded-[2.5rem] border border-border p-8 shadow-sm"
                    >
                        <h3 className="font-black text-xl text-text-primary flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <FileText className="w-6 h-6 text-amber-500" />
                            </div>
                            Para corregir
                        </h3>

                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2].map((i) => <div key={i} className="h-16 bg-surface-secondary rounded-2xl animate-pulse" />)}
                            </div>
                        ) : pendingTPs.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-sm font-bold text-text-secondary italic">Todo al día ✨</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendingTPs.map(tp => (
                                    <Link key={tp.id} href={`/cursos/${tp.courseId}/trabajos`} className="block group p-4 rounded-2xl bg-surface-secondary/50 hover:bg-primary-50 dark:hover:bg-primary-950/10 border border-transparent hover:border-primary-100 transition-all">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-text-primary truncate uppercase tracking-tighter">{tp.title}</p>
                                                <p className="text-xs text-text-secondary font-bold truncate mt-0.5">{tp.courseName}</p>
                                            </div>
                                            <div className="flex flex-col items-center justify-center min-w-[44px] h-11 rounded-xl bg-white dark:bg-surface border border-border shadow-sm group-hover:border-primary-200 group-hover:bg-primary-50 transition-all">
                                                <span className="text-sm font-black text-primary-600">{tp.submissionCount}</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                                <button className="w-full mt-2 py-3.5 rounded-2xl border-2 border-dashed border-border text-text-muted text-sm font-black hover:border-primary-300 hover:text-primary-600 transition-all">
                                    Corregir todo hoy
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
