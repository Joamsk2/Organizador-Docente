'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
    Clock, Building2, Calendar, ChevronLeft, ChevronRight,
    MapPin, BookOpen, GraduationCap, Sparkles, ClipboardList
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn, formatTime } from '@/lib/utils'
import Link from 'next/link'

interface ScheduleItem {
    id: string
    day_of_week: number
    start_time: string
    end_time: string
    classroom: string | null
    courses: {
        name: string
        color: string
        schools: {
            name: string
        }
    }
}

const DAYS = [
    { id: 1, label: 'Lunes' },
    { id: 2, label: 'Martes' },
    { id: 3, label: 'Miércoles' },
    { id: 4, label: 'Jueves' },
    { id: 5, label: 'Viernes' },
    { id: 6, label: 'Sábado' },
]

export default function AgendaPage() {
    const [schedules, setSchedules] = useState<ScheduleItem[]>([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState<'weekly' | 'daily'>('weekly')
    const [selectedDay, setSelectedDay] = useState<number>(() => {
        const d = new Date().getDay()
        return d === 0 ? 1 : d // Default to Monday if Sunday
    })

    useEffect(() => {
        fetchSchedules()
    }, [])

    const fetchSchedules = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) return

        const { data, error } = await supabase
            .from('course_schedules')
            .select(`
                id, day_of_week, start_time, end_time, classroom,
                courses (
                    name, color,
                    schools (name)
                )
            `)
            .order('start_time')

        if (error) {
            console.error('Error fetching schedules:', error)
        } else {
            console.log('Fetched schedules:', data)
            setSchedules((data as any) || [])
        }
        setLoading(false)
    }

    const getDaySchedules = (day: number) => {
        return schedules.filter(s => s.day_of_week === day)
    }

    const todayId = new Date().getDay() === 0 ? 1 : new Date().getDay()

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12 px-4 md:px-0">
            {/* Header / Command Bar */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 text-primary-400 text-[10px] font-black uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" />
                        Planificación Inteligente
                    </div>
                    <h1 className="text-5xl font-black text-text-primary tracking-tight">
                        {view === 'weekly' ? 'Mi Agenda' : `Clases del ${DAYS.find(d => d.id === selectedDay)?.label}`}
                    </h1>
                </div>

                <div className="flex items-center gap-2 p-1 bg-surface-secondary/50 backdrop-blur-xl rounded-2xl border border-white/5 shadow-inner">
                    <button 
                        onClick={() => setView('weekly')}
                        className={cn(
                            "px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300",
                            view === 'weekly' 
                                ? "bg-primary-600 text-white shadow-lg shadow-primary-600/30" 
                                : "text-text-muted hover:text-text-primary hover:bg-white/5"
                        )}
                    >
                        Semanal
                    </button>
                    <button 
                        onClick={() => {
                            setView('daily')
                            setSelectedDay(todayId)
                        }}
                        className={cn(
                            "px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300",
                            view === 'daily' && selectedDay === todayId
                                ? "bg-primary-600 text-white shadow-lg shadow-primary-600/30" 
                                : "text-text-muted hover:text-text-primary hover:bg-white/5"
                        )}
                    >
                        Hoy
                    </button>
                </div>
            </div>

            {/* Content View */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-[500px] bg-surface-secondary/50 rounded-[2.5rem] border border-white/5 animate-pulse" />
                    ))}
                </div>
            ) : view === 'weekly' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 items-start">
                    {DAYS.filter(d => d.id <= 5 || getDaySchedules(d.id).length > 0).map((day, idx) => {
                        const dayClasses = getDaySchedules(day.id)
                        const isToday = todayId === day.id

                        return (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={day.id}
                                className={cn(
                                    "flex flex-col rounded-[2.5rem] transition-all min-h-[450px] relative overflow-hidden",
                                    isToday 
                                        ? "bg-primary-600/5 ring-2 ring-primary-500/20 shadow-2xl shadow-primary-500/10" 
                                        : "bg-surface-secondary/30 hover:bg-surface-secondary/50"
                                )}
                            >
                                <div className="p-8 pb-4 flex items-center justify-between">
                                    <h2 className={cn(
                                        "text-2xl font-black tracking-tight",
                                        isToday ? "text-primary-500" : "text-text-primary"
                                    )}>
                                        {day.label}
                                    </h2>
                                    {isToday && (
                                        <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                                    )}
                                </div>

                                <div className="flex-1 p-4 space-y-3">
                                    {dayClasses.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-20">
                                            <p className="text-xs font-black text-text-muted uppercase tracking-widest">Sin Clases</p>
                                        </div>
                                    ) : (
                                        dayClasses.map((cls) => (
                                            <div
                                                key={cls.id}
                                                className="group relative p-5 rounded-[2rem] bg-surface-secondary border border-white/5 hover:border-primary-500/30 transition-all cursor-pointer shadow-sm hover:shadow-xl hover:shadow-black/20"
                                                onClick={() => {
                                                    setSelectedDay(day.id)
                                                    setView('daily')
                                                }}
                                            >
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div 
                                                        className="w-1.5 h-6 rounded-full" 
                                                        style={{ backgroundColor: cls.courses?.color || '#6366f1' }} 
                                                    />
                                                    <span className="text-[11px] font-black text-primary-400 tracking-wider">
                                                        {formatTime(cls.start_time)}
                                                    </span>
                                                </div>
                                                <h3 className="text-sm font-black text-text-primary leading-tight group-hover:text-primary-400 transition-colors">
                                                    {cls.courses?.name}
                                                </h3>
                                                <p className="text-[11px] font-bold text-text-muted mt-1 truncate opacity-70">
                                                    {cls.courses?.schools?.name}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            ) : (
                /* Daily View - Professional Timeline */
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="max-w-5xl mx-auto w-full space-y-12"
                >
                    <div className="flex items-center justify-center gap-3 p-2 bg-surface-secondary/50 rounded-[2.5rem] w-fit mx-auto border border-white/5">
                        {DAYS.map(d => (
                            <button
                                key={d.id}
                                onClick={() => setSelectedDay(d.id)}
                                className={cn(
                                    "flex flex-col items-center justify-center w-14 h-20 rounded-2xl transition-all duration-300",
                                    selectedDay === d.id
                                        ? "bg-primary-600 text-white shadow-2xl shadow-primary-600/40 scale-105"
                                        : "hover:bg-white/5 text-text-muted"
                                )}
                            >
                                <span className="text-[9px] uppercase font-black tracking-widest opacity-60">{d.label.slice(0, 3)}</span>
                                <span className="text-xl font-black mt-1">{d.id}</span>
                            </button>
                        ))}
                    </div>

                    <div className="relative space-y-6 before:absolute before:left-[119px] before:top-0 before:bottom-0 before:w-px before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent hidden md:block">
                        {getDaySchedules(selectedDay).length === 0 ? (
                            <div className="text-center py-32 bg-surface-secondary/30 rounded-[3rem] border border-white/5">
                                <Clock className="w-16 h-16 text-text-muted mx-auto mb-6 opacity-10" />
                                <h3 className="text-2xl font-black text-text-primary">Día de Planificación</h3>
                                <p className="text-text-muted font-medium mt-2">No hay clases programadas para este día.</p>
                            </div>
                        ) : (
                            getDaySchedules(selectedDay).map((cls, idx) => (
                                <motion.div
                                    key={cls.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="flex items-start gap-12 group"
                                >
                                    <div className="w-[120px] pt-6 text-right">
                                        <div className="text-2xl font-black text-text-primary tracking-tighter">{formatTime(cls.start_time)}</div>
                                        <div className="text-[11px] font-black text-primary-500/60 uppercase tracking-widest mt-1">Inicio</div>
                                    </div>

                                    <div className="relative flex-1 p-8 bg-surface-secondary/50 hover:bg-surface-secondary rounded-[2.5rem] border border-white/5 hover:border-primary-500/30 transition-all shadow-sm hover:shadow-2xl hover:shadow-black/40">
                                        {/* Course Color Indicator */}
                                        <div 
                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-16 rounded-r-full" 
                                            style={{ backgroundColor: cls.courses?.color }} 
                                        />

                                        <div className="flex items-center justify-between gap-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="px-3 py-1 rounded-full bg-white/5 text-[10px] font-black text-text-muted uppercase tracking-wider">
                                                        {cls.courses?.schools?.name}
                                                    </span>
                                                    {cls.classroom && (
                                                        <span className="flex items-center gap-1.5 text-[10px] font-black text-primary-400 uppercase tracking-wider">
                                                            <MapPin className="w-3 h-3" />
                                                            Aula {cls.classroom}
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-3xl font-black text-text-primary tracking-tight group-hover:text-primary-400 transition-colors">
                                                    {cls.courses?.name}
                                                </h3>
                                                <div className="flex items-center gap-2 text-sm font-bold text-text-muted">
                                                    <Clock className="w-4 h-4 opacity-40" />
                                                    Finaliza a las {formatTime(cls.end_time)}
                                                </div>
                                            </div>

                                            <Link 
                                                href={`/asistencia?courseId=${(cls.courses as any).id}`}
                                                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-primary-600 text-white font-black hover:bg-primary-700 transition-all shadow-xl shadow-primary-600/30"
                                            >
                                                <ClipboardList className="w-5 h-5" />
                                                Tomar Asistencia
                                            </Link>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>

                    {/* Mobile Timeline View */}
                    <div className="md:hidden space-y-6">
                        {getDaySchedules(selectedDay).map((cls) => (
                            <div key={cls.id} className="p-6 bg-surface-secondary/50 rounded-[2.5rem] border border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-lg font-black text-primary-500">{formatTime(cls.start_time)}</span>
                                    <span className="text-xs font-bold text-text-muted">Aula {cls.classroom}</span>
                                </div>
                                <h3 className="text-xl font-black text-text-primary mb-1">{cls.courses?.name}</h3>
                                <p className="text-sm text-text-muted font-bold mb-6">{cls.courses?.schools?.name}</p>
                                <Link 
                                    href={`/asistencia?courseId=${(cls.courses as any).id}`}
                                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary-600 text-white font-black shadow-lg shadow-primary-600/20"
                                >
                                    Tomar Asistencia
                                </Link>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Empty State */}
            {!loading && schedules.length === 0 && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-32 bg-surface-secondary/20 rounded-[4rem] border border-white/5 border-dashed"
                >
                    <div className="w-24 h-24 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <Calendar className="w-10 h-10 text-primary-500" />
                    </div>
                    <h3 className="text-3xl font-black text-text-primary tracking-tight">Tu Agenda está vacía</h3>
                    <p className="text-text-secondary mt-3 max-w-md mx-auto font-medium">
                        Comienza configurando tus escuelas y cursos para ver tu cronograma de clases aquí.
                    </p>
                    <Link 
                        href="/escuelas"
                        className="inline-flex items-center gap-3 mt-10 px-10 py-5 rounded-2xl bg-primary-600 text-white font-black hover:bg-primary-700 transition-all shadow-2xl shadow-primary-600/40"
                    >
                        Configurar Escuelas
                        <ChevronRight className="w-5 h-5" />
                    </Link>
                </motion.div>
            )}
        </div>
    )
}
