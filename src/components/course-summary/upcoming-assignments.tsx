'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Calendar, Clock, FileText } from "lucide-react"
import type { Database } from "@/lib/types/database"
import { format, isPast, isToday } from "date-fns"
import { es } from "date-fns/locale"

type Assignment = Database['public']['Tables']['assignments']['Row']

interface UpcomingAssignmentsProps {
    assignments: Assignment[]
}

export function UpcomingAssignments({ assignments }: UpcomingAssignmentsProps) {
    if (!assignments || assignments.length === 0) {
        return (
            <Card className="h-full border-border/50 shadow-sm rounded-2xl">
                <CardHeader className="pb-3 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/50 rounded-t-2xl">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        Próximos Trabajos
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex flex-col items-center justify-center text-center p-6 text-text-secondary">
                    <FileText className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-700" />
                    <p className="font-medium">No hay entregas pendientes</p>
                    <p className="text-sm mt-1">Los próximos trabajos aparecerán aquí</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="h-full border-border/50 shadow-sm rounded-2xl flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/50 rounded-t-2xl">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    Próximos Trabajos
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
                <div className="divide-y divide-border/50">
                    {assignments.map(assignment => {
                        const dueDate = assignment.due_date ? new Date(assignment.due_date) : null
                        const isExpired = dueDate && isPast(dueDate) && !isToday(dueDate)
                        const isDueToday = dueDate && isToday(dueDate)

                        return (
                            <div key={assignment.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex gap-4 items-start">
                                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${isExpired ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                                    isDueToday ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' :
                                        'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                    }`}>
                                    {dueDate ? (
                                        <>
                                            <span className="text-xs font-medium uppercase leading-none">{format(dueDate, 'MMM', { locale: es })}</span>
                                            <span className="text-lg font-bold leading-none mt-1">{format(dueDate, 'd')}</span>
                                        </>
                                    ) : (
                                        <Clock className="w-5 h-5" />
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-medium text-text-primary text-sm leading-tight mb-1">{assignment.title}</h4>
                                    <p className="text-xs text-text-secondary capitalize">{assignment.type?.replace('_', ' ')}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
