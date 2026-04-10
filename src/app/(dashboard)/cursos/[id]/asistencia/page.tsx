'use client'

import { useState, useEffect, use } from 'react'
import { Calendar as CalendarIcon, UserCheck, Loader2, Info } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useStudents } from '@/hooks/use-students'
import { useAttendance } from '@/hooks/use-attendance'
import { AttendanceGrid } from '@/components/attendance/attendance-grid'

export default function AsistenciaCoursePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: courseId } = use(params)

    // Default to local date in YYYY-MM-DD
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const d = new Date()
        return d.toISOString().split('T')[0]
    })

    const { students, fetchStudents, loading: loadingStudents } = useStudents(courseId)
    const {
        attendance,
        fetchAttendance,
        saveAttendance,
        markAllAsPresent,
        loading: loadingAttendance
    } = useAttendance(courseId, selectedDate)

    useEffect(() => {
        if (courseId) {
            fetchStudents()
        }
    }, [courseId, fetchStudents])

    useEffect(() => {
        if (courseId && selectedDate) {
            fetchAttendance()
        }
    }, [courseId, selectedDate, fetchAttendance])

    const handleMarkAllPresent = async () => {
        if (window.confirm('¿Marcar a todos los alumnos como presentes?')) {
            await markAllAsPresent(students.map(s => s.id))
            fetchAttendance() // Refresh
        }
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto flex flex-col min-h-[calc(100vh-160px)] pt-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-text-primary">Asistencia</h2>
                    <p className="text-text-secondary mt-1">Control de presencia diario</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-center">
                    {/* Date Picker */}
                    <div className="relative w-full sm:w-auto">
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full sm:w-48 pl-9 pr-4 py-2 bg-surface text-text-primary border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Stats / Quick Actions */}
            {!loadingStudents && !loadingAttendance && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-900/20 rounded-2xl">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-xs text-primary-600 dark:text-primary-400 font-medium uppercase">Fecha Seleccionada</span>
                            <span className="text-sm font-bold text-primary-900 dark:text-primary-100">
                                {format(new Date(selectedDate + 'T12:00:00'), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                            </span>
                        </div>
                        <div className="h-8 w-px bg-primary-200 dark:bg-primary-800" />
                        <div className="flex flex-col">
                            <span className="text-xs text-primary-600 dark:text-primary-400 font-medium uppercase">Alumnos</span>
                            <span className="text-sm font-bold text-primary-900 dark:text-primary-100">{students.length}</span>
                        </div>
                        <div className="h-8 w-px bg-primary-200 dark:bg-primary-800" />
                        <div className="flex flex-col">
                            <span className="text-xs text-primary-600 dark:text-primary-400 font-medium uppercase">Registrados</span>
                            <span className="text-sm font-bold text-primary-900 dark:text-primary-100">{attendance.length}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleMarkAllPresent}
                        disabled={students.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-xl text-sm font-bold transition-all shadow-sm group"
                    >
                        <UserCheck className="w-4 h-4 transition-transform group-hover:scale-110" />
                        Marcar todos como Presentes
                    </button>
                </div>
            )}

            {/* Grid Content */}
            <div className="flex-1 min-h-0">
                {(loadingStudents || (loadingAttendance && attendance.length === 0)) ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-surface/50 rounded-2xl border border-border/50">
                        <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
                        <p className="text-text-secondary font-medium">Cargando lista de asistencia...</p>
                    </div>
                ) : students.length === 0 ? (
                    <div className="text-center py-20 bg-surface border border-dashed border-border rounded-2xl">
                        <h3 className="text-lg font-semibold text-text-primary">No hay alumnos en este curso</h3>
                        <p className="text-text-secondary">Agregá alumnos a este curso desde el m\u00f3dulo de Alumnos.</p>
                    </div>
                ) : (
                    <div className="animate-slide-up">
                        <AttendanceGrid
                            students={students}
                            attendanceRecords={attendance}
                            onSave={saveAttendance}
                            loading={loadingAttendance}
                        />
                    </div>
                )}
            </div>

            <div className="pb-8">
                <p className="text-xs text-text-muted text-center">
                    Los datos se guardan autom\u00e1ticamente al seleccionar un estado.
                </p>
            </div>
        </div>
    )
}
