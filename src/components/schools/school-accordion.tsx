'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, MapPin, Building2, BookOpen, Clock, Trash2, Plus, Edit2, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import type { Database } from '@/lib/types/database'
import { cn, formatTime, getDayName } from '@/lib/utils'

type School = Database['public']['Tables']['schools']['Row']
type CourseWithSchedules = Database['public']['Tables']['courses']['Row'] & {
    course_schedules: Database['public']['Tables']['course_schedules']['Row'][]
}

interface SchoolAccordionProps {
    school: School
    courses: CourseWithSchedules[]
    onEditSchool: (school: School) => void
    onDeleteSchool: (id: string) => void
    onAddCourse: (schoolId: string) => void
    onEditCourse: (course: CourseWithSchedules) => void
    onDeleteCourse: (id: string) => void
}

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

    return (
        <div className="bg-surface-secondary/30 rounded-[3rem] border border-white/5 overflow-hidden transition-all duration-500 hover:bg-surface-secondary/50 shadow-sm hover:shadow-2xl hover:shadow-black/20 group/school">
            <div
                className={cn(
                    "p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer transition-colors",
                    isExpanded ? "bg-surface-secondary/50" : ""
                )}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-6 flex-1">
                    <div className="w-16 h-16 bg-primary-600/10 rounded-[1.5rem] flex items-center justify-center flex-shrink-0 shadow-inner">
                        <Building2 className="w-8 h-8 text-primary-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-2xl font-black text-text-primary tracking-tight capitalize group-hover/school:text-primary-400 transition-colors">
                                {school.name}
                            </h3>
                            <span className="px-3 py-1 rounded-full bg-white/5 text-[10px] font-black text-text-muted uppercase tracking-widest border border-white/5">
                                {school.level}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-bold text-text-muted">
                            <span className="flex items-center gap-2">
                                <Clock className="w-4 h-4 opacity-40" />
                                Turno {school.shift}
                            </span>
                            {school.address && (
                                <span className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 opacity-40" /> 
                                    {school.address}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => onEditSchool(school)}
                            className="p-3 text-text-muted hover:text-primary-400 bg-white/5 rounded-2xl transition-all hover:scale-110"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => {
                                if (confirm('¿Estás seguro de que querés eliminar esta escuela y todos sus cursos?')) {
                                    onDeleteSchool(school.id)
                                }
                            }}
                            className="p-3 text-text-muted hover:text-red-400 bg-white/5 rounded-2xl transition-all hover:scale-110"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    <div className={cn(
                        "w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 transition-transform duration-500",
                        isExpanded ? "rotate-180 bg-primary-600/20 text-primary-400" : "text-text-muted"
                    )}>
                        <ChevronDown className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {isExpanded && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-8 pt-0 border-t border-white/5"
                >
                    <div className="flex items-center justify-between mb-8 mt-8">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-primary-500/10 flex items-center justify-center">
                                <BookOpen className="w-4 h-4 text-primary-500" />
                            </div>
                            <h4 className="text-lg font-black text-text-primary tracking-tight">Cursos y Divisiones</h4>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddCourse(school.id); }}
                            className="flex items-center gap-2 px-6 py-3 bg-primary-600/10 text-primary-400 hover:bg-primary-600/20 rounded-2xl font-black text-sm transition-all border border-primary-500/20"
                        >
                            <Plus className="w-4 h-4" /> 
                            Nuevo Curso
                        </button>
                    </div>

                    {courses.length === 0 ? (
                        <div className="text-center py-16 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                            <p className="text-text-muted font-bold">No hay cursos registrados en esta escuela.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {courses.map(course => (
                                <motion.div 
                                    key={course.id}
                                    whileHover={{ y: -4 }}
                                    className="relative"
                                >
                                    <Link 
                                        href={`/cursos/${course.id}`} 
                                        className="flex flex-col sm:flex-row gap-6 p-6 bg-surface-secondary/50 rounded-[2rem] border border-white/5 hover:border-primary-500/30 transition-all group/course cursor-pointer shadow-sm hover:shadow-xl hover:shadow-black/20"
                                    >
                                        <div 
                                            className="w-full sm:w-2 h-1.5 sm:h-auto rounded-full shadow-lg" 
                                            style={{ backgroundColor: course.color || '#6366f1' }} 
                                        />
                                        
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h5 className="text-xl font-black text-text-primary group-hover/course:text-primary-400 transition-colors">
                                                        {course.name}
                                                    </h5>
                                                    <p className="text-sm font-bold text-text-muted mt-1 uppercase tracking-widest opacity-60">
                                                        {course.year} • {course.division}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEditCourse(course); }}
                                                        className="p-2 text-text-muted hover:text-primary-400 hover:bg-white/5 rounded-xl transition-colors"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            if (confirm('¿Eliminar curso permanentemente?')) {
                                                                onDeleteCourse(course.id)
                                                            }
                                                        }}
                                                        className="p-2 text-text-muted hover:text-red-400 hover:bg-white/5 rounded-xl transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {course.course_schedules && course.course_schedules.length > 0 ? (
                                                    course.course_schedules.map(schedule => (
                                                        <div key={schedule.id} className="flex items-center gap-2 text-[10px] font-black text-text-muted bg-white/5 px-3 py-1.5 rounded-full border border-white/5 uppercase tracking-wider">
                                                            <Clock className="w-3 h-3 opacity-40" />
                                                            <span className="text-primary-400">{getDayName(schedule.day_of_week)}</span>
                                                            <span>{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-[10px] text-text-muted font-black uppercase tracking-widest opacity-40 italic">Sin horarios</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-end sm:justify-center self-end sm:self-center">
                                            <div className="w-10 h-10 rounded-full bg-primary-600/10 flex items-center justify-center text-primary-500 group-hover/course:bg-primary-600 group-hover/course:text-white transition-all transform group-hover/course:translate-x-2">
                                                <ArrowRight className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    )
}
