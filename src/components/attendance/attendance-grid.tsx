'use client'

import { useState } from 'react'
import { Check, X, Clock, ShieldAlert, MessageSquare, Loader2 } from 'lucide-react'
import { ATTENDANCE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { AttendanceStatus, Attendance } from '@/hooks/use-attendance'

interface Student {
    id: string
    first_name: string
    last_name: string
}

interface AttendanceGridProps {
    students: Student[]
    attendanceRecords: Attendance[]
    onSave: (studentId: string, status: AttendanceStatus, notes?: string) => Promise<boolean>
    loading?: boolean
}

export function AttendanceGrid({ students, attendanceRecords, onSave, loading }: AttendanceGridProps) {
    const [savingId, setSavingId] = useState<string | null>(null)

    const handleStatusChange = async (studentId: string, status: AttendanceStatus) => {
        setSavingId(studentId)
        await onSave(studentId, status)
        setSavingId(null)
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead className="sticky top-0 z-20 bg-surface">
                        <tr className="bg-surface-secondary/95 backdrop-blur-sm border-b border-border shadow-sm">
                            <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider w-1/3">
                                Alumno
                            </th>
                            <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-center">
                                Estado de Asistencia
                            </th>
                            <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">
                                Notas
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {students.map((student) => {
                            const record = attendanceRecords.find(r => r.student_id === student.id)
                            const currentStatus = record?.status
                            const isSaving = savingId === student.id

                            return (
                                <tr key={student.id} className="hover:bg-surface-hover/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-text-primary">
                                                {student.last_name}, {student.first_name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            {Object.entries(ATTENDANCE_LABELS).map(([status, config]) => {
                                                const isActive = currentStatus === status
                                                const Icon = status === 'presente' ? Check :
                                                    status === 'ausente' ? X :
                                                        status === 'tardanza' ? Clock : ShieldAlert

                                                return (
                                                    <button
                                                        key={status}
                                                        disabled={isSaving || loading}
                                                        onClick={() => handleStatusChange(student.id, status as AttendanceStatus)}
                                                        title={config.label}
                                                        className={cn(
                                                            "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                                                            "border border-border hover:border-primary-400 group-hover:scale-105",
                                                            isActive ? config.color : "bg-surface hover:bg-surface-secondary text-text-muted",
                                                            isActive && "shadow-lg shadow-current/20 scale-110 z-10",
                                                            (isSaving || loading) && "opacity-50 cursor-not-allowed"
                                                        )}
                                                    >
                                                        {isActive && isSaving ? (
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                        ) : (
                                                            <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-text-muted")} />
                                                        )}
                                                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-surface border border-border text-[9px] font-bold text-text-primary shadow-sm">
                                                            {config.short}
                                                        </span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end">
                                            <button
                                                className={cn(
                                                    "p-2 rounded-lg transition-colors border border-transparent",
                                                    record?.notes ? "text-primary-600 bg-primary-50 border-primary-100" : "text-text-muted hover:bg-surface-secondary hover:text-text-primary"
                                                )}
                                                title={record?.notes || "Agregar nota"}
                                                onClick={() => {
                                                    const note = prompt("Notas de asistencia:", record?.notes || "")
                                                    if (note !== null) handleStatusChange(student.id, (currentStatus || 'presente') as AttendanceStatus)
                                                }}
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
