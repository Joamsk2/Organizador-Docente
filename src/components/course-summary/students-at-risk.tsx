'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { AlertOctagon, UserX, TrendingDown, EyeOff } from "lucide-react"

export interface AtRiskStudent {
    id: string
    name: string
    attendanceScore: number // percentage
    averageGrade: number
    reasons: ('attendance' | 'grades')[]
}

interface StudentsAtRiskProps {
    students: AtRiskStudent[]
    onDismissRisk?: (studentId: string) => void
}

export function StudentsAtRisk({ students, onDismissRisk }: StudentsAtRiskProps) {
    if (!students || students.length === 0) {
        return (
            <Card className="h-full border-border/50 shadow-sm rounded-2xl">
                <CardHeader className="pb-3 border-b border-border/50 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-t-2xl">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <AlertOctagon className="w-5 h-5 text-emerald-500" />
                        Riesgo Pedagógico
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex flex-col items-center justify-center text-center p-6 text-emerald-600/80 dark:text-emerald-400/80">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                        <AlertOctagon className="w-8 h-8 text-emerald-500" />
                    </div>
                    <p className="font-medium">Todo en orden</p>
                    <p className="text-sm mt-1">No hay alumnos en riesgo actualmente</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="h-full border-red-200 shadow-sm rounded-2xl flex flex-col dark:border-red-900/50">
            <CardHeader className="pb-3 border-b border-red-100 bg-red-50 dark:bg-red-900/20 dark:border-red-900/50 rounded-t-2xl">
                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertOctagon className="w-5 h-5 text-red-500" />
                    Atención Requerida
                    <span className="ml-auto bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 text-xs py-1 px-2.5 rounded-full font-bold">
                        {students.length}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
                <div className="divide-y divide-red-100 dark:divide-red-900/30">
                    {students.map(student => (
                        <div key={student.id} className="p-4 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors flex gap-4 items-center justify-between group">
                            <div>
                                <h4 className="font-medium text-text-primary text-sm mb-1">{student.name}</h4>
                                <div className="flex gap-2 text-xs">
                                    {student.reasons.includes('attendance') && (
                                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">
                                            <UserX className="w-3 h-3" />
                                            {student.attendanceScore.toFixed(0)}% Asist.
                                        </span>
                                    )}
                                    {student.reasons.includes('grades') && (
                                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">
                                            <TrendingDown className="w-3 h-3" />
                                            Prom. {student.averageGrade.toFixed(1)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {onDismissRisk && (
                                <button
                                    onClick={() => onDismissRisk(student.id)}
                                    className="p-1.5 text-text-muted hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors tooltip-trigger"
                                    title="Marcar como caso atendido (Ocultar)"
                                >
                                    <EyeOff className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
