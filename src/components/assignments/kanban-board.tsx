'use client'

import { useState, useMemo } from 'react'
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { KanbanColumn } from './kanban-column'
import { AssignmentCard } from './assignment-card'
import type { Assignment, AssignmentStatus } from '@/hooks/use-assignments'

interface KanbanBoardProps {
    assignments: Assignment[]
    onStatusChange: (id: string, newStatus: AssignmentStatus) => void
    onEdit: (assignment: Assignment) => void
    onDelete: (id: string) => void
    onCorrect: (assignment: Assignment) => void
}

const COLUMNS: { id: AssignmentStatus; title: string; color: string }[] = [
    { id: 'borrador', title: 'Borrador', color: 'bg-surface-secondary/50 text-text-primary' },
    { id: 'asignado', title: 'Asignado', color: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-b-blue-200 dark:border-b-blue-800' },
    { id: 'entregado', title: 'Entregado', color: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-b-emerald-200 dark:border-b-emerald-800' }
]

export function KanbanBoard({ assignments, onStatusChange, onEdit, onDelete, onCorrect }: KanbanBoardProps) {
    const [activeId, setActiveId] = useState<string | null>(null)

    // Use memos for columns to avoid unnecessary recalculations
    const columnsData = useMemo(() => {
        return COLUMNS.map(col => ({
            ...col,
            items: assignments.filter(a => a.status === col.id)
        }))
    }, [assignments])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // 5px drag before it activates, allows buttons inside cards to be clicked
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)

        if (!over) return

        const activeId = active.id as string
        const overId = over.id as AssignmentStatus | string

        // Find the assignment
        const assignment = assignments.find(a => a.id === activeId)
        if (!assignment) return

        // If dropping over a column area (droppable ID is the status)
        if (COLUMNS.some(c => c.id === overId)) {
            if (assignment.status !== overId) {
                onStatusChange(activeId, overId as AssignmentStatus)
            }
            return
        }

        // If dropping over another card in a list (Sortable sorting)
        // We get the list it belongs to
        const overAssignment = assignments.find(a => a.id === overId)
        if (overAssignment && overAssignment.status != null && overAssignment.status !== assignment.status) {
            // Moved to another column over a card
            onStatusChange(activeId, overAssignment.status)
        }
    }

    const activeAssignment = useMemo(
        () => assignments.find((a) => a.id === activeId),
        [activeId, assignments]
    )

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full pb-6">
                {columnsData.map(col => (
                    <KanbanColumn
                        key={col.id}
                        status={col.id}
                        title={col.title}
                        color={col.color}
                        assignments={col.items}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onCorrect={onCorrect}
                    />
                ))}
            </div>

            <DragOverlay dropAnimation={{
                duration: 250,
                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
            }}>
                {activeAssignment ? (
                    <div className="opacity-90 rotate-2 scale-105 shadow-xl cursor-grabbing">
                        <AssignmentCard
                            assignment={activeAssignment}
                            onEdit={() => { }}
                            onDelete={() => { }}
                            onCorrect={onCorrect}
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
