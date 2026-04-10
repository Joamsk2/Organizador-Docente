'use client'

import { useState, useEffect, use } from 'react'
import { Plus, Info, Loader2 } from 'lucide-react'
import { useAssignments, Assignment } from '@/hooks/use-assignments'
import { KanbanBoard } from '@/components/assignments/kanban-board'
import { AssignmentForm } from '@/components/assignments/assignment-form'

export default function TrabajosCoursePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: courseId } = use(params)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [assignmentToEdit, setAssignmentToEdit] = useState<Assignment | null>(null)

    const {
        assignments,
        loading: loadingAssignments,
        fetchAssignments,
        updateAssignmentStatus,
        createAssignment,
        updateAssignment,
        deleteAssignment
    } = useAssignments(courseId)

    useEffect(() => {
        if (courseId) {
            fetchAssignments()
        }
    }, [courseId, fetchAssignments])

    const handleCreate = () => {
        setAssignmentToEdit(null)
        setIsModalOpen(true)
    }

    const handleEdit = (assignment: Assignment) => {
        setAssignmentToEdit(assignment)
        setIsModalOpen(true)
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto flex flex-col h-[calc(100vh-160px)] pt-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-text-primary">Trabajos Pr\u00e1cticos</h2>
                    <p className="text-text-secondary mt-1">Tablero Kanban para gestionar el estado de tus TPs</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <button
                        onClick={handleCreate}
                        className="flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:hover:bg-primary-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-600/25"
                    >
                        <Plus className="w-5 h-5" />
                        Nuevo Trabajo
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-h-0 flex flex-col">
                {loadingAssignments ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 bg-surface/50 rounded-2xl border border-border/50">
                        <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-4" />
                        <p className="text-text-secondary">Cargando tablero...</p>
                    </div>
                ) : assignments.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 bg-surface border border-dashed border-border rounded-2xl text-center p-6">
                        <Info className="w-10 h-10 text-primary-400 mx-auto mb-4" />
                        <h3 className="font-semibold text-text-primary mb-2">A\u00fan no hay trabajos pr\u00e1cticos</h3>
                        <p className="text-text-secondary text-sm">Cre\u00e1 tu primer trabajo pr\u00e1ctico usando el bot\u00f3n superior para empezar a organizarlos.</p>
                    </div>
                ) : (
                    <div className="flex-1 min-h-0">
                        <KanbanBoard
                            assignments={assignments}
                            onStatusChange={updateAssignmentStatus}
                            onEdit={handleEdit}
                            onDelete={deleteAssignment}
                        />
                    </div>
                )}
            </div>

            {/* Modal Form */}
            {isModalOpen && (
                <AssignmentForm
                    isOpen={isModalOpen}
                    initialData={assignmentToEdit}
                    courseId={courseId}
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={async (data) => {
                        if (assignmentToEdit) {
                            return await updateAssignment(assignmentToEdit.id, data)
                        } else {
                            const newAssignment = await createAssignment(data)
                            return !!newAssignment
                        }
                    }}
                />
            )}
        </div>
    )
}
