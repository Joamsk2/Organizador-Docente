'use client'

import { CalendarDays, Award, FileText, BookOpen } from 'lucide-react'
import type { RecentActivity } from '@/types/course-dashboard'

interface RecentActivityProps {
    items: RecentActivity[]
}

const iconMap = {
    class: CalendarDays,
    grade: Award,
    assignment: FileText,
}

const colorMap = {
    class: 'text-emerald-500 bg-emerald-500/10',
    grade: 'text-violet-500 bg-violet-500/10',
    assignment: 'text-amber-500 bg-amber-500/10',
}

export function RecentActivity({ items }: RecentActivityProps) {
    if (!items || items.length === 0) {
        return (
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="text-base sm:text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary-500" />
                    Actividad Reciente
                </h3>
                <div className="text-sm text-text-secondary text-center py-8">
                    No hay actividad reciente registrada
                </div>
            </div>
        )
    }

    return (
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
            <h3 className="text-base sm:text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary-500" />
                Actividad Reciente
            </h3>
            <div className="space-y-3">
                {items.map((item) => {
                    const Icon = iconMap[item.type] || CalendarDays
                    const colorClass = colorMap[item.type] || 'text-text-secondary bg-surface-secondary'
                    return (
                        <div
                            key={item.id}
                            className="flex items-start gap-3 p-3 rounded-xl bg-surface-secondary/50 border border-border/50"
                        >
                            <div className={`w-9 h-9 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-text-primary truncate">{item.title}</p>
                                <p className="text-xs text-text-secondary truncate">{item.subtitle}</p>
                            </div>
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter flex-shrink-0 mt-1">
                                {item.date}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
