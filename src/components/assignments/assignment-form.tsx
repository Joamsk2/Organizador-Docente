'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Loader2 } from 'lucide-react'
import type { Database } from '@/lib/types/database'
import { GRADE_CATEGORIES } from '@/lib/constants'

// Extend from the assignments table, but use assignment_type enum
type InsertAssignment = Database['public']['Tables']['assignments']['Insert']
type AssignmentType = Database['public']['Enums']['assignment_type']

interface AssignmentFormProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: any) => Promise<boolean>
    initialData?: any
    courseId: string
}

export function AssignmentForm({ isOpen, onClose, onSubmit, initialData, courseId }: AssignmentFormProps) {
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        type: (initialData?.type as AssignmentType) || 'tp',
        due_date: initialData?.due_date ? new Date(initialData.due_date).toISOString().split('T')[0] : '',
        // Just mock attachments for now, as real attachments need file upload logic to storage bucket
        attachment_urls: initialData?.attachment_urls || [],
    })

    // Map our UI grade categories to the assignment_type enum if possible.
    // The enum: "tp", "evaluacion", "actividad", "exposicion_oral", "autoevaluacion", "investigacion"
    const ASSIGNMENT_TYPES = [
        { value: 'tp', label: 'Trabajo Práctico' },
        { value: 'evaluacion', label: 'Evaluación / Examen' },
        { value: 'actividad', label: 'Actividad en clase' },
        { value: 'exposicion_oral', label: 'Exposición Oral' },
        { value: 'investigacion', label: 'Investigación' },
        { value: 'autoevaluacion', label: 'Autoevaluación' },
    ]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // Construct payload
        const payload: Partial<InsertAssignment> = {
            title: formData.title,
            description: formData.description,
            type: formData.type as AssignmentType,
            due_date: formData.due_date || null,
            course_id: courseId,
            // If creating, start as draft
            status: initialData ? initialData.status : 'borrador'
        }

        const success = await onSubmit(payload)
        if (success) onClose()

        setLoading(false)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Editar Trabajo" : "Nuevo Trabajo Práctico"}
            maxWidth="max-w-xl"
        >
            <form onSubmit={handleSubmit} className="space-y-4">

                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                        Título *
                    </label>
                    <input
                        type="text"
                        name="title"
                        required
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="Ej: TP N°1 - Revolución de Mayo"
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            Tipo de Trabajo
                        </label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            {ASSIGNMENT_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            Fecha de Entrega
                        </label>
                        <input
                            type="date"
                            name="due_date"
                            value={formData.due_date}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-text-primary"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                        Descripción / Consigna
                    </label>
                    <textarea
                        name="description"
                        rows={4}
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Detallá lo que los alumnos deben hacer..."
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y custom-scrollbar"
                    />
                </div>

                <div className="bg-surface-secondary border border-border rounded-lg p-4 mt-2">
                    <p className="text-sm text-text-secondary">
                        <span className="font-semibold text-text-primary">Archivos adjuntos:</span> Próximamente podrás subir PDFs con las consignas directamente acá (Fase 2).
                    </p>
                </div>

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
                        {initialData ? "Guardar Cambios" : "Crear Trabajo"}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
