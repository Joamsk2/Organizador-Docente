'use client'

import { BookOpen, CheckCircle2 } from 'lucide-react'
import type { ModuleProgress } from '@/types/course-dashboard'

interface CurriculumProgressProps {
    modules: ModuleProgress[]
}

export function CurriculumProgress({ modules }: CurriculumProgressProps) {
    if (!modules || modules.length === 0) {
        return (
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="text-base sm:text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary-500" />
                    Currículo
                </h3>
                <div className="text-sm text-text-secondary text-center py-8">
                    No hay planificación curricular cargada
                </div>
            </div>
        )
    }

    return (
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
            <h3 className="text-base sm:text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary-500" />
                Currículo
            </h3>
            <div className="space-y-4">
                {modules.map((mod) => (
                    <div key={mod.id}>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-semibold text-text-primary truncate pr-2">{mod.title}</span>
                            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-tighter flex-shrink-0">
                                {mod.completedTopics}/{mod.totalTopics}
                            </span>
                        </div>
                        <div className="h-2.5 w-full bg-surface-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                                style={{ width: `${mod.percentage}%` }}
                            />
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span className="text-[10px] text-text-muted font-medium">{mod.percentage.toFixed(0)}% completado</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
