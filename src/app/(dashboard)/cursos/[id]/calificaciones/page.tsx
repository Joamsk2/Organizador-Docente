'use client'

import { useState, useEffect, use } from 'react'
import { CalendarRange, Info } from 'lucide-react'
import { useStudents } from '@/hooks/use-students'
import { useGrades } from '@/hooks/use-grades'
import { useAssignments } from '@/hooks/use-assignments'
import { GradesSpreadsheet } from '@/components/grades/grades-spreadsheet'
import { GRADE_PERIOD_LABELS } from '@/lib/constants'
import type { Database } from '@/lib/types/database'

type GradePeriod = Database['public']['Enums']['grade_period']

export default function CalificacionesCoursePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: courseId } = use(params)
    const [selectedPeriod, setSelectedPeriod] = useState<GradePeriod>('1er_trimestre')

    const { students, loading: loadingStudents, fetchStudents } = useStudents(courseId)
    const { grades, loading: loadingGrades, fetchGrades, saveGrade, deleteGrade } = useGrades(courseId, selectedPeriod)
    const { assignments, loading: loadingAssignments, fetchAssignments } = useAssignments(courseId)

    useEffect(() => {
        if (courseId) {
            fetchStudents()
            fetchGrades()
            fetchAssignments()
        }
    }, [courseId, selectedPeriod, fetchStudents, fetchGrades, fetchAssignments])

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto flex flex-col h-full pt-4">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-text-primary">Calificaciones</h2>
                    <p className="text-text-secondary mt-1">Planilla de notas estilo Excel con autoguardado</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Period Selector */}
                    <div className="relative">
                        <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value as GradePeriod)}
                            className="w-full sm:w-48 pl-9 pr-4 py-2 bg-surface text-text-primary border border-border rounded-xl text-sm appearance-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-sm"
                        >
                            {Object.entries(GRADE_PERIOD_LABELS).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-surface-secondary/30 rounded-2xl border border-border/50 p-2 sm:p-4">
                {students.length === 0 && !loadingStudents ? (
                    <div className="m-auto text-center max-w-md p-6 bg-surface border border-border rounded-xl">
                        <Info className="w-10 h-10 text-primary-400 mx-auto mb-4" />
                        <h3 className="font-semibold text-text-primary mb-2">No hay alumnos</h3>
                        <p className="text-text-secondary text-sm">Debes matricular alumnos en este curso para ver la planilla de calificaciones.</p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="mb-4 px-2 flex items-center justify-between flex-shrink-0">
                            <div>
                                <h3 className="font-semibold text-text-primary capitalize flex items-center gap-2">
                                    {GRADE_PERIOD_LABELS[selectedPeriod]}
                                </h3>
                                <p className="text-sm text-text-secondary mt-0.5">
                                    {students.length} alumnos matriculados
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col min-h-0 relative">
                            <GradesSpreadsheet
                                courseId={courseId}
                                period={selectedPeriod}
                                students={students}
                                grades={grades}
                                suggestedColumns={assignments.map(a => a.title)}
                                loading={loadingGrades || loadingStudents || loadingAssignments}
                                onSaveGrade={saveGrade}
                                onDeleteGrade={deleteGrade}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
