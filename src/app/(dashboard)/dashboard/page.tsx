'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    Building2, BookOpen, Users, ClipboardList,
    Clock, ChevronRight, EyeOff, CheckCircle2, AlertTriangle, FileText,
    Sparkles, ArrowUpRight, GraduationCap, Calendar, Loader2
} from 'lucide-react'
import Link from 'next/link'
import { cn, formatTime } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

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
    const router = useRouter()
    const [stats, setStats] = useState<Stats>({ schools: 0, courses: 0, students: 0, pendingAssignments: 0 })
    const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([])
    const [pendingTPs, setPendingTPs] = useState<PendingTP[]>([])
    const [riskStudents, setRiskStudents] = useState<RiskStudent[]>([])
    const [loading, setLoading] = useState(true)
    const [dismissingId, setDismissingId] = useState<string | null>(null)
    const [greeting, setGreeting] = useState('Buenos días')
    const [todayStr, setTodayStr] = useState('')
    const [userName, setUserName] = useState('')
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
    const [todayAttendanceRate, setTodayAttendanceRate] = useState<number | null>(null)

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
        try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            setUserName(user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || '')
        }

        const today = new Date().getDay()

        const todayDateStr = (() => {
            const d = new Date()
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        })()

        // Fetch everything in parallel
        const [
            schoolsRes, coursesRes, studentsRes, assignmentsCountRes,
            schedulesRes, assignmentsRes, riskStudentsRes, attendanceTodayRes
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
                .select(`id, first_name, last_name, is_risk_handled, course_students!inner(course_id, courses(name)), attendance(status), grades(value)`),
            supabase
                .from('attendance')
                .select('status')
                .eq('date', todayDateStr)
        ])

        setStats({
            schools: schoolsRes.count || 0,
            courses: coursesRes.count || 0,
            students: studentsRes.count || 0,
            pendingAssignments: assignmentsCountRes.count || 0,
        })

        const todayAttRecs = attendanceTodayRes.data || []
        if (todayAttRecs.length > 0) {
            const present = todayAttRecs.filter((a: any) => ['presente', 'tardanza'].includes(a.status)).length
            setTodayAttendanceRate(Math.round((present / todayAttRecs.length) * 100))
        } else {
            setTodayAttendanceRate(null)
        }

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
        } catch (error) {
            console.error('Dashboard fetchData error:', error)
            toast.error('Error al cargar el dashboard', {
                description: 'No se pudieron cargar los datos. Verifícá tu conexión e intentá recargar la página.',
            })
        } finally {
            setLoading(false)
        }
    }

    const handleDismissRisk = async (studentId: string, studentName: string) => {
        try {
            setDismissingId(studentId)
            const supabase = createClient()
            const { error } = await supabase.from('students').update({ is_risk_handled: true }).eq('id', studentId)
            
            if (error) throw error

            setRiskStudents(prev => prev.filter(s => s.id !== studentId))
            
            toast.success(`${studentName} desestimado`, {
                description: 'El alumno ya no aparecerá en la lista de riesgo.',
                action: {
                    label: 'Deshacer',
                    onClick: async () => {
                        const { error: undoError } = await supabase.from('students').update({ is_risk_handled: false }).eq('id', studentId)
                        if (!undoError) {
                            fetchData() // Refresh to show the student again
                            toast.success('Acción deshecha')
                        }
                    }
                }
            })
        } catch (error) {
            console.error('Error dismissing risk:', error)
            toast.error('No se pudo desestimar el riesgo')
        } finally {
            setDismissingId(null)
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

    // Onboarding checklist steps
    const onboardingSteps = [
        {
            id: 'school',
            label: 'Creá tu primera escuela',
            description: 'Registrá el establecimiento donde enseñás.',
            done: stats.schools > 0,
            href: '/escuelas',
            cta: 'Ir a Mis Escuelas',
        },
        {
            id: 'course',
            label: 'Agregá un curso',
            description: 'Creá tu primer curso con su año, división y horario.',
            done: stats.courses > 0,
            href: '/escuelas',
            cta: 'Crear curso',
        },
        {
            id: 'students',
            label: 'Sumá tus alumnos',
            description: 'Matriculá alumnos en el curso para registrar asistencia y notas.',
            done: stats.students > 0,
            href: stats.courses > 0 ? getSmartHref('alumnos') : '/escuelas',
            cta: 'Agregar alumnos',
        },
    ]
    const completedSteps = onboardingSteps.filter(s => s.done).length
    const showOnboarding = !loading && stats.schools === 0

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
                                <p className="text-2xl font-black">
                                    {todayAttendanceRate !== null ? `${todayAttendanceRate}%` : '—'}
                                </p>
                                {todayAttendanceRate === null && (
                                    <p className="text-[9px] text-primary-400/60 font-bold">Sin registros</p>
                                )}
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                                <GraduationCap className="w-6 h-6 text-primary-400" />
                            </div>
                         </div>
                    </div>
                </div>
            </motion.div>

            {/* ONBOARDING CHECKLIST — visible only for new users */}
            {showOnboarding && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-surface rounded-[2rem] border border-amber-500/20 p-6 shadow-sm"
                >
                    <div className="flex items-start gap-4 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-base font-black text-text-primary">¡Bienvenido/a! Configurá tu espacio en 3 pasos</h2>
                            <p className="text-sm text-text-muted mt-0.5">
                                Completá estos pasos para empezar a usar todas las funciones del Organizador Docente.
                            </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <p className="text-2xl font-black text-amber-500">{completedSteps}<span className="text-sm text-text-muted font-normal">/3</span></p>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-surface-secondary rounded-full mb-5 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(completedSteps / 3) * 100}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className="h-full bg-amber-500 rounded-full"
                        />
                    </div>

                    <div className="space-y-3">
                        {onboardingSteps.map((step, i) => (
                            <div key={step.id} className={cn(
                                "flex items-center gap-4 p-4 rounded-xl border transition-all",
                                step.done
                                    ? "bg-emerald-500/5 border-emerald-500/20 opacity-60"
                                    : "bg-surface-secondary border-border hover:border-amber-500/30"
                            )}>
                                <div className={cn(
                                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black",
                                    step.done
                                        ? "bg-emerald-500 text-white"
                                        : "bg-surface border-2 border-border text-text-muted"
                                )}>
                                    {step.done ? (
                                        <CheckCircle2 className="w-4 h-4" />
                                    ) : (
                                        <span>{i + 1}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        "text-sm font-bold",
                                        step.done ? "text-emerald-600 dark:text-emerald-400 line-through" : "text-text-primary"
                                    )}>
                                        {step.label}
                                    </p>
                                    {!step.done && (
                                        <p className="text-xs text-text-muted mt-0.5">{step.description}</p>
                                    )}
                                </div>
                                {!step.done && (
                                    <Link
                                        href={step.href}
                                        className="flex-shrink-0 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                                    >
                                        {step.cta} <ChevronRight className="w-3 h-3" />
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* QUICK ACTIONS GRID - The "Command Center" */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                        if (nextClass) {
                            router.push(`/cursos/${nextClass.id}/clase`)
                        } else {
                            toast.info('No hay clases programadas hoy', {
                                description: 'Configurá tus horarios en Mis Escuelas para ver tus clases aquí.',
                                action: { label: 'Ir a Escuelas', onClick: () => router.push('/escuelas') }
                            })
                        }
                    }}
                    className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-2xl text-white shadow-lg group transition-all",
                        nextClass
                            ? "bg-[#10b981] shadow-emerald-500/20"
                            : "bg-slate-600 shadow-slate-500/20 opacity-70"
                    )}
                >
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Clock className="w-6 h-6" />
                    </div>
                    <span className="font-black text-sm uppercase tracking-tight">
                        {nextClass ? 'Clase de Hoy' : 'Sin Clases'}
                    </span>
                    {!nextClass && (
                        <span className="text-[10px] opacity-70 mt-0.5">Configurar →</span>
                    )}
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                        const href = getSmartHref('calificaciones')
                        if (!selectedCourseId) {
                            toast.info('Seleccioná un curso primero', {
                                description: 'Para cargar notas tenés que acceder desde un curso específico.',
                                action: { label: 'Ir a Escuelas', onClick: () => router.push('/escuelas') }
                            })
                        } else {
                            router.push(href)
                        }
                    }}
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
                    onClick={() => toast.info('¡Próximamente!', { description: 'El módulo de IA está en desarrollo. ¡Pronto podrás usarlo!' })}
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
                    onClick={() => router.push('/agenda')}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-surface border border-border hover:border-violet-500/50 group transition-all"
                >
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-2 group-hover:bg-violet-500/20 transition-colors">
                        <Calendar className="w-6 h-6 text-violet-500" />
                    </div>
                    <span className="font-bold text-sm text-text-primary uppercase tracking-tight">Planificar</span>
                </motion.button>
            </div>

            {!showOnboarding && (
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
                                                    href={`/cursos/${cls.id}/clase`}
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
                                                onClick={() => handleDismissRisk(student.id, `${student.first_name} ${student.last_name}`)}
                                                disabled={dismissingId === student.id}
                                                className="p-1.5 text-text-muted hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50"
                                            >
                                                {dismissingId === student.id ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <EyeOff className="w-3.5 h-3.5" />
                                                )}
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
                             <button 
                                onClick={() => {
                                    if (!selectedCourseId) {
                                        toast.info('Seleccioná un curso primero', {
                                            description: 'Para ver trabajos pendientes tenés que acceder desde un curso específico.',
                                            action: { label: 'Ir a Escuelas', onClick: () => router.push('/escuelas') }
                                        })
                                    } else {
                                        router.push(`/cursos/${selectedCourseId}/trabajos`)
                                    }
                                }}
                                className="w-full mt-2 py-2 rounded-xl border-2 border-dashed border-border text-[10px] font-black text-text-muted hover:border-primary-300 hover:text-primary-600 transition-all uppercase tracking-widest"
                            >
                                Corregir Hoy
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
            )}
        </div>
    )
}

