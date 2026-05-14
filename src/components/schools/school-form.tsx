'use client'
 
import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Loader2, Building2, MapPin, Phone, GraduationCap, Clock } from 'lucide-react'
import { SCHOOL_LEVEL_LABELS, SCHOOL_SHIFT_LABELS } from '@/lib/constants'
import { motion } from 'framer-motion'
 
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
            title={initialData ? "Editar Institución" : "Nueva Institución"}
        >
            <form onSubmit={handleSubmit} className="space-y-8 p-2">
                <div className="space-y-6">
                    {/* Nombre */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                            Nombre de la Escuela
                        </label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary-500 transition-colors">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Ej: Escuela Técnica N° 1"
                                className="w-full pl-12 pr-6 py-4 bg-surface-secondary/50 border border-white/5 rounded-[1.5rem] focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/50 outline-none transition-all font-bold text-text-primary"
                            />
                        </div>
                    </div>
 
                    {/* Nivel y Turno */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                                Nivel Educativo
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                                    <GraduationCap className="w-5 h-5" />
                                </div>
                                <select
                                    name="level"
                                    required
                                    value={formData.level}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-6 py-4 bg-surface-secondary/50 border border-white/5 rounded-[1.5rem] focus:ring-2 focus:ring-primary-500/20 outline-none appearance-none font-bold text-text-primary cursor-pointer"
                                >
                                    {Object.entries(SCHOOL_LEVEL_LABELS).map(([val, label]) => (
                                        <option key={val} value={val} className="bg-surface-secondary">{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                                Turno Habitual
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <select
                                    name="shift"
                                    required
                                    value={formData.shift}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-6 py-4 bg-surface-secondary/50 border border-white/5 rounded-[1.5rem] focus:ring-2 focus:ring-primary-500/20 outline-none appearance-none font-bold text-text-primary cursor-pointer"
                                >
                                    {Object.entries(SCHOOL_SHIFT_LABELS).map(([val, label]) => (
                                        <option key={val} value={val} className="bg-surface-secondary">{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
 
                    {/* Dirección */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                            Ubicación
                        </label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                placeholder="Calle, Número, Localidad"
                                className="w-full pl-12 pr-6 py-4 bg-surface-secondary/50 border border-white/5 rounded-[1.5rem] outline-none font-bold text-text-primary"
                            />
                        </div>
                    </div>
 
                    {/* Teléfono */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                            Contacto
                        </label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                                <Phone className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="Teléfono de la institución"
                                className="w-full pl-12 pr-6 py-4 bg-surface-secondary/50 border border-white/5 rounded-[1.5rem] outline-none font-bold text-text-primary"
                            />
                        </div>
                    </div>
                </div>
 
                <div className="pt-6 flex flex-col sm:flex-row justify-end gap-4 border-t border-white/5">
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
                        className="group relative flex items-center justify-center gap-3 px-10 py-4 bg-primary-600 text-white rounded-[1.5rem] font-black transition-all hover:bg-primary-700 shadow-xl shadow-primary-600/20 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Building2 className="w-5 h-5" />
                        )}
                        {initialData ? "Guardar Cambios" : "Confirmar Escuela"}
                    </motion.button>
                </div>
            </form>
        </Modal>
    )
}
