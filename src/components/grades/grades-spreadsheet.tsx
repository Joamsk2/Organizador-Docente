'use client'

import { useState, useEffect } from 'react'
import { Plus, Loader2, Users, BookOpen } from 'lucide-react'
import { StudentWithCourses } from '@/hooks/use-students'
import type { Database } from '@/lib/types/database'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Grade = Database['public']['Tables']['grades']['Row']
type InsertGrade = Database['public']['Tables']['grades']['Insert']

interface GradesSpreadsheetProps {
    courseId: string
    period: Database['public']['Enums']['grade_period']
    students: StudentWithCourses[]
    grades: Grade[]
    loading: boolean
    suggestedColumns?: string[]
    onSaveGrade: (data: InsertGrade) => Promise<any>
    onDeleteGrade: (id: string) => Promise<any>
}

export function GradesSpreadsheet({
    courseId,
    period,
    students,
    grades,
    loading,
    suggestedColumns,
    onSaveGrade,
    onDeleteGrade
}: GradesSpreadsheetProps) {
    const [columns, setColumns] = useState<string[]>([])
    const [newColumnName, setNewColumnName] = useState('')
    const [isAddingColumn, setIsAddingColumn] = useState(false)

    // Extract unique categories from grades, plus any manually added columns and suggested
    useEffect(() => {
        const existingCategories = Array.from(new Set(grades.map(g => g.category)))
        setColumns(prev => {
            const merged = new Set([...prev, ...existingCategories, ...(suggestedColumns || [])])
            return Array.from(merged)
        })
    }, [grades, suggestedColumns])

    // Helpers to get/set cell values
    const getGradeForCell = (studentId: string, category: string) => {
        return grades.find(g => g.student_id === studentId && g.category === category)
    }

    const handleCellBlur = async (studentId: string, category: string, valueStr: string) => {
        const existingGrade = getGradeForCell(studentId, category)
        const str = valueStr.trim()

        if (str === '') {
            if (existingGrade) {
                await onDeleteGrade(existingGrade.id)
            }
            return
        }

        const value = parseFloat(str)
        if (isNaN(value) || value < 1 || value > 10) {
            toast.error('La calificación debe ser un número entre 1 y 10')
            return
        }

        // Only save if it changed
        if (existingGrade && existingGrade.value === value) {
            return
        }

        await onSaveGrade({
            id: existingGrade?.id,
            student_id: studentId,
            course_id: courseId,
            period: period,
            category: category,
            value: value
        })
    }

    const handleAddColumn = (e: React.FormEvent) => {
        e.preventDefault()
        const name = newColumnName.trim()
        if (!name) return

        const isDistinct = !columns.some(c => c.toLowerCase() === name.toLowerCase())
        if (isDistinct) {
            setColumns([...columns, name])
            setNewColumnName('')
            setIsAddingColumn(false)
        } else {
            toast.error('Ya existe una columna con ese nombre')
        }
    }

    // ── Loading State ──
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-2xl border border-border shadow-sm">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-4" />
                <p className="text-text-secondary text-sm">Cargando planilla de calificaciones...</p>
            </div>
        )
    }

    // ── Empty State ──
    if (students.length === 0) {
        return (
            <div className="bg-surface rounded-2xl border border-border p-12 text-center shadow-sm">
                <Users className="w-10 h-10 text-primary-400 mx-auto mb-4" />
                <p className="text-text-primary font-medium mb-2">Este curso no tiene alumnos matriculados.</p>
                <p className="text-text-secondary text-sm">Dirigite al Directorio de Alumnos para inscribirlos en este curso antes de cargar notas.</p>
            </div>
        )
    }

    const hasColumns = columns.length > 0

    // ── Main Spreadsheet ──
    return (
        <div className="rounded-2xl border border-border shadow-sm overflow-hidden bg-surface w-full h-full min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
                <table className="w-full border-collapse" style={{ tableLayout: hasColumns ? 'fixed' : 'auto' }}>
                    {/* Define column widths */}
                    {hasColumns && (
                        <colgroup>
                            <col style={{ width: '220px', minWidth: '220px' }} />
                            {columns.map(col => (
                                <col key={col} style={{ width: '140px', minWidth: '100px' }} />
                            ))}
                            <col style={{ width: '130px', minWidth: '130px' }} />
                        </colgroup>
                    )}

                    {/* ── Header ── */}
                    <thead>
                        <tr className="bg-gradient-to-b from-slate-50 to-slate-100/80 dark:from-slate-800/60 dark:to-slate-800/40">
                            <th className={cn(
                                "text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.08em]",
                                hasColumns && "sticky left-0 z-30 bg-gradient-to-b from-slate-50 to-slate-100/80 dark:from-slate-800/60 dark:to-slate-800/40 shadow-[2px_0_8px_-3px_rgba(0,0,0,0.1)]"
                            )}>
                                <div className="flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5" />
                                    Alumno
                                </div>
                            </th>

                            {columns.map(col => (
                                <th
                                    key={col}
                                    className="px-3 py-3.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.08em] text-center truncate border-l border-slate-200/70 dark:border-slate-700/50"
                                    title={col}
                                >
                                    {col}
                                </th>
                            ))}

                            <th className="px-3 py-3.5 border-l border-slate-200/70 dark:border-slate-700/50">
                                {isAddingColumn ? (
                                    <form onSubmit={handleAddColumn} className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            autoFocus
                                            placeholder="Nombre..."
                                            value={newColumnName}
                                            onChange={e => setNewColumnName(e.target.value)}
                                            onBlur={() => {
                                                if (!newColumnName.trim()) setIsAddingColumn(false)
                                            }}
                                            className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                        />
                                    </form>
                                ) : (
                                    <button
                                        onClick={() => setIsAddingColumn(true)}
                                        className="flex items-center gap-1.5 text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors w-full px-1 py-0.5 rounded-md hover:bg-primary-50 dark:hover:bg-primary-950/30"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Columna
                                    </button>
                                )}
                            </th>
                        </tr>
                    </thead>

                    {/* ── Body ── */}
                    <tbody>
                        {students.map((student, rowIndex) => {
                            // Calculate average
                            const studentGrades = columns.map(col => getGradeForCell(student.id, col)).filter(g => g !== undefined)
                            const average = studentGrades.length > 0
                                ? (studentGrades.reduce((acc, g) => acc + (g?.value || 0), 0) / studentGrades.length)
                                : null

                            const isEven = rowIndex % 2 === 0

                            return (
                                <tr
                                    key={student.id}
                                    className={cn(
                                        "group transition-colors border-t border-slate-100 dark:border-slate-800/60",
                                        isEven
                                            ? "bg-white dark:bg-slate-900/30"
                                            : "bg-slate-50/50 dark:bg-slate-800/20",
                                        "hover:bg-primary-50/40 dark:hover:bg-primary-950/20"
                                    )}
                                >
                                    {/* Student Name Cell */}
                                    <td className={cn(
                                        "px-5 py-3",
                                        hasColumns && "sticky left-0 z-10 shadow-[2px_0_8px_-3px_rgba(0,0,0,0.06)]",
                                        isEven
                                            ? "bg-white dark:bg-slate-900/30 group-hover:bg-primary-50/40 dark:group-hover:bg-primary-950/20"
                                            : "bg-slate-50/50 dark:bg-slate-800/20 group-hover:bg-primary-50/40 dark:group-hover:bg-primary-950/20"
                                    )}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                                                {student.last_name?.charAt(0)}{student.first_name?.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">
                                                    {student.last_name}, {student.first_name}
                                                </div>
                                                {average !== null && (
                                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                                                        <BookOpen className="w-2.5 h-2.5" />
                                                        Prom: <span className={cn(
                                                            "font-bold",
                                                            average >= 7 ? "text-emerald-600 dark:text-emerald-400"
                                                                : average >= 4 ? "text-amber-600 dark:text-amber-400"
                                                                    : "text-red-600 dark:text-red-400"
                                                        )}>{average.toFixed(1)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Grade Cells */}
                                    {columns.map(col => {
                                        const grade = getGradeForCell(student.id, col)
                                        return (
                                            <td key={col} className="p-0 border-l border-slate-100 dark:border-slate-800/60">
                                                <GradeInput
                                                    initialValue={grade ? String(grade.value) : ''}
                                                    onSave={(val) => handleCellBlur(student.id, col, val)}
                                                />
                                            </td>
                                        )
                                    })}

                                    {/* Empty tail cell for "+ Columna" alignment */}
                                    <td className="border-l border-slate-100 dark:border-slate-800/60"></td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ── Isolated GradeInput for performance ──
function GradeInput({ initialValue, onSave }: { initialValue: string, onSave: (val: string) => void }) {
    const [val, setVal] = useState(initialValue)

    useEffect(() => {
        setVal(initialValue)
    }, [initialValue])

    const handleBlur = () => {
        if (val !== initialValue) {
            onSave(val)
        }
    }

    const numVal = parseFloat(val)
    const isFail = !isNaN(numVal) && numVal < 6
    const isWarn = !isNaN(numVal) && numVal >= 6 && numVal < 7
    const isPass = !isNaN(numVal) && numVal >= 7

    return (
        <input
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.currentTarget.blur()
                }
            }}
            className={cn(
                "w-full h-full min-h-[48px] px-3 py-2 bg-transparent text-sm text-center font-medium outline-none transition-all duration-150",
                "focus:bg-primary-50 dark:focus:bg-primary-950/30 focus:ring-2 focus:ring-inset focus:ring-primary-500 focus:z-10 focus:relative",
                "placeholder:text-slate-300 dark:placeholder:text-slate-600",
                isFail && "text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/15",
                isWarn && "text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/15",
                isPass && "text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/15",
                !val && "text-slate-400 dark:text-slate-600"
            )}
            placeholder="–"
        />
    )
}
