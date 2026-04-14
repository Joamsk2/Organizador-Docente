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

            <div className="flex-1 mt-2 relative">
                {plan.content ? (
                    <div 
                        className="text-sm text-text-secondary line-clamp-3 [&>p]:m-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>h1]:font-bold [&>h1]:text-base [&>h2]:font-semibold [&>h2]:text-sm"
                        dangerouslySetInnerHTML={{ __html: plan.content }}
                    />
                ) : (
                    <p className="text-sm text-text-muted italic">Sin descripción detallada</p>
                )}
            </div>

            <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-border/50">
                {/* Visualizar adjuntos si existen */}
                {plan.attachment_urls && plan.attachment_urls.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {plan.attachment_urls.map((url, idx) => {
                            const urlParts = url.split('/')
                            const rawName = urlParts[urlParts.length - 1]
                            const displayFileName = decodeURIComponent(rawName).replace(/^\d+_/, '')
                            return (
                                <a 
                                    key={idx} 
                                    href={url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface-secondary text-xs font-medium text-text-secondary rounded-md hover:bg-primary-50 hover:text-primary-600 transition-colors border border-border"
                                    title={displayFileName}
                                >
                                    <Paperclip className="w-3 h-3" />
                                    <span className="truncate max-w-[120px]">{displayFileName}</span>
                                </a>
                            )
                        })}
                    </div>
                )}
                
                <div className="flex items-center gap-4">
                    {/* Only show paperclip count if we don't display individual files above, but we do, so no need! */}
                    <div className="flex items-center gap-1.5 text-text-secondary" title={`${plan.assignments_count} TPs vinculados`}>
                        <FolderOpen className="w-4 h-4" />
                        <span className="text-sm font-medium">{plan.assignments_count} TPs vinculados</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
