'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Loader2 } from 'lucide-react'
import type { Database } from '@/lib/types/database'

type Course = Database['public']['Tables']['courses']['Row']

interface StudentFormProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: any, selectedCourseIds: string[]) => Promise<boolean>
    initialData?: any
    availableCourses: Course[]
    defaultCourseId?: string
}

export function StudentForm({ isOpen, onClose, onSubmit, initialData, availableCourses, defaultCourseId }: StudentFormProps) {
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        first_name: initialData?.first_name || '',
        last_name: initialData?.last_name || '',
        dni: initialData?.dni || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        notes: initialData?.notes || '',
    })

    // Pre-select courses if editing
    const existingCourseIds = initialData?.course_students?.map((cs: any) => cs.course_id) || []

    // Auto-select default course if creating new from a specific course dashboard
    const initialCourseSelection = existingCourseIds.length > 0
        ? existingCourseIds
        : (defaultCourseId ? [defaultCourseId] : [])

    const [selectedCourses, setSelectedCourses] = useState<string[]>(initialCourseSelection)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const success = await onSubmit(formData, selectedCourses)
        if (success) onClose()

        setLoading(false)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const toggleCourse = (courseId: string) => {
        setSelectedCourses(prev =>
            prev.includes(courseId) ? prev.filter(c => c !== courseId) : [...prev, courseId]
        )
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Editar Alumno" : "Nuevo Alumno"}
            maxWidth="max-w-2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-5">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            Nombres *
                        </label>
                        <input
                            type="text"
                            name="first_name"
                            required
                            value={formData.first_name}
                            onChange={handleChange}
                            placeholder="Ej: Juan"
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            Apellidos *
                        </label>
                        <input
                            type="text"
                            name="last_name"
                            required
                            value={formData.last_name}
                            onChange={handleChange}
                            placeholder="Ej: Pérez"
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            DNI
                        </label>
                        <input
                            type="text"
                            name="dni"
                            value={formData.dni}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            Teléfono
                        </label>
                        <input
                            type="text"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                        Matricular en Cursos (Opcional)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {availableCourses.length === 0 ? (
                            <p className="text-sm text-text-muted col-span-full">Aún no hay cursos creados.</p>
                        ) : (
                            availableCourses.map(course => (
                                <label
                                    key={course.id}
                                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${selectedCourses.includes(course.id) ? 'bg-primary-50 dark:bg-primary-950/20 border-primary-300' : 'bg-surface hover:bg-surface-hover border-border'}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedCourses.includes(course.id)}
                                        onChange={() => toggleCourse(course.id)}
                                        className="mt-0.5 rounded border-border text-primary-600 focus:ring-primary-500"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${selectedCourses.includes(course.id) ? 'text-primary-800 dark:text-primary-400' : 'text-text-primary'}`}>{course.name}</p>
                                        <p className="text-[10px] text-text-muted mt-0.5 truncate">{course.year} {course.division}</p>
                                    </div>
                                </label>
                            ))
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                        Observaciones Adicionales
                    </label>
                    <textarea
                        name="notes"
                        rows={2}
                        value={formData.notes}
                        onChange={handleChange}
                        placeholder="Alergias, necesidades particulares, etc."
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    />
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
                        {initialData ? "Guardar Cambios" : "Crear Alumno"}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
