'use client'

import Link from 'next/link'
import { AlertOctagon, UserX, TrendingDown, EyeOff, ChevronRight } from "lucide-react"
import type { AtRiskStudent } from '@/types/course-dashboard'

interface StudentsAtRiskProps {
    students: AtRiskStudent[]
    courseId: string
    onDismissRisk?: (studentId: string) => void
}

export function StudentsAtRisk({ students, courseId, onDismissRisk }: StudentsAtRiskProps) {
    if (!students || students.length === 0) {
        return (
            <div className="bg-surface border border-border rounded-2xl shadow-sm h-full flex flex-col">
                <div className="px-4 py-3 border-b border-border/50 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-t-2xl flex items-center gap-2">
                    <AlertOctagon className="w-5 h-5 text-emerald-500" />
                    <h3 className="text-base font-bold text-emerald-700 dark:text-emerald-400">Riesgo Pedagógico</h3>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-emerald-600/80 dark:text-emerald-400/80">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                        <AlertOctagon className="w-7 h-7 text-emerald-500" />
                    </div>
                    <p className="font-semibold text-sm">Todo en orden</p>
                    <p className="text-xs mt-1">No hay alumnos en riesgo</p>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-surface border border-red-200 dark:border-red-900/50 rounded-2xl shadow-sm h-full flex flex-col">
            <div className="px-4 py-3 border-b border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 rounded-t-2xl flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-bold text-red-700 dark:text-red-400 flex-1">Atención Requerida</h3>
                <span className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 text-[10px] py-1 px-2 rounded-full font-black">
                    {students.length}
                </span>
            </div>
            <div className="p-0 flex-1 overflow-y-auto max-h-[320px] no-scrollbar">
                <div className="divide-y divide-red-100 dark:divide-red-900/30">
                    {students.map(student => (
                        <Link
                            key={student.id}
                            href={`/cursos/${courseId}/alumnos/${student.id}`}
                            className="block p-3 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-text-primary text-sm truncate">{student.name}</h4>
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {student.reasons.includes('attendance') && (
                                            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded text-[10px] font-bold">
                                                <UserX className="w-3 h-3" />
                                                {student.attendanceScore.toFixed(0)}%
                                            </span>
                                        )}
                                        {student.reasons.includes('grades') && (
                                            <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded text-[10px] font-bold">
                                                <TrendingDown className="w-3 h-3" />
                                                {student.averageGrade.toFixed(1)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {onDismissRisk && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                onDismissRisk(student.id)
                                            }}
                                            className="p-2 text-text-muted hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                            title="Marcar como caso atendido"
                                        >
                                            <EyeOff className="w-4 h-4" />
                                        </button>
                                    )}
                                    <ChevronRight className="w-4 h-4 text-text-muted" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
