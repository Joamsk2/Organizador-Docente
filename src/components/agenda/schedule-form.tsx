'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { useCourses } from '@/hooks/use-courses'
import { useSchools } from '@/hooks/use-schools'
import { Loader2, Clock, MapPin, Building2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'

interface ScheduleFormProps {
    isOpen: boolean
    onClose: () => void
    defaultDay?: number
    onSuccess?: () => void
}

const DAYS_OF_WEEK = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
]

export function ScheduleForm({ isOpen, onClose, defaultDay, onSuccess }: ScheduleFormProps) {
    const { schools, loading: loadingSchools, fetchSchools } = useSchools()
    const { courses, createSchedule, fetchCourses } = useCourses()
    const [loading, setLoading] = useState(false)
    
    const [selectedSchoolId, setSelectedSchoolId] = useState('')
    const [selectedCourseId, setSelectedCourseId] = useState('')
    const [dayOfWeek, setDayOfWeek] = useState(defaultDay || 1)
    const [startTime, setStartTime] = useState('08:00')
    const [endTime, setEndTime] = useState('09:00')
    const [classroom, setClassroom] = useState('')
    const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false)
    
    useEffect(() => {
        if (isOpen && !hasAttemptedFetch) {
            fetchSchools()
            fetchCourses()
            setHasAttemptedFetch(true)
        }
    }, [isOpen, fetchSchools, fetchCourses, hasAttemptedFetch])

    const filteredCourses = courses.filter(c => c.school_id === selectedSchoolId)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedCourseId) {
            toast.error('Seleccioná un curso')
            return
        }

        if (endTime <= startTime) {
            toast.error('Horario inválido', { description: 'La hora de fin debe ser posterior a la de inicio.' })
            return
        }

        setLoading(true)
        const success = await createSchedule({
            course_id: selectedCourseId,
            day_of_week: dayOfWeek,
            start_time: startTime,
            end_time: endTime,
            classroom: classroom || null
        })

        if (success) {
            onSuccess?.()
            onClose()
        }
        setLoading(false)
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Agregar Horario a la Agenda">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* School Selection */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Escuela</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <select
                                required
                                value={selectedSchoolId}
                                onChange={(e) => {
                                    setSelectedSchoolId(e.target.value)
                                    setSelectedCourseId('')
                                }}
                                className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none appearance-none"
                            >
                                <option value="" disabled>{loadingSchools ? 'Cargando escuelas...' : 'Seleccionar escuela...'}</option>
                                {schools.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            {loadingSchools && (
                                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                                    <Loader2 className="w-3 h-3 animate-spin text-primary-500" />
                                </div>
                            )}
                        </div>
                        {!loadingSchools && schools.length === 0 && isOpen && (
                            <p className="text-[10px] text-amber-500 mt-1 font-medium">No tenés escuelas creadas aún.</p>
                        )}
                    </div>

                    {/* Course Selection */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Curso</label>
                        <div className="relative">
                            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <select
                                required
                                disabled={!selectedSchoolId}
                                value={selectedCourseId}
                                onChange={(e) => setSelectedCourseId(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none appearance-none disabled:opacity-50"
                            >
                                <option value="" disabled>{!selectedSchoolId ? 'Primero seleccioná una escuela' : 'Seleccionar curso...'}</option>
                                {filteredCourses.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.year}{c.division})</option>
                                ))}
                            </select>
                        </div>
                        {selectedSchoolId && filteredCourses.length === 0 && !loadingSchools && (
                            <p className="text-[10px] text-amber-500 mt-1 font-medium">Esta escuela no tiene cursos registrados.</p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Day Selection */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Día</label>
                        <select
                            required
                            value={dayOfWeek}
                            onChange={(e) => setDayOfWeek(Number(e.target.value))}
                            className="w-full px-4 py-2 bg-surface-secondary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        >
                            {DAYS_OF_WEEK.map(d => (
                                <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Start Time */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Inicio</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="time"
                                required
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* End Time */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Fin</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="time"
                                required
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Classroom */}
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Aula (Opcional)</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            type="text"
                            value={classroom}
                            onChange={(e) => setClassroom(e.target.value)}
                            placeholder="Ej: Aula 5, Laboratorio, etc."
                            className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center justify-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-600/25 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Horario'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
