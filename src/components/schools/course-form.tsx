'use client'
 
import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Loader2, Plus, Trash2, BookOpen, Clock, MapPin, Sparkles } from 'lucide-react'
import { COURSE_COLORS } from '@/lib/constants'
import { motion, AnimatePresence } from 'framer-motion'
 
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
 
        // Validate that end_time is after start_time
        const invalidSchedule = validSchedules.find(s => s.end_time <= s.start_time)
        if (invalidSchedule) {
            const dayLabel = DAYS_OF_WEEK.find(d => d.value === invalidSchedule.day_of_week)?.label || 'el día seleccionado'
            import('sonner').then(({ toast }) => {
                toast.error('Horario inválido', {
                    description: `El horario del ${dayLabel} tiene la hora de fin igual o anterior a la de inicio. Verificá los valores.`
                })
            })
            setLoading(false)
            return
        }
 
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
            title={initialData ? "Configurar Curso" : "Crear Nuevo Curso"}
            maxWidth="max-w-2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-10 p-2">
                
                {/* Header Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="md:col-span-2 space-y-2">
                        <label className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                            Materia / Espacio Curricular
                        </label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary-500 transition-colors">
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Ej: Geografía"
                                className="w-full pl-12 pr-6 py-4 bg-surface-secondary/50 border border-white/5 rounded-[1.5rem] focus:ring-2 focus:ring-primary-500/20 outline-none transition-all font-bold text-text-primary"
                            />
                        </div>
                    </div>
 
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                            Año / Nivel
                        </label>
                        <input
                            type="text"
                            name="year"
                            required
                            value={formData.year}
                            onChange={handleChange}
                            placeholder="Ej: 3ro"
                            className="w-full px-6 py-4 bg-surface-secondary/50 border border-white/5 rounded-[1.5rem] focus:ring-2 focus:ring-primary-500/20 outline-none font-bold text-text-primary"
                        />
                    </div>
 
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                            División
                        </label>
                        <input
                            type="text"
                            name="division"
                            value={formData.division}
                            onChange={handleChange}
                            placeholder="Ej: A, B, 1ra..."
                            className="w-full px-6 py-4 bg-surface-secondary/50 border border-white/5 rounded-[1.5rem] focus:ring-2 focus:ring-primary-500/20 outline-none font-bold text-text-primary"
                        />
                    </div>
 
                    <div className="md:col-span-2 space-y-4">
                        <label className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                            Identificador Visual
                        </label>
                        <div className="flex gap-4 flex-wrap p-4 bg-white/5 rounded-[2rem] border border-white/5">
                            {COURSE_COLORS.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                                    className={`w-10 h-10 rounded-full transition-all transform hover:scale-110 relative ${formData.color === color ? 'ring-4 ring-offset-4 ring-offset-surface ring-primary-500' : ''}`}
                                    style={{ backgroundColor: color }}
                                >
                                    {formData.color === color && (
                                        <motion.div layoutId="selected-color" className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-2 h-2 bg-white rounded-full shadow-lg" />
                                        </motion.div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
 
                {/* Schedules / Horarios */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                            <Clock className="w-4 h-4 opacity-40" />
                            Cronograma Semanal
                        </h3>
                        <button
                            type="button"
                            onClick={addSchedule}
                            className="flex items-center gap-2 px-5 py-2 bg-primary-600/10 text-primary-400 hover:bg-primary-600/20 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all border border-primary-500/20 shadow-lg shadow-primary-600/5"
                        >
                            <Plus className="w-4 h-4" /> Agregar Horario
                        </button>
                    </div>
 
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        <AnimatePresence initial={false}>
                            {schedules.length === 0 ? (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-10 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10"
                                >
                                    <p className="text-xs font-bold text-text-muted opacity-40 uppercase tracking-widest italic">No se han definido horarios aún</p>
                                </motion.div>
                            ) : (
                                schedules.map((schedule, idx) => (
                                    <motion.div 
                                        key={schedule.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-surface-secondary/80 p-5 rounded-[2rem] border border-white/5 group shadow-sm hover:shadow-xl transition-all"
                                    >
                                        {/* Dia */}
                                        <div className="md:col-span-4">
                                            <select
                                                value={schedule.day_of_week}
                                                onChange={(e) => updateSchedule(schedule.id, 'day_of_week', parseInt(e.target.value))}
                                                className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl outline-none font-bold text-sm text-text-primary appearance-none cursor-pointer"
                                            >
                                                {DAYS_OF_WEEK.map(day => <option key={day.value} value={day.value} className="bg-surface-secondary">{day.label}</option>)}
                                            </select>
                                        </div>
 
                                        {/* Horas */}
                                        <div className="md:col-span-4 flex items-center gap-3">
                                            <input
                                                type="time"
                                                value={schedule.start_time}
                                                onChange={(e) => updateSchedule(schedule.id, 'start_time', e.target.value)}
                                                className="flex-1 px-3 py-3 bg-white/5 border border-white/5 rounded-xl outline-none font-bold text-sm text-text-primary"
                                            />
                                            <span className="text-text-muted opacity-30">—</span>
                                            <input
                                                type="time"
                                                value={schedule.end_time}
                                                onChange={(e) => updateSchedule(schedule.id, 'end_time', e.target.value)}
                                                className="flex-1 px-3 py-3 bg-white/5 border border-white/5 rounded-xl outline-none font-bold text-sm text-text-primary"
                                            />
                                        </div>
 
                                        {/* Aula y Borrar */}
                                        <div className="md:col-span-4 flex items-center gap-3">
                                            <div className="relative flex-1">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/40">
                                                    <MapPin className="w-3 h-3" />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Aula"
                                                    value={schedule.classroom}
                                                    onChange={(e) => updateSchedule(schedule.id, 'classroom', e.target.value)}
                                                    className="w-full pl-8 pr-3 py-3 bg-white/5 border border-white/5 rounded-xl outline-none font-bold text-sm text-text-primary"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeSchedule(schedule.id)}
                                                className="p-3 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                </div>
 
                <div className="pt-8 flex flex-col sm:flex-row justify-end gap-4 border-t border-white/5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-8 py-4 text-text-muted hover:text-text-primary font-black text-sm rounded-[1.5rem] transition-colors"
                    >
                        Descartar
                    </button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="group relative flex items-center justify-center gap-3 px-12 py-4 bg-primary-600 text-white rounded-[1.5rem] font-black transition-all hover:bg-primary-700 shadow-2xl shadow-primary-600/30 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Sparkles className="w-5 h-5" />
                        )}
                        {initialData ? "Guardar Cambios" : "Crear Curso"}
                    </motion.button>
                </div>
            </form>
        </Modal>
    )
}
