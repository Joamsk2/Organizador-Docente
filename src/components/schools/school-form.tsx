'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Loader2 } from 'lucide-react'
import { SCHOOL_LEVEL_LABELS, SCHOOL_SHIFT_LABELS } from '@/lib/constants'

interface SchoolFormProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: any) => Promise<boolean>
    initialData?: any
}

export function SchoolForm({ isOpen, onClose, onSubmit, initialData }: SchoolFormProps) {
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        address: initialData?.address || '',
        phone: initialData?.phone || '',
        level: initialData?.level || 'secundaria',
        shift: initialData?.shift || 'mañana',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const success = await onSubmit(formData)
        if (success) onClose()

        setLoading(false)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Editar Escuela" : "Nueva Escuela"}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                        Nombre de la Institución *
                    </label>
                    <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Ej: E.E.S.T N° 1"
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            Nivel *
                        </label>
                        <select
                            name="level"
                            required
                            value={formData.level}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
                        >
                            {Object.entries(SCHOOL_LEVEL_LABELS).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            Turno *
                        </label>
                        <select
                            name="shift"
                            required
                            value={formData.shift}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
                        >
                            {Object.entries(SCHOOL_SHIFT_LABELS).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                        Dirección
                    </label>
                    <input
                        type="text"
                        name="address"
                        value={formData.address}
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

                <div className="pt-4 flex justify-end gap-3 border-t border-border">
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
                        {initialData ? "Guardar Cambios" : "Crear Escuela"}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
