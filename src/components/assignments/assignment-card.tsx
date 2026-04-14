'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, FileText, MoreVertical, Edit2, Trash2, Wand2, Search } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Assignment } from '@/hooks/use-assignments'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface AssignmentCardProps {
    assignment: Assignment
    onEdit: (assignment: Assignment) => void
    onDelete: (id: string) => void
    onConfigureAI: (assignment: Assignment) => void
    onStudioAI: (assignment: Assignment) => void
}

export function AssignmentCard({ assignment, onEdit, onDelete, onConfigureAI, onStudioAI }: AssignmentCardProps) {
    const [showActions, setShowActions] = useState(false)

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: assignment.id, data: { type: 'Assignment', assignment } })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date() && assignment.status !== 'entregado'

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "bg-surface p-4 rounded-xl border border-border flex flex-col gap-3 shadow-sm touch-none cursor-grab active:cursor-grabbing hover:border-primary-300 dark:hover:border-primary-700 transition-colors group relative",
                isDragging && "opacity-50 border-primary-500 shadow-md scale-[1.02]",
                isOverdue && "border-red-300 dark:border-red-800"
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-text-primary text-sm line-clamp-2">{assignment.title}</h4>

                {/* Quick Actions Menu - Prevent drag when interacting */}
                <div
                    className="relative"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={() => setShowActions(!showActions)}
                        onBlur={() => setTimeout(() => setShowActions(false), 150)}
                        className="p-1 text-text-muted hover:bg-surface-secondary rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>

                    {showActions && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-lg shadow-lg overflow-hidden z-20">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setShowActions(false)
                                    onConfigureAI(assignment)
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/30 flex items-center gap-2 font-medium"
                            >
                                <Wand2 className="w-3.5 h-3.5" /> Configurar IA
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setShowActions(false)
                                    onStudioAI(assignment)
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/30 flex items-center gap-2 font-medium"
                            >
                                <Search className="w-3.5 h-3.5" /> Estudio IA
                            </button>
                            <div className="h-px w-full bg-border"></div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowActions(false); onEdit(assignment); }}
                                className="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-surface-hover flex items-center gap-2"
                            >
                                <Edit2 className="w-3.5 h-3.5" /> Editar
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowActions(false);
                                    if (confirm('¿Eliminar este TP?')) onDelete(assignment.id);
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Eliminar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {assignment.description && (
                <p className="text-xs text-text-secondary line-clamp-2">{assignment.description}</p>
            )}

            <div className="flex items-center justify-between mt-1 pt-3 border-t border-border">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[10px] font-medium text-text-secondary uppercase px-1.5 py-0.5 bg-surface-secondary rounded">
                        <FileText className="w-3 h-3" />
                        {assignment.type ? assignment.type.replace('_', ' ') : 'Trabajo'}
                    </span>
                    {assignment.attachment_urls && assignment.attachment_urls.length > 0 && (
                        <span className="text-[10px] text-text-muted">
                            {assignment.attachment_urls.length} adjuntos
                        </span>
                    )}
                </div>

                {assignment.due_date && (
                    <div className={cn(
                        "flex items-center gap-1.5 text-xs font-medium",
                        isOverdue ? "text-red-600" : "text-text-muted"
                    )}>
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{format(new Date(assignment.due_date), "d MMM", { locale: es })}</span>
                    </div>
                )}
            </div>
        </div>
    )
}
