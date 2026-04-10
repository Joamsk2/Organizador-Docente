'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, MapPin, Building2, BookOpen, Clock, Trash2, Plus, Edit2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Database } from '@/lib/types/database'
import { formatTime, getDayName } from '@/lib/utils'

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
        <div className="bg-surface rounded-xl border border-border overflow-hidden transition-all duration-200">
            <div
                className={`p-5 flex items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-surface-hover ${isExpanded ? 'bg-surface-hover' : ''}`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-start sm:items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-primary-50 dark:bg-primary-950/50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-primary-600 dark:text-primary-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-text-primary capitalize">{school.name}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-text-secondary">
                            <span className="capitalize px-2 py-0.5 bg-surface-secondary rounded-md border border-border">
                                {school.level} • {school.shift}
                            </span>
                            {school.address && (
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" /> {school.address}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 mr-2" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => onEditSchool(school)}
                            className="p-2 text-text-muted hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/50 rounded-lg transition-colors"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => {
                                if (confirm('¿Estás seguro de que querés eliminar esta escuela y todos sus cursos?')) {
                                    onDeleteSchool(school.id)
                                }
                            }}
                            className="p-2 text-text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-secondary">
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="border-t border-border bg-surface-secondary/50 p-5 animate-slide-down">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-text-primary flex items-center gap-2">
                            <BookOpen className="w-4 h-4" /> Cursos Asignados
                        </h4>
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddCourse(school.id); }}
                            className="text-sm flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium px-3 py-1.5 bg-primary-50 dark:bg-primary-950/50 rounded-lg transition-colors border border-primary-100 dark:border-primary-900"
                        >
                            <Plus className="w-4 h-4" /> Agregar Curso
                        </button>
                    </div>

                    {courses.length === 0 ? (
                        <div className="text-center py-6 bg-surface border border-dashed border-border rounded-lg">
                            <p className="text-text-muted text-sm">No hay cursos registrados en esta escuela.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {courses.map(course => (
                                <Link href={`/cursos/${course.id}`} key={course.id} className="bg-surface border border-border rounded-lg p-4 flex gap-4 hover:border-primary-500 hover:shadow-md transition-all group cursor-pointer block">
                                    <div className="w-1.5 rounded-full outline outline-1 outline-border/50 shadow-sm" style={{ backgroundColor: course.color || '#6366f1' }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h5 className="font-bold text-text-primary capitalize group-hover:text-primary-600 transition-colors">{course.name}</h5>
                                                <p className="text-sm text-text-secondary mt-0.5">
                                                    {course.year} {course.division}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 -mt-1 -mr-1">
                                                <button
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEditCourse(course); }}
                                                    className="p-1.5 text-text-muted hover:text-primary-600 rounded-md transition-colors"
                                                    title="Editar curso"
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
                                                    className="p-1.5 text-text-muted hover:text-red-600 rounded-md transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex flex-col gap-1.5">
                                            {course.course_schedules && course.course_schedules.length > 0 ? (
                                                course.course_schedules.map(schedule => (
                                                    <div key={schedule.id} className="flex flex-wrap items-center gap-2 text-xs text-text-secondary bg-surface-secondary px-2.5 py-1.5 rounded-md w-fit border border-border/50">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        <span className="font-medium text-text-primary">{getDayName(schedule.day_of_week)}</span>
                                                        <span>{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</span>
                                                        {schedule.classroom && <span className="text-text-muted font-medium ml-1 bg-surface py-0.5 px-1.5 rounded text-[10px] border border-border uppercase">AULA {schedule.classroom}</span>}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-text-muted italic">Sin horarios definidos</p>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
