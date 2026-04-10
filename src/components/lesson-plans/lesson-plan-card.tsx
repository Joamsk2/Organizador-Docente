'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    FileText,
    Paperclip,
    MoreVertical,
    Trash2,
    Edit,
    FolderOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LessonPlanWithStats } from '@/hooks/use-lesson-plans'

interface LessonPlanCardProps {
    plan: LessonPlanWithStats
    onEdit: (plan: LessonPlanWithStats) => void
    onDelete: (planId: string) => void
}

const TYPE_CONFIG = {
    anual: { label: 'Anual', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
    unidad: { label: 'Unidad Didáctica', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
    clase: { label: 'Clase', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
    armani: { label: 'Proyecto Armani', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
}

export function LessonPlanCard({ plan, onEdit, onDelete }: LessonPlanCardProps) {
    const planType = plan.type || 'clase'
    const config = TYPE_CONFIG[planType as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.clase
    const attachmentCount = plan.attachment_urls?.length || 0
    const dateStr = plan.created_at ? format(new Date(plan.created_at), 'MMM yyyy', { locale: es }) : ''

    return (
        <div className={cn(
            "bg-surface rounded-xl border p-5 flex flex-col gap-4 transition-all hover:shadow-md group relative overflow-hidden",
            config.border
        )}>
            {/* Top Banner indicating type */}
            <div className={cn("absolute top-0 left-0 w-full h-1", config.color.split(' ')[0])} />

            <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full w-fit", config.color)}>
                        {config.label}
                    </span>
                    <h3 className="font-bold text-text-primary text-lg mt-1 line-clamp-2">{plan.title}</h3>
                    <p className="text-sm text-text-muted capitalize">{dateStr}</p>
                </div>

                {/* Actions Dropdown Simulation (simplified for now with just icons) */}
                <div className="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(plan)}
                        className="p-2 text-text-muted hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Editar Planificación"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => {
                            if (window.confirm(`¿Seguro que querés eliminar "${plan.title}"?`)) {
                                onDelete(plan.id)
                            }
                        }}
                        className="p-2 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar Planificación"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 mt-2">
                {plan.content ? (
                    <p className="text-sm text-text-secondary line-clamp-3">
                        {plan.content.replace(/<[^>]+>/g, '') /* Simple strip HTML if rich text */}
                    </p>
                ) : (
                    <p className="text-sm text-text-muted italic">Sin descripción detallada</p>
                )}
            </div>

            {/* Footer Stats */}
            <div className="flex items-center gap-4 mt-auto pt-4 border-t border-border/50">
                <div className="flex items-center gap-1.5 text-text-secondary" title={`${attachmentCount} archivos adjuntos`}>
                    <Paperclip className="w-4 h-4" />
                    <span className="text-sm font-medium">{attachmentCount}</span>
                </div>

                <div className="flex items-center gap-1.5 text-text-secondary" title={`${plan.assignments_count} TPs vinculados`}>
                    <FolderOpen className="w-4 h-4" />
                    <span className="text-sm font-medium">{plan.assignments_count} TPs</span>
                </div>
            </div>
        </div>
    )
}
