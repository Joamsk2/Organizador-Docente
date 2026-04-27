'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Assignment, AssignmentStatus } from '@/hooks/use-assignments'
import { AssignmentCard } from './assignment-card'
import { cn } from '@/lib/utils'

interface KanbanColumnProps {
    status: AssignmentStatus
    title: string
    color: string
    assignments: Assignment[]
    onEdit: (assignment: Assignment) => void
    onDelete: (id: string) => void
    onCorrect: (assignment: Assignment) => void
}

export function KanbanColumn({ status, title, color, assignments, onEdit, onDelete, onCorrect }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: status,
        data: { type: 'Column', status },
    })

    return (
        <div className="flex flex-col h-full bg-surface-secondary/40 rounded-2xl border border-border/50 overflow-hidden">
            {/* Column Header */}
            <div className={cn(
                "p-4 border-b border-border/50 flex items-center justify-between",
                color
            )}>
                <h3 className="font-semibold text-text-primary">{title}</h3>
                <div className="px-2.5 py-0.5 bg-white/20 dark:bg-black/20 rounded-full text-xs font-medium">
                    {assignments.length}
                </div>
            </div>

            {/* Droppable Area */}
            <div
                ref={setNodeRef}
                className={cn(
                    "flex-1 p-3 overflow-y-auto custom-scrollbar flex flex-col gap-3 min-h-[150px] transition-colors",
                    isOver && "bg-primary-50/50 dark:bg-primary-900/10"
                )}
            >
                <SortableContext items={assignments.map(a => a.id)} strategy={verticalListSortingStrategy}>
                    {assignments.map(assignment => (
                        <AssignmentCard
                            key={assignment.id}
                            assignment={assignment}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onCorrect={onCorrect}
                        />
                    ))}
                </SortableContext>

                {assignments.length === 0 && (
                    <div className="h-full flex items-center justify-center pointer-events-none">
                        <div className="p-4 border-2 border-dashed border-border rounded-xl text-center w-full">
                            <p className="text-sm text-text-muted">Arrastrá un trabajo aquí</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
