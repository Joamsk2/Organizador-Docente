'use client'

import { useState, useEffect } from 'react'
import { Plus, Loader2, Users, BookOpen, Trash2, AlertTriangle, X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { StudentWithCourses } from '@/hooks/use-students'
import type { Database } from '@/lib/types/database'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const CONCEPTO_COLUMN = 'Concepto'
const isPerformanceCategory = (cat: string) => cat.startsWith('Desempeño ')

type Grade = Database['public']['Tables']['grades']['Row'] & { is_qualitative?: boolean | null }
type InsertGrade = Database['public']['Tables']['grades']['Insert'] & { is_qualitative?: boolean | null }

const QUALITATIVE_SCALE = [
    { label: 'Mal', short: 'Mal', value: 4, color: 'bg-red-500', textColor: 'text-white', hoverColor: 'hover:bg-red-600' },
    { label: 'Regular', short: 'Reg.', value: 7, color: 'bg-amber-400', textColor: 'text-amber-950', hoverColor: 'hover:bg-amber-500' },
    { label: 'Bien', short: 'Bien', value: 8, color: 'bg-emerald-400', textColor: 'text-emerald-950', hoverColor: 'hover:bg-emerald-500' },
    { label: 'Excelente', short: 'Exc.', value: 10, color: 'bg-emerald-600', textColor: 'text-white', hoverColor: 'hover:bg-emerald-700' },
]

interface SuggestedColumn {
    id: string
    title: string
    created_at?: string | null
}

interface GradesSpreadsheetProps {
    courseId: string
    period: Database['public']['Enums']['grade_period']
    students: StudentWithCourses[]
    grades: Grade[]
    loading: boolean
    suggestedColumns?: SuggestedColumn[]
    onSaveGrade: (data: InsertGrade) => Promise<any>
    onDeleteGrade: (id: string) => Promise<any>
    onDeleteCategory: (category: string) => Promise<boolean>
    onDeleteAssignment?: (id: string) => Promise<boolean>
}

export function GradesSpreadsheet({
    courseId,
    period,
    students,
    grades,
    loading,
    suggestedColumns,
    onSaveGrade,
    onDeleteGrade,
    onDeleteCategory,
    onDeleteAssignment
}: GradesSpreadsheetProps) {
    const [columns, setColumns] = useState<string[]>([])
    const [newColumnName, setNewColumnName] = useState('')
    const [isAddingColumn, setIsAddingColumn] = useState(false)
    const [isQualitativeMode, setIsQualitativeMode] = useState(true) // Mode for the NEW column being added
    const [columnTypes, setColumnTypes] = useState<Record<string, 'numeric' | 'qualitative'>>({})
    const [hiddenColumns, setHiddenColumns] = useState<string[]>([])
    const [columnToDelete, setColumnToDelete] = useState<string | null>(null)
    const [isDeletingLoading, setIsDeletingLoading] = useState(false)
    const [deleteAssignmentToo, setDeleteAssignmentToo] = useState(false)

    // Format today's date for new column name
    useEffect(() => {
        if (isAddingColumn && !newColumnName) {
            const now = new Date()
            const day = String(now.getDate()).padStart(2, '0')
            const month = String(now.getMonth() + 1).padStart(2, '0')
            setNewColumnName(`${day}/${month}`)
        }
    }, [isAddingColumn])

    // Check if there are any daily performance grades to show the Concepto column
    const hasPerformanceGrades = grades.some(g => isPerformanceCategory(g.category))

    // Helper to get the concept average for a student
    const getConceptAverage = (studentId: string): number | null => {
        const perfGrades = grades.filter(g => g.student_id === studentId && isPerformanceCategory(g.category))
        if (perfGrades.length === 0) return null
        const sum = perfGrades.reduce((acc, g) => acc + g.value, 0)
        return Number((sum / perfGrades.length).toFixed(1))
    }

    // Extract unique categories from grades, plus any manually added columns and suggested
    // Filter out daily performance categories (Desempeño DD/MM) — they go into "Concepto"
    useEffect(() => {
        const existingCategories = Array.from(new Set(grades.map(g => g.category)))
            .filter(cat => !isPerformanceCategory(cat))
        const suggestedTitles = (suggestedColumns || []).map(s => s.title)

        setColumns(prev => {
            const merged = new Set([...prev.filter(c => !isPerformanceCategory(c)), ...existingCategories, ...suggestedTitles])
            const finalColumns = Array.from(merged).filter(c => !hiddenColumns.includes(c))
            
            // Sort by most recent grade date or assignment date
            return finalColumns.sort((a, b) => {
                const gradesA = grades.filter(g => g.category === a)
                const gradesB = grades.filter(g => g.category === b)
                
                // Check if it's a suggested assignment column
                const suggestedA = suggestedColumns?.find(s => s.title === a)
                const suggestedB = suggestedColumns?.find(s => s.title === b)

                // Get date from assignment if exists, otherwise from grades
                const dateA = suggestedA?.created_at 
                    ? new Date(suggestedA.created_at).getTime()
                    : (gradesA.length > 0 ? Math.max(...gradesA.map(g => new Date(g.created_at || 0).getTime())) : 0)
                
                const dateB = suggestedB?.created_at
                    ? new Date(suggestedB.created_at).getTime()
                    : (gradesB.length > 0 ? Math.max(...gradesB.map(g => new Date(g.created_at || 0).getTime())) : 0)
                
                return dateB - dateA
            })
        })
    }, [grades, suggestedColumns, hiddenColumns])

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
        const isQualitative = existingGrade?.is_qualitative ?? (columnTypes[category] === 'qualitative')

        if (!isQualitative && (isNaN(value) || value < 1 || value > 10)) {
            toast.error('La calificación debe ser un número entre 1 y 10')
            return
        }

        // Only save if it changed
        if (existingGrade && existingGrade.value === value) {
            return
        }

        const assignmentId = suggestedColumns?.find(s => s.title === category)?.id || existingGrade?.assignment_id

        await onSaveGrade({
            id: existingGrade?.id,
            student_id: studentId,
            course_id: courseId,
            period: period,
            category: category,
            value: value,
            is_qualitative: isQualitative,
            assignment_id: assignmentId
        } as any) // Type cast because we haven't updated the generated types yet
    }

    const saveNewColumn = () => {
        const name = newColumnName.trim()
        if (!name) {
            setIsAddingColumn(false)
            return
        }

        const isDistinct = !columns.some(c => c.toLowerCase() === name.toLowerCase())
        if (isDistinct) {
            setColumns([name, ...columns]) // Add at the beginning (recent)
            setColumnTypes(prev => ({
                ...prev,
                [name]: isQualitativeMode ? 'qualitative' : 'numeric'
            }))
            setNewColumnName('')
            setIsAddingColumn(false)
            // If it was hidden, unhide it
            if (hiddenColumns.includes(name)) {
                setHiddenColumns(prev => prev.filter(c => c !== name))
            }
        } else {
            toast.error('Ya existe una columna con ese nombre')
            setIsAddingColumn(false)
        }
    }

    const handleAddColumn = (e: React.FormEvent) => {
        e.preventDefault()
        saveNewColumn()
    }

    const handleDeleteColumn = async (category: string) => {
        const studentGradesInColumn = grades.filter(g => g.category === category)
        const hasData = studentGradesInColumn.length > 0

        if (hasData) {
            setColumnToDelete(category)
            return
        }

        // If no data, just hide it
        setHiddenColumns(prev => [...prev, category])
        toast.success(`Columna "${category}" eliminada`)
    }

    const confirmDeleteColumn = async () => {
        if (!columnToDelete) return

        setIsDeletingLoading(true)
        try {
            // 1. Delete grades for this category
            const success = await onDeleteCategory(columnToDelete)

            if (success) {
                // 2. If it's an assignment and user wants to delete it too
                const assignment = suggestedColumns?.find(s => s.title === columnToDelete)
                if (assignment && deleteAssignmentToo && onDeleteAssignment) {
                    await onDeleteAssignment(assignment.id)
                }

                setHiddenColumns(prev => [...prev, columnToDelete])
                toast.success(`Columna "${columnToDelete}" y sus calificaciones eliminadas`)
            }
        } catch (error) {
            console.error('Error deleting column:', error)
            toast.error('Error al eliminar la columna')
        } finally {
            setIsDeletingLoading(false)
            setColumnToDelete(null)
            setDeleteAssignmentToo(false)
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
                            {/* Alumno */}
                            <col style={{ width: '220px', minWidth: '220px' }} />
                            
                            {/* Concepto (if exists) */}
                            {hasPerformanceGrades && (
                                <col style={{ width: '130px', minWidth: '100px' }} />
                            )}

                            {/* + Columna button */}
                            <col style={{ width: '130px', minWidth: '130px' }} />

                            {/* Practical Works */}
                            {columns.map(col => (
                                <col key={col} style={{ width: '140px', minWidth: '100px' }} />
                            ))}
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

                            {/* Auto-generated Concepto column */}
                            {hasPerformanceGrades && (
                                <th
                                    className="px-3 py-3.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-[0.08em] text-center truncate border-l border-slate-200/70 dark:border-slate-700/50 bg-amber-50/30 dark:bg-amber-950/10"
                                    title="Promedio automático del desempeño diario en clase"
                                >
                                    <span className="truncate">Concepto</span>
                                </th>
                            )}

                            {/* Add Column Button */}
                            <th className="px-3 py-3.5 border-l border-slate-200/70 dark:border-slate-700/50">
                                {isAddingColumn ? (
                                    <form onSubmit={handleAddColumn} className="flex flex-col gap-2 p-1.5 bg-primary-50/50 dark:bg-primary-950/20 rounded-lg">
                                        <input
                                            type="text"
                                            autoFocus
                                            placeholder="Nombre..."
                                            value={newColumnName}
                                            onChange={e => setNewColumnName(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Escape') setIsAddingColumn(false)
                                            }}
                                            onBlur={() => {
                                                if (!newColumnName.trim()) setIsAddingColumn(false)
                                            }}
                                            className="w-full bg-white dark:bg-slate-900 border border-primary-200 dark:border-primary-800 rounded-md px-2 py-1 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                        />
                                        <div className="flex items-center justify-between gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setIsQualitativeMode(!isQualitativeMode)}
                                                className={cn(
                                                    "text-[9px] px-1.5 py-0.5 rounded border transition-colors",
                                                    isQualitativeMode 
                                                        ? "bg-primary-100 border-primary-200 text-primary-700 dark:bg-primary-900/40 dark:border-primary-800 dark:text-primary-300"
                                                        : "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                                                )}
                                            >
                                                {isQualitativeMode ? 'Cualitativa' : 'Numérica'}
                                            </button>
                                            <div className="flex gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsAddingColumn(false)}
                                                    className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
                                                >
                                                    <X className="w-3 h-3 text-slate-400" />
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                ) : (
                                    <button
                                        onClick={() => setIsAddingColumn(true)}
                                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-[10px] font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-lg transition-all border border-dashed border-primary-200 dark:border-primary-800/50"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Columna
                                    </button>
                                )}
                            </th>

                            {/* Practical Work Columns */}
                            {columns.map(col => (
                                <th
                                    key={col}
                                    className="group/header px-3 py-3.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.08em] text-center truncate border-l border-slate-200/70 dark:border-slate-700/50 relative"
                                    title={col}
                                >
                                    <div className="flex items-center justify-center gap-1.5">
                                        <span className="truncate">{col}</span>
                                        <button
                                            onClick={() => handleDeleteColumn(col)}
                                            className="opacity-0 group-hover/header:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-all"
                                            title="Eliminar columna"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </th>
                            ))}

                        </tr>
                    </thead>

                    {/* ── Body ── */}
                    <tbody>
                        {students.map((student, rowIndex) => {
                            // Calculate average (practical works only)
                            const studentGrades = columns.map(col => getGradeForCell(student.id, col)).filter(g => g !== undefined)
                            const conceptAvg = getConceptAverage(student.id)
                            // Include concept in overall average if it exists
                            const allValues = [...studentGrades.map(g => g?.value || 0), ...(conceptAvg !== null ? [conceptAvg] : [])]
                            const average = allValues.length > 0
                                ? (allValues.reduce((a, b) => a + b, 0) / allValues.length)
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

                                    {/* Concepto cell (read-only average) */}
                                    {hasPerformanceGrades && (() => {
                                        const avg = getConceptAverage(student.id)
                                        return (
                                            <td className="p-0 border-l border-slate-100 dark:border-slate-800/60 bg-amber-50/20 dark:bg-amber-950/10">
                                                <div className="w-full h-full min-h-[48px] px-3 py-2 flex items-center justify-center">
                                                    {avg !== null ? (
                                                        <span className={cn(
                                                            "text-sm font-bold",
                                                            avg >= 7 ? "text-emerald-600 dark:text-emerald-400"
                                                                : avg >= 4 ? "text-amber-600 dark:text-amber-400"
                                                                    : "text-red-600 dark:text-red-400"
                                                        )}>
                                                            {avg}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-slate-300 dark:text-slate-600">–</span>
                                                    )}
                                                </div>
                                            </td>
                                        )
                                    })()}

                                    {/* Empty cell for "+ Columna" alignment */}
                                    <td className="border-l border-slate-100 dark:border-slate-800/60 bg-primary-50/10 dark:bg-primary-950/5"></td>

                                    {/* Grade Cells */}
                                    {columns.map(col => {
                                        const grade = getGradeForCell(student.id, col)
                                        
                                        // Determine type: 
                                        // 1. From existing grade record
                                        // 2. From local column settings
                                        // 3. Default to numeric (or current mode if it's the one being added)
                                        let isQualitative = false
                                        if (grade) {
                                            isQualitative = !!grade.is_qualitative
                                        } else if (columnTypes[col]) {
                                            isQualitative = columnTypes[col] === 'qualitative'
                                        }

                                        return (
                                            <td 
                                                key={col} 
                                                className="p-0 border-l border-slate-100 dark:border-slate-800/60 relative group/cell" 
                                                title={grade?.observations || undefined}
                                            >
                                                <GradeInput
                                                    initialValue={grade ? String(grade.value) : ''}
                                                    isQualitative={isQualitative}
                                                    onSave={(val) => handleCellBlur(student.id, col, val)}
                                                />
                                            </td>
                                        )
                                    })}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* ── Confirmation Modal ── */}
            <Modal
                isOpen={!!columnToDelete}
                onClose={() => {
                    if (!isDeletingLoading) {
                        setColumnToDelete(null)
                        setDeleteAssignmentToo(false)
                    }
                }}
                title="Eliminar Columna"
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                Advertencia: Esta columna tiene datos registrados
                            </p>
                            <p className="text-xs text-amber-700/80 dark:text-amber-300/60 mt-1">
                                Si eliminas la columna "{columnToDelete}", se borrarán permanentemente las {grades.filter(g => g.category === columnToDelete).length} calificaciones asociadas para todos los alumnos en este periodo.
                            </p>
                        </div>
                    </div>

                    {suggestedColumns?.some(s => s.title === columnToDelete) && (
                        <div className="flex items-center gap-3 p-3 bg-surface-secondary/50 rounded-xl border border-border/50">
                            <input
                                type="checkbox"
                                id="deleteAssignmentToo"
                                checked={deleteAssignmentToo}
                                onChange={(e) => setDeleteAssignmentToo(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            />
                            <label htmlFor="deleteAssignmentToo" className="text-sm text-text-secondary cursor-pointer select-none">
                                Eliminar también el Trabajo Práctico vinculado
                            </label>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            onClick={() => {
                                setColumnToDelete(null)
                                setDeleteAssignmentToo(false)
                            }}
                            disabled={isDeletingLoading}
                            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmDeleteColumn}
                            disabled={isDeletingLoading}
                            className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition-all flex items-center gap-2"
                        >
                            {isDeletingLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                            Eliminar definitivamente
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

// ── Isolated GradeInput for performance ──
function GradeInput({
    initialValue,
    isQualitative,
    onSave
}: {
    initialValue: string,
    isQualitative: boolean,
    onSave: (val: string) => void
}) {
    const [val, setVal] = useState(initialValue)

    useEffect(() => {
        setVal(initialValue)
    }, [initialValue])

    const handleBlur = () => {
        if (val !== initialValue) {
            onSave(val)
        }
    }

    if (isQualitative) {
        const currentGrade = QUALITATIVE_SCALE.find(s => String(s.value) === val)

        return (
            <div className="grid grid-cols-2 gap-0.5 p-0.5 h-full min-h-[52px]">
                {QUALITATIVE_SCALE.map((s) => {
                    const isActive = String(s.value) === val
                    return (
                        <button
                            key={s.value}
                            onClick={() => {
                                const newValue = isActive ? '' : String(s.value)
                                setVal(newValue)
                                onSave(newValue)
                            }}
                            title={s.label}
                            className={cn(
                                "flex items-center justify-center text-[9px] font-bold uppercase rounded-sm transition-all duration-150",
                                isActive
                                    ? `${s.color} ${s.textColor} ring-1 ring-inset ring-black/10 shadow-inner`
                                    : "bg-slate-50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                        >
                            {s.short}
                        </button>
                    )
                })}
            </div>
        )
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
