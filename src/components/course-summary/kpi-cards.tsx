'use client'

import {
    Users, Percent, TrendingUp, ClipboardList, CalendarDays, BookOpen
} from 'lucide-react'
import type { KpiData } from '@/types/course-dashboard'

interface KpiCardsProps {
    data: KpiData
}

const items: {
    key: keyof KpiData
    label: string
    icon: React.ElementType
    color: string
    bg: string
    suffix?: string
}[] = [
    { key: 'totalStudents', label: 'Alumnos', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { key: 'courseAttendanceRate', label: 'Asistencia', icon: Percent, color: 'text-emerald-500', bg: 'bg-emerald-500/10', suffix: '%' },
    { key: 'courseAverageGrade', label: 'Promedio', icon: TrendingUp, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { key: 'pendingAssignments', label: 'TPs Pend.', icon: ClipboardList, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { key: 'classesThisMonth', label: 'Clases Mes', icon: CalendarDays, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { key: 'curriculumCoverage', label: 'Currículo', icon: BookOpen, color: 'text-cyan-500', bg: 'bg-cyan-500/10', suffix: '%' },
]

export function KpiCards({ data }: KpiCardsProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {items.map((item) => {
                const value = data[item.key as keyof KpiData] as number
                const Icon = item.icon
                return (
                    <div
                        key={item.key}
                        className="bg-surface border border-border rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm"
                    >
                        <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center mb-2`}>
                            <Icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <span className="text-2xl font-black text-text-primary leading-none">
                            {typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 1) : value}
                            {item.suffix || ''}
                        </span>
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-tighter mt-1">
                            {item.label}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}
