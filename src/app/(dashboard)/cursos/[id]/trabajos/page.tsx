'use client'

import { useState, useEffect, use } from 'react'
import { Plus, Info, Loader2, Search, Filter } from 'lucide-react'
import { useAssignments, Assignment } from '@/hooks/use-assignments'
import { KanbanBoard } from '@/components/assignments/kanban-board'
import { AssignmentForm } from '@/components/assignments/assignment-form'
import { useRouter } from 'next/navigation'

export default function TrabajosCoursePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: courseId } = use(params)
    const router = useRouter()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [assignmentToEdit, setAssignmentToEdit] = useState<Assignment | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [typeFilter, setTypeFilter] = useState('all')

    const ASSIGNMENT_TYPES = [
        { value: 'all', label: 'Todos los tipos' },
        { value: 'tp', label: 'Trabajo Práctico' },
        { value: 'evaluacion', label: 'Evaluación / Examen' },
        { value: 'actividad', label: 'Actividad en clase' },
        { value: 'exposicion_oral', label: 'Exposición Oral' },
        { value: 'investigacion', label: 'Investigación' },
        { value: 'autoevaluacion', label: 'Autoevaluación' },
    ]

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

    const handleConfigureAI = (assignment: Assignment) => {
        router.push(`/cursos/${courseId}/trabajos/${assignment.id}/ai-config`)
    }

    const handleStudioAI = (assignment: Assignment) => {
        router.push(`/cursos/${courseId}/trabajos/${assignment.id}/ai-studio`)
    }

    const handleCreate = () => {
        setAssignmentToEdit(null)
        setIsModalOpen(true)
    }

    const handleEdit = (assignment: Assignment) => {
        setAssignmentToEdit(assignment)
        setIsModalOpen(true)
    }

    const filteredAssignments = assignments.filter((a) => {
        const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase()))
        const matchesType = typeFilter === 'all' || a.type === typeFilter
        return matchesSearch && matchesType
    })

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto flex flex-col h-full pt-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-text-primary">Trabajos Pr\u00e1cticos</h2>
                    <p className="text-text-secondary mt-1">Tablero Kanban para gestionar el estado de tus TPs</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            type="text"
                            placeholder="Buscar trabajo..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 pl-9 pr-4 py-2.5 bg-surface text-text-primary border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-sm"
                        />
                    </div>
                    
                    <div className="relative w-full sm:w-auto">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full sm:w-auto pl-9 pr-8 py-2.5 bg-surface text-text-primary border border-border rounded-xl text-sm appearance-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-sm cursor-pointer"
                        >
                            {ASSIGNMENT_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

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
                            assignments={filteredAssignments}
                            onStatusChange={updateAssignmentStatus}
                            onEdit={handleEdit}
                            onDelete={deleteAssignment}
                            onConfigureAI={handleConfigureAI}
                            onStudioAI={handleStudioAI}
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
