'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Loader2, UploadCloud, Link as LinkIcon } from 'lucide-react'
import type { Database } from '@/lib/types/database'
import { cn } from '@/lib/utils'
import { useAssignments } from '@/hooks/use-assignments' // For linking assignments

type InsertPlan = Database['public']['Tables']['lesson_plans']['Insert']
type PlanType = Database['public']['Enums']['lesson_plan_type']

interface LessonPlanFormProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: any, assignmentIds: string[]) => Promise<boolean>
    initialData?: any
    courseId: string
}

const PLAN_TYPES: { value: PlanType; label: string }[] = [
    { value: 'anual', label: 'Planificación Anual' },
    { value: 'unidad', label: 'Unidad Didáctica' },
    { value: 'clase', label: 'Plan de Clase' },
    { value: 'armani', label: 'Proyecto Armani' },
]

export function LessonPlanForm({ isOpen, onClose, onSubmit, initialData, courseId }: LessonPlanFormProps) {
    const [loading, setLoading] = useState(false)

    // Basic form data
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        content: initialData?.content || '',
        type: (initialData?.type as PlanType) || 'clase',
        attachment_urls: initialData?.attachment_urls || [],
    })

    // To link assignments
    const [selectedAssignments, setSelectedAssignments] = useState<string[]>([])
    const { assignments, loading: loadingAssignments, fetchAssignments } = useAssignments(courseId)

    useEffect(() => {
        if (isOpen && courseId) {
            fetchAssignments()
        }
    }, [isOpen, courseId, fetchAssignments])

    // In a real edit scenario, we'd also load the existing linked assignments.
    // For simplicity in this iteration, we start empty unless passed explicitly.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const payload: Partial<InsertPlan> = {
            title: formData.title,
            content: formData.content,
            type: formData.type as PlanType,
            course_id: courseId,
            attachment_urls: formData.attachment_urls
        }

        const success = await onSubmit(payload, selectedAssignments)
        if (success) onClose()

        setLoading(false)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const toggleAssignment = (id: string) => {
        setSelectedAssignments(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        )
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Editar Planificación" : "Nueva Planificación"}
            maxWidth="max-w-2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-5">

                {/* Title & Type */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            Título *
                        </label>
                        <input
                            type="text"
                            name="title"
                            required
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="Ej: Unidad 1: Ecosistemas"
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            Tipo
                        </label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            {PLAN_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Content (Wysiwyg simulation) */}
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                        Contenido / Descripción
                    </label>
                    <textarea
                        name="content"
                        rows={5}
                        value={formData.content}
                        onChange={handleChange}
                        placeholder="Desarrollo de la planificación, objetivos, saberes..."
                        className="w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y custom-scrollbar"
                    />
                </div>

                {/* File Upload Simulation */}
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                        Archivos Adjuntos (PDF/Docx)
                    </label>
                    <div className="border border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center bg-surface-secondary/50 hover:bg-surface-secondary transition-colors cursor-pointer group">
                        <UploadCloud className="w-8 h-8 text-text-muted group-hover:text-primary-500 transition-colors mb-2" />
                        <p className="text-sm font-medium text-text-primary">Clic para subir un archivo</p>
                        <p className="text-xs text-text-muted mt-1">Soporte real de Storage próximamente</p>
                    </div>
                </div>

                {/* Link Assignments */}
                {!initialData && (
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                            <LinkIcon className="w-4 h-4" /> Vincular con TPs existentes
                        </label>
                        <div className="border border-border rounded-xl p-3 max-h-40 overflow-y-auto custom-scrollbar bg-surface-secondary/30 space-y-2">
                            {loadingAssignments ? (
                                <p className="text-sm text-text-muted italic">Cargando TPs...</p>
                            ) : assignments.length === 0 ? (
                                <p className="text-sm text-text-muted italic">No hay TPs en este curso para vincular.</p>
                            ) : (
                                assignments.map(assign => (
                                    <label key={assign.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface border border-transparent hover:border-border cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedAssignments.includes(assign.id)}
                                            onChange={() => toggleAssignment(assign.id)}
                                            className="w-4 h-4 text-primary-600 border-border rounded focus:ring-primary-500"
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-text-primary">{assign.title}</span>
                                            <span className="text-xs text-text-muted uppercase">{assign.type?.replace('_', ' ')}</span>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="pt-4 flex justify-end gap-3 border-t border-border mt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-text-secondary hover:bg-surface-hover font-medium rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-70 text-white font-medium rounded-lg transition-colors"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {initialData ? "Guardar Cambios" : "Crear Planificación"}
                    </button>
                </div>

            </form>
        </Modal>
    )
}
