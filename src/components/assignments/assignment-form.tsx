'use client'

import { useState, useRef, useCallback } from 'react'
import { Modal } from '@/components/ui/modal'
import { Loader2, Plus, X, Upload, FileText, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import type { Database } from '@/lib/types/database'
import { PREDEFINED_CRITERIA } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

type InsertAssignment = Database['public']['Tables']['assignments']['Insert']
type AssignmentType = Database['public']['Enums']['assignment_type']

export interface EvaluationCriterion {
    name: string
    weight: number
}

export interface ReferenceMaterial {
    type: 'file' | 'text'
    title: string
    content?: string     // for text
    file?: File          // for file upload
    fileUrl?: string     // after upload
}

interface AssignmentFormProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: any, criteria: EvaluationCriterion[], materials: ReferenceMaterial[]) => Promise<boolean>
    initialData?: any
    courseId: string
}

const ASSIGNMENT_TYPES = [
    { value: 'tp', label: 'Trabajo Práctico' },
    { value: 'evaluacion', label: 'Evaluación / Examen' },
    { value: 'actividad', label: 'Actividad en clase' },
    { value: 'exposicion_oral', label: 'Exposición Oral' },
    { value: 'investigacion', label: 'Investigación' },
    { value: 'autoevaluacion', label: 'Autoevaluación' },
]

export function AssignmentForm({ isOpen, onClose, onSubmit, initialData, courseId }: AssignmentFormProps) {
    const [loading, setLoading] = useState(false)
    const [activeSection, setActiveSection] = useState<'info' | 'criteria' | 'materials'>('info')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)

    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        type: (initialData?.type as AssignmentType) || 'tp',
        due_date: initialData?.due_date ? initialData.due_date.split('T')[0] : '',
    })

    // Criteria state
    const [selectedCriteria, setSelectedCriteria] = useState<EvaluationCriterion[]>(
        initialData?.criteria || []
    )
    const [newCriterionName, setNewCriterionName] = useState('')
    const [newCriterionWeight, setNewCriterionWeight] = useState(20)

    // Materials state
    const [materials, setMaterials] = useState<ReferenceMaterial[]>([])
    const [showTextInput, setShowTextInput] = useState(false)
    const [textTitle, setTextTitle] = useState('')
    const [textContent, setTextContent] = useState('')

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    // --- Criteria logic ---
    const togglePredefinedCriterion = (name: string, defaultWeight: number) => {
        const exists = selectedCriteria.find(c => c.name === name)
        if (exists) {
            setSelectedCriteria(prev => prev.filter(c => c.name !== name))
        } else {
            setSelectedCriteria(prev => [...prev, { name, weight: defaultWeight }])
        }
    }

    const addCustomCriterion = () => {
        if (!newCriterionName.trim()) return
        if (selectedCriteria.find(c => c.name === newCriterionName.trim())) {
            toast.error('Ya existe un criterio con ese nombre')
            return
        }
        setSelectedCriteria(prev => [...prev, { name: newCriterionName.trim(), weight: newCriterionWeight }])
        setNewCriterionName('')
        setNewCriterionWeight(20)
    }

    const updateCriterionWeight = (name: string, weight: number) => {
        setSelectedCriteria(prev => prev.map(c => c.name === name ? { ...c, weight } : c))
    }

    const removeCriterion = (name: string) => {
        setSelectedCriteria(prev => prev.filter(c => c.name !== name))
    }

    const totalWeight = selectedCriteria.reduce((sum, c) => sum + c.weight, 0)

    // --- Materials logic ---
    const handleFileDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const files = Array.from(e.dataTransfer.files).filter(f =>
            f.type === 'application/pdf' ||
            f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            f.name.endsWith('.docx')
        )
        files.forEach(file => {
            setMaterials(prev => [...prev, { type: 'file', title: file.name, file }])
        })
    }, [])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return
        Array.from(e.target.files).forEach(file => {
            setMaterials(prev => [...prev, { type: 'file', title: file.name, file }])
        })
        e.target.value = ''
    }

    const addTextMaterial = () => {
        if (!textContent.trim()) return
        setMaterials(prev => [...prev, {
            type: 'text',
            title: textTitle.trim() || 'Material de texto',
            content: textContent.trim()
        }])
        setTextTitle('')
        setTextContent('')
        setShowTextInput(false)
    }

    const removeMaterial = (index: number) => {
        setMaterials(prev => prev.filter((_, i) => i !== index))
    }

    // --- Submit ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const payload: Partial<InsertAssignment> = {
            title: formData.title,
            description: formData.description,
            type: formData.type as AssignmentType,
            due_date: formData.due_date || null,
            course_id: courseId,
            status: initialData ? initialData.status : 'borrador'
        }

        const success = await onSubmit(payload, selectedCriteria, materials)
        if (success) onClose()

        setLoading(false)
    }

    const sections = [
        { id: 'info', label: '1. Información básica', icon: FileText },
        { id: 'criteria', label: '2. Criterios de evaluación', icon: ChevronDown },
        { id: 'materials', label: '3. Material de referencia', icon: BookOpen },
    ] as const

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Editar Trabajo" : "Nuevo Trabajo Práctico"}
            maxWidth="max-w-2xl"
        >
            {/* Section tabs */}
            <div className="flex gap-1 mb-6 bg-surface-secondary/50 rounded-xl p-1">
                {sections.map(s => (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => setActiveSection(s.id)}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                            activeSection === s.id
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'text-text-secondary hover:text-text-primary'
                        }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit}>

                {/* === SECTION 1: Basic Info === */}
                {activeSection === 'info' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Título *</label>
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
                                <label className="block text-sm font-medium text-text-secondary mb-1">Tipo de Trabajo</label>
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
                                <label className="block text-sm font-medium text-text-secondary mb-1">Fecha de Entrega</label>
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
                            <label className="block text-sm font-medium text-text-secondary mb-1">Consigna / Descripción</label>
                            <textarea
                                name="description"
                                rows={5}
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Describí detalladamente lo que los alumnos deben hacer, responder o investigar..."
                                className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y custom-scrollbar"
                            />
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setActiveSection('criteria')}
                                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Siguiente →
                            </button>
                        </div>
                    </div>
                )}

                {/* === SECTION 2: Criteria === */}
                {activeSection === 'criteria' && (
                    <div className="space-y-4">
                        <p className="text-sm text-text-secondary">
                            Seleccioná los criterios con los que la IA evaluará cada trabajo. Podés ajustar el peso de cada uno.
                        </p>

                        {/* Predefined chips */}
                        <div>
                            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Criterios frecuentes</label>
                            <div className="flex flex-wrap gap-2">
                                {PREDEFINED_CRITERIA.map(c => {
                                    const selected = selectedCriteria.find(s => s.name === c.name)
                                    return (
                                        <button
                                            key={c.name}
                                            type="button"
                                            onClick={() => togglePredefinedCriterion(c.name, c.defaultWeight)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                                selected
                                                    ? 'bg-primary-600 text-white border-primary-600'
                                                    : 'bg-surface border-border text-text-secondary hover:border-primary-400'
                                            }`}
                                        >
                                            {selected ? '✓ ' : '+ '}{c.name}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Custom criterion input */}
                        <div>
                            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Agregar criterio personalizado</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newCriterionName}
                                    onChange={e => setNewCriterionName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomCriterion())}
                                    placeholder="Nombre del criterio"
                                    className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                                <input
                                    type="number"
                                    value={newCriterionWeight}
                                    onChange={e => setNewCriterionWeight(Number(e.target.value))}
                                    min={1} max={100}
                                    className="w-20 px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                                <span className="flex items-center text-sm text-text-muted">%</span>
                                <button
                                    type="button"
                                    onClick={addCustomCriterion}
                                    className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Selected criteria list */}
                        {selectedCriteria.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Criterios seleccionados</label>
                                    <span className={`text-xs font-bold ${totalWeight === 100 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                        Total: {totalWeight}% {totalWeight !== 100 && '(debería sumar 100%)'}
                                    </span>
                                </div>
                                {selectedCriteria.map(c => (
                                    <div key={c.name} className="flex items-center gap-3 p-2.5 bg-surface border border-border rounded-lg">
                                        <span className="flex-1 text-sm text-text-primary">{c.name}</span>
                                        <input
                                            type="number"
                                            value={c.weight}
                                            onChange={e => updateCriterionWeight(c.name, Number(e.target.value))}
                                            min={1} max={100}
                                            className="w-16 px-2 py-1 bg-surface-secondary border border-border rounded text-sm text-center focus:ring-1 focus:ring-primary-500"
                                        />
                                        <span className="text-xs text-text-muted">%</span>
                                        <button
                                            type="button"
                                            onClick={() => removeCriterion(c.name)}
                                            className="p-1 text-text-muted hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {selectedCriteria.length === 0 && (
                            <p className="text-xs text-text-muted text-center py-3 border border-dashed border-border rounded-lg">
                                Seleccioná al menos un criterio para que la IA pueda evaluar mejor
                            </p>
                        )}

                        <div className="flex justify-between">
                            <button type="button" onClick={() => setActiveSection('info')} className="px-4 py-2 text-text-secondary hover:bg-surface-hover text-sm font-medium rounded-lg transition-colors">← Volver</button>
                            <button type="button" onClick={() => setActiveSection('materials')} className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors">Siguiente →</button>
                        </div>
                    </div>
                )}

                {/* === SECTION 3: Materials === */}
                {activeSection === 'materials' && (
                    <div className="space-y-4">
                        <p className="text-sm text-text-secondary">
                            Subí el material que los alumnos debían leer. La IA lo usará como referencia al corregir.
                        </p>

                        {/* Drop zone */}
                        <div
                            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleFileDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                                isDragging
                                    ? 'border-primary-500 bg-primary-500/10'
                                    : 'border-border hover:border-primary-400 hover:bg-surface-secondary/30'
                            }`}
                        >
                            <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />
                            <p className="text-sm font-medium text-text-primary">Arrastrá archivos o hacé clic</p>
                            <p className="text-xs text-text-muted mt-1">PDF o Word (.docx)</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                multiple
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </div>

                        {/* Paste text option */}
                        {!showTextInput ? (
                            <button
                                type="button"
                                onClick={() => setShowTextInput(true)}
                                className="w-full py-2.5 border border-dashed border-border rounded-xl text-sm text-text-secondary hover:border-primary-400 hover:text-primary-500 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Pegar texto directamente
                            </button>
                        ) : (
                            <div className="border border-border rounded-xl p-4 space-y-3">
                                <input
                                    type="text"
                                    value={textTitle}
                                    onChange={e => setTextTitle(e.target.value)}
                                    placeholder="Título del material (ej: Capítulo 3 del libro)"
                                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                                <textarea
                                    value={textContent}
                                    onChange={e => setTextContent(e.target.value)}
                                    rows={5}
                                    placeholder="Pegá el texto del material de referencia acá..."
                                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y custom-scrollbar"
                                />
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setShowTextInput(false)} className="px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover rounded-lg transition-colors">Cancelar</button>
                                    <button type="button" onClick={addTextMaterial} className="px-4 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors">Agregar texto</button>
                                </div>
                            </div>
                        )}

                        {/* Materials list */}
                        {materials.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Material agregado ({materials.length})</label>
                                {materials.map((m, i) => (
                                    <div key={i} className="flex items-center gap-3 p-2.5 bg-surface border border-border rounded-lg">
                                        <div className="w-8 h-8 rounded-lg bg-primary-600/10 flex items-center justify-center flex-shrink-0">
                                            {m.type === 'file' ? (
                                                <FileText className="w-4 h-4 text-primary-500" />
                                            ) : (
                                                <BookOpen className="w-4 h-4 text-primary-500" />
                                            )}
                                        </div>
                                        <span className="flex-1 text-sm text-text-primary truncate">{m.title}</span>
                                        <span className="text-xs text-text-muted">{m.type === 'file' ? 'Archivo' : 'Texto'}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeMaterial(i)}
                                            className="p-1 text-text-muted hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between pt-2 border-t border-border">
                            <button type="button" onClick={() => setActiveSection('criteria')} className="px-4 py-2 text-text-secondary hover:bg-surface-hover text-sm font-medium rounded-lg transition-colors">← Volver</button>
                            <button
                                type="submit"
                                disabled={loading || !formData.title}
                                className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-70 text-white font-medium rounded-lg transition-colors"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {initialData ? "Guardar Cambios" : "Crear Trabajo ✓"}
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </Modal>
    )
}
