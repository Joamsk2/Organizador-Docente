'use client'

import { Calendar, Clock, FileText, Inbox } from "lucide-react"
import { format, isPast, isToday } from "date-fns"
import { es } from "date-fns/locale"

interface AssignmentPreview {
    id: string
    title: string
    type: string | null
    due_date: string | null
    status: string | null
}

interface UpcomingAssignmentsProps {
    assignments: AssignmentPreview[]
    submissionCounts?: Record<string, number>
}

export function UpcomingAssignments({ assignments, submissionCounts }: UpcomingAssignmentsProps) {
    if (!assignments || assignments.length === 0) {
        return (
            <div className="bg-surface border border-border rounded-2xl shadow-sm h-full flex flex-col">
                <div className="px-4 py-3 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/50 rounded-t-2xl flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <h3 className="text-base font-bold text-text-primary">Próximos Trabajos</h3>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-text-secondary">
                    <FileText className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-700" />
                    <p className="font-semibold text-sm">No hay entregas pendientes</p>
                    <p className="text-xs mt-1">Los próximos trabajos aparecerán aquí</p>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-surface border border-border rounded-2xl shadow-sm h-full flex flex-col">
            <div className="px-4 py-3 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/50 rounded-t-2xl flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-text-primary">Próximos Trabajos</h3>
            </div>
            <div className="p-0 flex-1 overflow-y-auto">
                <div className="divide-y divide-border/50">
                    {assignments.map(assignment => {
                        const dueDate = assignment.due_date ? new Date(assignment.due_date) : null
                        const isExpired = dueDate && isPast(dueDate) && !isToday(dueDate)
                        const isDueToday = dueDate && isToday(dueDate)
                        const subCount = submissionCounts?.[assignment.id] ?? 0

                        return (
                            <div key={assignment.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex gap-3 items-start">
                                <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${isExpired ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                                    isDueToday ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' :
                                        'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                    }`}>
                                    {dueDate ? (
                                        <>
                                            <span className="text-[9px] font-bold uppercase leading-none">{format(dueDate, 'MMM', { locale: es })}</span>
                                            <span className="text-sm font-black leading-none mt-0.5">{format(dueDate, 'd')}</span>
                                        </>
                                    ) : (
                                        <Clock className="w-4 h-4" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-text-primary text-sm leading-tight truncate">{assignment.title}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-text-secondary capitalize">{assignment.type?.replace('_', ' ')}</span>
                                        {subCount > 0 && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                                                <Inbox className="w-3 h-3" />
                                                {subCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
