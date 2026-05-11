'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Loader2 } from 'lucide-react'

interface CurriculumFormModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (title: string, description?: string) => Promise<any>
    title: string
    initialData?: { title: string; description?: string | null }
    placeholder?: string
}

export function CurriculumFormModal({
    isOpen,
    onClose,
    onSubmit,
    title,
    initialData,
    placeholder = "Ingrese el título..."
}: CurriculumFormModalProps) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setName(initialData?.title || '')
            setDescription(initialData?.description || '')
        }
    }, [isOpen, initialData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setLoading(true)
        try {
            await onSubmit(name.trim(), description.trim() || undefined)
            onClose()
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1">
                        Título *
                    </label>
                    <input
                        id="name"
                        type="text"
                        required
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    />
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-1">
                        Descripción (Opcional)
                    </label>
                    <textarea
                        id="description"
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Breve descripción o notas..."
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all resize-none"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !name.trim()}
                        className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-xl transition-all shadow-sm"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {initialData ? 'Guardar Cambios' : 'Crear'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
