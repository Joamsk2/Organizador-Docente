'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { COURSE_COLORS } from '@/lib/constants'

interface CourseFormProps {
    schoolId: string
    isOpen: boolean
    onClose: () => void
    onSubmit: (courseData: any, schedulesData: any[]) => Promise<boolean>
    initialData?: any
}

const DAYS_OF_WEEK = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' },
]

export function CourseForm({ schoolId, isOpen, onClose, onSubmit, initialData }: CourseFormProps) {
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        school_id: schoolId,
        name: initialData?.name || '',
        year: initialData?.year || '',
        division: initialData?.division || '',
        color: initialData?.color || COURSE_COLORS[Math.floor(Math.random() * COURSE_COLORS.length)],
    })

    // Basic schedule state for creation or edit
    const [schedules, setSchedules] = useState<any[]>(initialData?.course_schedules || [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // Only pass valid schedules
        const validSchedules = schedules.filter(s => s.day_of_week !== '' && s.start_time && s.end_time)

        const success = await onSubmit(formData, validSchedules)
        if (success) {
            setFormData(prev => ({ ...prev, name: '', year: '', division: '' }))
            setSchedules([])
            onClose()
        }

        setLoading(false)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const addSchedule = () => {
        setSchedules(prev => [...prev, { id: Date.now(), day_of_week: 1, start_time: '08:00', end_time: '10:00', classroom: '' }])
    }

    const removeSchedule = (id: number) => {
        setSchedules(prev => prev.filter(s => s.id !== id))
    }

    const updateSchedule = (id: number, field: string, value: string | number) => {
        setSchedules(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Editar Curso" : "Nuevo Curso"}
            maxWidth="max-w-2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Core fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            Nombre de la Materia *
                        </label>
                        <input
                            type="text"
                            name="name"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Ej: Geografía"
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            Año / Nivel *
                        </label>
                        <input
                            type="text"
                            name="year"
                            required
                            value={formData.year}
                            onChange={handleChange}
                            placeholder="Ej: 3ro"
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            División
                        </label>
                        <input
                            type="text"
                            name="division"
                            value={formData.division}
                            onChange={handleChange}
                            placeholder="Ej: A"
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-text-secondary mb-2">Color del Curso</label>
                        <div className="flex gap-2 flex-wrap">
                            {COURSE_COLORS.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                                    className={`w-8 h-8 rounded-full transition-transform ${formData.color === color ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' : 'hover:scale-110'}`}
                                    style={{ backgroundColor: color }}
                                    aria-label={`Seleccionar color ${color}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Schedules / Horarios */}
                <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-text-primary">Horarios (Opcional)</h3>
                        <button
                            type="button"
                            onClick={addSchedule}
                            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                            <Plus className="w-4 h-4" /> Agregar Horario
                        </button>
                    </div>

                    {schedules.length === 0 ? (
                        <p className="text-sm text-text-muted text-center py-4 bg-surface-secondary rounded-lg border border-dashed border-border">
                            Sin horarios definidos. Podés agregarlos ahora o más tarde.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {schedules.map((schedule) => (
                                <div key={schedule.id} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-surface-secondary p-3 rounded-lg border border-border">
                                    <select
                                        value={schedule.day_of_week}
                                        onChange={(e) => updateSchedule(schedule.id, 'day_of_week', parseInt(e.target.value))}
                                        className="flex-1 min-w-[120px] px-3 py-2 bg-surface border border-border rounded-lg text-sm"
                                    >
                                        {DAYS_OF_WEEK.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}
                                    </select>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="time"
                                            value={schedule.start_time}
                                            onChange={(e) => updateSchedule(schedule.id, 'start_time', e.target.value)}
                                            className="w-[100px] px-2 py-2 bg-surface border border-border rounded-lg text-sm"
                                        />
                                        <span className="text-text-muted">-</span>
                                        <input
                                            type="time"
                                            value={schedule.end_time}
                                            onChange={(e) => updateSchedule(schedule.id, 'end_time', e.target.value)}
                                            className="w-[100px] px-2 py-2 bg-surface border border-border rounded-lg text-sm"
                                        />
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Aula (opc.)"
                                        value={schedule.classroom}
                                        onChange={(e) => updateSchedule(schedule.id, 'classroom', e.target.value)}
                                        className="w-[100px] md:w-24 px-3 py-2 bg-surface border border-border rounded-lg text-sm"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => removeSchedule(schedule.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg ml-auto"
                                        title="Eliminar horario"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-border mt-6">
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
                        {initialData ? "Guardar Cambios" : "Crear Curso"}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
