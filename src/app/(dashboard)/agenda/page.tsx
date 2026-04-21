'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
    Clock, Building2, Calendar, ChevronLeft, ChevronRight,
    MapPin, BookOpen, GraduationCap, Sparkles
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
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-text-primary flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-600/20">
                            <Calendar className="w-6 h-6 text-white" />
                        </div>
                        {view === 'weekly' ? 'Mi Agenda Semanal' : `Agenda de ${DAYS.find(d => d.id === selectedDay)?.label}`}
                    </h1>
                    <p className="text-text-secondary font-medium tracking-tight">
                        {view === 'weekly' 
                            ? 'Gestiona todos tus horarios y clases en un solo lugar.'
                            : `Visualiza tus clases programadas para el ${DAYS.find(d => d.id === selectedDay)?.label.toLowerCase()}.`
                        }
                    </p>
                </div>

                <div className="flex items-center gap-3 p-1.5 bg-surface border border-border rounded-2xl shadow-sm">
                    <button 
                        onClick={() => setView('weekly')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all",
                            view === 'weekly' 
                                ? "bg-primary-50 text-primary-600 shadow-sm" 
                                : "text-text-muted hover:text-text-primary hover:bg-slate-50"
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
                            "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all",
                            view === 'daily' && selectedDay === todayId
                                ? "bg-primary-50 text-primary-600 shadow-sm" 
                                : "text-text-muted hover:text-text-primary hover:bg-slate-50"
                        )}
                    >
                        Hoy
                    </button>
                </div>
            </div>

            {/* Content View */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-[400px] bg-surface rounded-[2.5rem] border border-border animate-pulse" />
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
                                transition={{ delay: idx * 0.1 }}
                                key={day.id}
                                className={cn(
                                    "flex flex-col rounded-[2.5rem] border transition-all h-full min-h-[400px]",
                                    isToday 
                                        ? "bg-primary-50/30 border-primary-200 shadow-xl shadow-primary-500/5 rotate-0" 
                                        : "bg-surface border-border hover:border-primary-200 hover:shadow-lg"
                                )}
                            >
                                <div className={cn(
                                    "p-6 border-b flex items-center justify-between cursor-pointer group",
                                    isToday ? "border-primary-200/50" : "border-border"
                                )}
                                onClick={() => {
                                    setSelectedDay(day.id)
                                    setView('daily')
                                }}>
                                    <h2 className={cn(
                                        "text-xl font-black group-hover:text-primary-600 transition-colors",
                                        isToday ? "text-primary-600" : "text-text-primary"
                                    )}>
                                        {day.label}
                                    </h2>
                                    {isToday ? (
                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-100 text-primary-600 text-[10px] font-black uppercase tracking-wider">
                                            Hoy
                                        </span>
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                    )}
                                </div>

                                <div className="flex-1 p-4 space-y-4">
                                    {dayClasses.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center py-12 text-center opacity-30">
                                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                                                <div className="w-6 h-6 border-2 border-slate-300 rounded-md" />
                                            </div>
                                            <p className="text-xs font-bold text-text-muted">Sin clases</p>
                                        </div>
                                    ) : (
                                        dayClasses.map((cls) => (
                                            <div
                                                key={cls.id}
                                                className="group relative flex flex-col gap-3 p-4 rounded-3xl bg-white dark:bg-surface border border-border/50 hover:border-primary-200 hover:shadow-md transition-all cursor-default"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-8 rounded-full bg-primary-500" style={{ backgroundColor: cls.courses?.color || '#6366f1' }} />
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">
                                                                {formatTime(cls.start_time)}
                                                            </span>
                                                            <span className="text-sm font-black text-text-primary leading-tight line-clamp-1">
                                                                {cls.courses?.name}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-secondary">
                                                        <Building2 className="w-3 h-3 opacity-50" />
                                                        <span className="truncate">{cls.courses?.schools?.name}</span>
                                                    </div>
                                                    {cls.classroom && (
                                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-muted">
                                                            <MapPin className="w-3 h-3 opacity-50" />
                                                            <span>Aula {cls.classroom}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            ) : (
                /* Daily View */
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="max-w-4xl mx-auto w-full"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            {DAYS.map(d => (
                                <button
                                    key={d.id}
                                    onClick={() => setSelectedDay(d.id)}
                                    className={cn(
                                        "flex flex-col items-center gap-1 px-4 py-3 rounded-2xl transition-all",
                                        selectedDay === d.id
                                            ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20"
                                            : "hover:bg-primary-50 text-text-muted"
                                    )}
                                >
                                    <span className="text-[10px] uppercase font-black tracking-widest">{d.label.slice(0, 3)}</span>
                                    <span className="text-lg font-black leading-none">{d.id}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        {getDaySchedules(selectedDay).length === 0 ? (
                            <div className="text-center py-20 bg-surface rounded-[3rem] border border-border">
                                <Clock className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-20" />
                                <h3 className="text-xl font-bold text-text-primary">No hay clases programadas</h3>
                                <p className="text-text-muted">Disfruta de tu tiempo libre o planifica tus próximas lecciones.</p>
                            </div>
                        ) : (
                            getDaySchedules(selectedDay).map((cls, idx) => (
                                <motion.div
                                    key={cls.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="flex items-center gap-6 p-6 bg-surface border border-border rounded-[2.5rem] hover:border-primary-200 transition-all group"
                                >
                                    <div className="text-center min-w-[100px]">
                                        <div className="text-2xl font-black text-text-primary uppercase">{formatTime(cls.start_time)}</div>
                                        <div className="text-xs font-bold text-text-muted">hasta {formatTime(cls.end_time)}</div>
                                    </div>

                                    <div className="w-px h-12 bg-border" />

                                    <div className="flex-1 flex items-center justify-between">
                                        <div className="flex items-center gap-5">
                                            <div className="w-4 h-16 rounded-full" style={{ backgroundColor: cls.courses?.color }} />
                                            <div>
                                                <h3 className="text-2xl font-black text-text-primary">{cls.courses?.name}</h3>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <div className="flex items-center gap-1.5 text-sm font-bold text-text-secondary">
                                                        <Building2 className="w-4 h-4 opacity-40" />
                                                        {cls.courses?.schools?.name}
                                                    </div>
                                                    {cls.classroom && (
                                                        <div className="flex items-center gap-1.5 text-sm font-bold text-text-muted">
                                                            <MapPin className="w-4 h-4 opacity-40" />
                                                            Aula {cls.classroom}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <Link 
                                            href={`/asistencia?courseId=${(cls.courses as any).id}`}
                                            className="px-6 py-3 rounded-2xl bg-white dark:bg-surface border border-border text-sm font-black hover:bg-primary-50 hover:text-primary-600 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            Tomar Asistencia
                                        </Link>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </motion.div>
            )}
            {/* Empty State / Tips */}
            {!loading && schedules.length === 0 && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-20 bg-surface rounded-[3rem] border border-border border-dashed"
                >
                    <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Calendar className="w-10 h-10 text-primary-400" />
                    </div>
                    <h3 className="text-2xl font-black text-text-primary">Todavía no tienes horarios</h3>
                    <p className="text-text-secondary mt-2 max-w-md mx-auto">
                        Ve a la sección de Escuelas, crea una escuela y luego añade cursos con sus horarios correspondientes para verlos aquí.
                    </p>
                    <Link 
                        href="/escuelas"
                        className="inline-flex items-center gap-2 mt-8 px-8 py-4 rounded-2xl bg-primary-600 text-white font-black hover:bg-primary-700 transition-all shadow-xl shadow-primary-600/20"
                    >
                        Comenzar ahora
                    </Link>
                </motion.div>
            )}
        </div>
    )
}
