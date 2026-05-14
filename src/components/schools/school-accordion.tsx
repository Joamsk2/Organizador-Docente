'use client'
 
import { useState, useMemo } from 'react'
import { MapPin, Trash2, Edit2, ArrowRight, MoreVertical, Calendar, Clock as ClockIcon, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import type { Database } from '@/lib/types/database'
import { cn } from '@/lib/utils'
import { ConfirmModal } from '@/components/ui/confirm-modal'
 
type School = Database['public']['Tables']['schools']['Row']
type CourseWithSchedules = Database['public']['Tables']['courses']['Row'] & {
    course_schedules: Database['public']['Tables']['course_schedules']['Row'][]
}
 
interface SchoolAccordionProps {
    school: School
    courses: CourseWithSchedules[]
    onEditSchool: (school: School) => void
    onDeleteSchool: (id: string) => Promise<boolean>
    onAddCourse: (schoolId: string) => void
    onEditCourse: (course: CourseWithSchedules) => void
    onDeleteCourse: (id: string) => Promise<boolean>
}
 
type PendingDelete =
    | { type: 'school'; id: string; name: string; courseCount: number }
    | { type: 'course'; id: string; name: string }

export function SchoolAccordion({
    school,
    courses,
    onEditSchool,
    onDeleteSchool,
    onAddCourse,
    onEditCourse,
    onDeleteCourse
}: SchoolAccordionProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [showOptions, setShowOptions] = useState(false)

    // Helper to get initials
    const initials = useMemo(() => {
        return school.name
            .split(' ')
            .map(word => word[0])
            .join('')
            .slice(0, 3)
            .toUpperCase()
    }, [school.name])

    // Dynamic color system based on institution name
    const schoolStyle = useMemo(() => {
        const name = school.name.toUpperCase()
        if (name.includes('EPET') || name.includes('TECNICA')) return {
            base: 'from-orange-500/20 to-yellow-600/5',
            accent: 'text-orange-400',
            glow: 'shadow-orange-500/10',
            badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
            icon: 'bg-orange-500/20 text-orange-300'
        }
        if (name.includes('CPEM') || name.includes('SECUNDARIA')) return {
            base: 'from-violet-500/20 to-blue-600/5',
            accent: 'text-violet-400',
            glow: 'shadow-violet-500/10',
            badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
            icon: 'bg-violet-500/20 text-violet-300'
        }
        if (name.includes('IFD') || name.includes('SUPERIOR')) return {
            base: 'from-emerald-500/20 to-teal-600/5',
            accent: 'text-emerald-400',
            glow: 'shadow-emerald-500/10',
            badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            icon: 'bg-emerald-500/20 text-emerald-300'
        }
        return {
            base: 'from-blue-500/20 to-indigo-600/5',
            accent: 'text-blue-400',
            glow: 'shadow-blue-500/10',
            badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            icon: 'bg-blue-500/20 text-blue-300'
        }
    }, [school.name])

    // Next class logic
    const nextClassInfo = useMemo(() => {
        const now = new Date()
        const currentDayNum = now.getDay()
        const currentTime = now.getHours() * 60 + now.getMinutes()

        const allSchedules = courses.flatMap(c => 
            (c.course_schedules || []).map(s => ({
                ...s,
                courseName: c.name,
                courseColor: c.color
            }))
        )

        const todayClasses = allSchedules.filter(s => s.day_of_week === currentDayNum)
        const next = todayClasses
            .map(s => {
                const [h, m] = s.start_time.split(':').map(Number)
                return { ...s, totalMinutes: h * 60 + m }
            })
            .filter(s => s.totalMinutes > currentTime)
            .sort((a, b) => a.totalMinutes - b.totalMinutes)[0]

        return {
            next,
            todayCount: todayClasses.length,
            isToday: todayClasses.length > 0
        }
    }, [courses])

    const handleConfirmDelete = async () => {
        if (!pendingDelete) return
        setDeleting(true)
        if (pendingDelete.type === 'school') {
            await onDeleteSchool(pendingDelete.id)
        } else {
            await onDeleteCourse(pendingDelete.id)
        }
        setDeleting(false)
        setPendingDelete(null)
    }

    return (
        <>
        <motion.div 
            layout
            className={cn(
                "group relative flex flex-col rounded-2xl transition-all duration-300 overflow-hidden border border-white/5",
                "bg-surface-secondary/20 hover:bg-surface-secondary/30",
                "hover:border-white/20 hover:translate-y-[-2px] hover:shadow-2xl hover:shadow-primary-500/5",
                isExpanded && "bg-surface-secondary/40 ring-1 ring-white/10"
            )}
        >
            {/* Lateral Color Bar */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-[3px] opacity-70 group-hover:opacity-100 transition-opacity", schoolStyle.base)} />

            <div className="p-5 relative z-10">
                {/* Header: Title & Actions */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-sm shadow-inner border border-white/10", schoolStyle.icon)}>
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xl font-bold text-text-primary tracking-tight truncate leading-tight group-hover:text-white transition-colors">
                                {school.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-text-secondary uppercase tracking-[0.1em]">
                                <span className="opacity-80">{school.level}</span>
                                <span className="opacity-30">·</span>
                                <span className="opacity-80">Turno {school.shift}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="relative flex-shrink-0">
                        <button
                            onClick={() => setShowOptions(!showOptions)}
                            className="p-1.5 text-text-muted hover:text-white transition-colors opacity-40 hover:opacity-100"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        <AnimatePresence>
                            {showOptions && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                    className="absolute right-0 mt-1 w-44 bg-surface-primary border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                                >
                                    <button
                                        onClick={() => { onEditSchool(school); setShowOptions(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-text-secondary hover:bg-white/5 transition-colors"
                                    >
                                        <Edit2 className="w-3.5 h-3.5 text-primary-400" /> Editar Escuela
                                    </button>
                                    <button
                                        onClick={() => {
                                            setPendingDelete({
                                                type: 'school',
                                                id: school.id,
                                                name: school.name,
                                                courseCount: courses.length
                                            });
                                            setShowOptions(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Status & Next Class - REFINED CONTRAST */}
                <div className="flex items-center justify-between gap-4 py-4 mb-3">
                    <div className="flex flex-col min-w-0">
                        <span className="text-[9px] font-black text-primary-400/60 uppercase tracking-widest mb-1">Próxima</span>
                        {nextClassInfo.next ? (
                            <div className="flex items-center gap-2">
                                <span className={cn("text-base font-black tracking-tight", schoolStyle.accent)}>
                                    {nextClassInfo.next.start_time}
                                </span>
                                <span className="text-[11px] font-bold text-text-primary truncate">
                                    {nextClassInfo.next.courseName}
                                </span>
                            </div>
                        ) : (
                            <span className="text-[11px] font-bold text-text-secondary opacity-40 italic">Fin de jornada</span>
                        )}
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                        <div className="flex items-center gap-2 mb-1">
                            <div className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                nextClassInfo.isToday ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-white/10"
                            )} />
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-wider",
                                nextClassInfo.isToday ? "text-emerald-400" : "text-text-muted opacity-30"
                            )}>
                                {nextClassInfo.isToday ? 'Activa' : 'Inactiva'}
                            </span>
                        </div>
                        <span className="text-[10px] font-bold text-text-secondary opacity-60">
                            {nextClassInfo.todayCount} clases hoy
                        </span>
                    </div>
                </div>

                {/* Single Line Footer - ULTRA CLEAN */}
                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary opacity-60">
                        <Calendar className="w-3.5 h-3.5 opacity-40" />
                        <span>{courses.length} cursos</span>
                        <span className="opacity-30">·</span>
                        <button 
                            onClick={() => setIsExpanded(!isExpanded)}
                            className={cn("hover:underline transition-all", schoolStyle.accent)}
                        >
                            {isExpanded ? 'Ver menos' : 'Ver cursos →'}
                        </button>
                    </div>
                    {school.address && (
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-text-muted opacity-30 max-w-[100px] truncate">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{school.address}</span>
                        </div>
                    )}
                </div>
            </div>
 
            {/* Expanded Courses List */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-6 pb-8 relative z-10"
                    >
                        <div className="pt-6 border-t border-white/5 space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h4 className="text-xs font-black text-text-muted uppercase tracking-widest">
                                    Cursos de {school.name}
                                </h4>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAddCourse(school.id); }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-primary-600/10 text-primary-400 rounded-xl hover:bg-primary-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-tighter"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Nuevo
                                </button>
                            </div>
 
                            <div className="space-y-2">
                                {courses.length === 0 ? (
                                    <div className="text-center py-10 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                        <p className="text-xs font-bold text-text-muted opacity-50 uppercase tracking-wider italic">No hay cursos registrados</p>
                                    </div>
                                ) : (
                                    courses.map(course => (
                                        <motion.div 
                                            key={course.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="group/course relative flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all"
                                        >
                                            <div 
                                                className="w-1 h-8 rounded-full flex-shrink-0" 
                                                style={{ backgroundColor: course.color || '#6366f1' }} 
                                            />
                                            
                                            <Link href={`/cursos/${course.id}`} className="flex-1 min-w-0">
                                                <h5 className="text-sm font-black text-text-primary truncate">
                                                    {course.name}
                                                </h5>
                                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-60">
                                                    {course.year} • {course.division}
                                                </p>
                                            </Link>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEditCourse(course); }}
                                                    className="p-2 text-text-muted hover:text-primary-400 transition-colors"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        setPendingDelete({
                                                            type: 'course',
                                                            id: course.id,
                                                            name: `${course.name} ${course.year}${course.division ? ` ${course.division}` : ''}`
                                                        })
                                                    }}
                                                    className="p-2 text-text-muted hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                                <Link href={`/cursos/${course.id}`} className="p-2 text-primary-400 opacity-0 group-hover/course:opacity-100 transition-all translate-x-2 group-hover/course:translate-x-0">
                                                    <ArrowRight className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
 
        {/* Confirmation dialog */}
        {pendingDelete && (
            <ConfirmModal
                isOpen={!!pendingDelete}
                onClose={() => setPendingDelete(null)}
                onConfirm={handleConfirmDelete}
                loading={deleting}
                confirmText={pendingDelete.type === 'school' ? 'Eliminar Escuela' : 'Eliminar Curso'}
                title={pendingDelete.type === 'school'
                    ? `¿Eliminar "${pendingDelete.name}"?`
                    : `¿Eliminar el curso "${pendingDelete.name}"?`
                }
                description={pendingDelete.type === 'school'
                    ? `Esta acción eliminará permanentemente la escuela y todos sus datos asociados, incluyendo ${pendingDelete.courseCount} curso${pendingDelete.courseCount !== 1 ? 's' : ''}, sus alumnos, calificaciones y registros de asistencia. Esta acción no se puede deshacer.`
                    : `Esta acción eliminará permanentemente el curso con todos sus alumnos matriculados, calificaciones, registros de asistencia y planificaciones. Esta acción no se puede deshacer.`
                }
                variant="danger"
            />
        )}
        </>
    )
}
