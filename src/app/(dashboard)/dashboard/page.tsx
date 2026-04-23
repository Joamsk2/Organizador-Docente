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
                .select(`id, start_time, end_time, classroom, courses (id, name, color, schools (name))`)
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
                id: s.courses?.id || s.id,
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

    return (
        <div className="relative space-y-6 max-w-7xl mx-auto pb-12 px-4 md:px-0">
            {/* Background Decorative Element */}
            <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-primary-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

            {/* Efficiency Hero Section - Compact & Powerful */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0b1326] via-[#131b2e] to-primary-950 p-6 md:p-8 text-white shadow-2xl"
            >
                {/* Subtle Grid Overlay */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-primary-400 font-bold text-xs uppercase tracking-widest mb-1">
                            <Sparkles className="w-3 h-3" />
                            <span>Hoy es {todayStr}</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                            ¡{greeting}{userName ? `, ${userName}` : ''}!
                        </h1>
                        <p className="text-primary-100/70 text-base md:text-lg font-medium max-w-2xl">
                            {nextClass
                                ? `Tu próxima clase es `
                                : 'No tienes más clases hoy.'}
                            {nextClass && (
                                <span className="text-primary-400 font-bold">
                                    {nextClass.courseName}
                                </span>
                            )}
                            {stats.pendingAssignments > 0 && (
                                <span> • <span className="text-white font-bold">{stats.pendingAssignments}</span> entregas pendientes</span>
                            )}
                        </p>
                    </div>

                    <div className="flex shrink-0 gap-3">
                         <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-[10px] text-primary-300 font-bold uppercase tracking-tighter">Asistencia Hoy</p>
                                <p className="text-2xl font-black">94%</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                                <GraduationCap className="w-6 h-6 text-primary-400" />
                            </div>
                         </div>
                    </div>
                </div>
            </motion.div>

            {/* QUICK ACTIONS GRID - The "Command Center" */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { if(nextClass) window.location.href = `/cursos/${nextClass.id}/asistencia` }}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#10b981] text-white shadow-lg shadow-emerald-500/20 group transition-all"
                >
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6" />
                    </div>
                    <span className="font-black text-sm uppercase tracking-tight">Tomar Asistencia</span>
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => window.location.href = getSmartHref('trabajos')}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-surface border border-border hover:border-primary-500/50 group transition-all"
                >
                    <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center mb-2 group-hover:bg-primary-500/20 transition-colors">
                        <ClipboardList className="w-6 h-6 text-primary-500" />
                    </div>
                    <span className="font-bold text-sm text-text-primary uppercase tracking-tight">Cargar Notas</span>
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-surface border border-border hover:border-amber-500/50 group transition-all"
                >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-2 group-hover:bg-amber-500/20 transition-colors">
                        <Sparkles className="w-6 h-6 text-amber-500" />
                    </div>
                    <span className="font-bold text-sm text-text-primary uppercase tracking-tight">Módulo IA</span>
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => window.location.href = '/agenda'}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-surface border border-border hover:border-violet-500/50 group transition-all"
                >
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-2 group-hover:bg-violet-500/20 transition-colors">
                        <Calendar className="w-6 h-6 text-violet-500" />
                    </div>
                    <span className="font-bold text-sm text-text-primary uppercase tracking-tight">Planificar</span>
                </motion.button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 items-start">
                {/* Left Side: Timeline & Classes */}
                <div className="lg:col-span-2 space-y-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-surface rounded-[2rem] border border-border p-6"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black text-text-primary flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-primary-500" />
                                </div>
                                Cronograma de Hoy
                            </h2>
                            <Link href="/agenda" className="text-xs font-bold text-primary-600 uppercase tracking-widest hover:underline">Ver todo</Link>
                        </div>

                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-surface-secondary animate-pulse rounded-2xl" />)}
                            </div>
                        ) : upcomingClasses.length === 0 ? (
                            <div className="text-center py-12 bg-surface-secondary/30 rounded-2xl border-2 border-dashed border-border/50">
                                <p className="text-text-muted font-bold">No hay clases programadas para hoy.</p>
                            </div>
                        ) : (
                            <div className="relative pl-8 space-y-6">
                                {/* Vertical Timeline Line */}
                                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary-500/50 via-border to-transparent" />
                                
                                {upcomingClasses.map((cls, idx) => (
                                    <div key={idx} className="relative group">
                                        {/* Timeline Dot */}
                                        <div className={cn(
                                            "absolute -left-5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-surface transition-transform group-hover:scale-150",
                                            idx === 0 ? "bg-primary-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-border"
                                        )} />
                                        
                                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-secondary/40 border border-transparent hover:border-border hover:bg-surface hover:shadow-xl transition-all">
                                            <div className="min-w-[70px]">
                                                <p className="text-sm font-black text-text-primary">{formatTime(cls.startTime)}</p>
                                                <p className="text-[10px] text-text-muted font-bold uppercase">{formatTime(cls.endTime)}</p>
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-text-primary truncate">{cls.courseName}</p>
                                                <p className="text-xs text-text-secondary truncate">{cls.schoolName}</p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {cls.classroom && (
                                                    <span className="hidden md:inline-block px-2 py-1 rounded-md bg-surface border border-border text-[10px] font-bold text-text-muted">Aula {cls.classroom}</span>
                                                )}
                                                <Link 
                                                    href={`/cursos/${cls.id}/asistencia`}
                                                    className="w-8 h-8 rounded-lg bg-white dark:bg-surface border border-border flex items-center justify-center text-primary-500 hover:bg-primary-500 hover:text-white transition-all shadow-sm"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* Stats Summary - Compacted */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Escuelas', value: stats.schools, icon: Building2, color: 'text-blue-500' },
                            { label: 'Cursos', value: stats.courses, icon: BookOpen, color: 'text-emerald-500' },
                            { label: 'Alumnos', value: stats.students, icon: Users, color: 'text-violet-500' },
                            { label: 'TPs', value: stats.pendingAssignments, icon: FileText, color: 'text-amber-500' },
                        ].map((s, i) => (
                            <div key={i} className="bg-surface rounded-2xl border border-border p-4 flex items-center gap-3">
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-current/10", s.color)}>
                                    <s.icon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-lg font-black text-text-primary">{s.value}</p>
                                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-tighter">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Side: High-Priority Alerts */}
                <div className="space-y-6">
                    {/* RISK ALERT CARD */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-rose-50/50 dark:bg-rose-950/5 rounded-[2rem] border border-rose-100 dark:border-rose-900/20 p-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black text-rose-800 dark:text-rose-400 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                Alumnos en Riesgo
                            </h3>
                            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">{riskStudents.length}</span>
                        </div>

                        <div className="space-y-3">
                            {riskStudents.length === 0 ? (
                                <p className="text-xs text-rose-900/40 font-bold text-center py-4">Sin alertas críticas hoy.</p>
                            ) : (
                                riskStudents.map((student) => (
                                    <div key={student.id} className="bg-white dark:bg-surface p-3 rounded-xl border border-rose-100 dark:border-rose-900/30 shadow-sm">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-black text-text-primary text-xs truncate uppercase tracking-tight">{student.last_name}, {student.first_name}</p>
                                                <p className="text-[10px] text-text-secondary font-bold truncate">{student.courseName}</p>
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {student.reasons.map((r, i) => (
                                                        <span key={i} className="text-[9px] bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-md font-bold">
                                                            {r}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleDismissRisk(student.id)}
                                                className="p-1.5 text-text-muted hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                            >
                                                <EyeOff className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>

                    {/* CORRECTION ALERT CARD */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-surface rounded-[2rem] border border-border p-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black text-text-primary flex items-center gap-2">
                                <FileText className="w-5 h-5 text-amber-500" />
                                Por Corregir
                            </h3>
                            <Link href={getSmartHref('trabajos')} className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">Ver todos</Link>
                        </div>

                        <div className="space-y-3">
                            {pendingTPs.length === 0 ? (
                                <p className="text-xs text-text-muted italic text-center py-4">Todo corregido ✨</p>
                            ) : (
                                pendingTPs.map(tp => (
                                    <Link key={tp.id} href={`/cursos/${tp.courseId}/trabajos`} className="flex items-center justify-between p-3 rounded-xl bg-surface-secondary/50 hover:bg-primary-50 dark:hover:bg-primary-950/10 border border-transparent hover:border-primary-100 transition-all group">
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-text-primary truncate uppercase tracking-tighter">{tp.title}</p>
                                            <p className="text-[10px] text-text-secondary font-bold">{tp.courseName}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-surface border border-border flex items-center justify-center group-hover:border-primary-200 transition-colors">
                                            <span className="text-xs font-black text-primary-600">{tp.submissionCount}</span>
                                        </div>
                                    </Link>
                                ))
                            )}
                            <button className="w-full mt-2 py-2 rounded-xl border-2 border-dashed border-border text-[10px] font-black text-text-muted hover:border-primary-300 hover:text-primary-600 transition-all uppercase tracking-widest">
                                Corregir Hoy
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}

