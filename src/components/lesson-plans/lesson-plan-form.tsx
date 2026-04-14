'use client'

import { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/modal'
import { Loader2, UploadCloud, Link as LinkIcon, X, Sparkles } from 'lucide-react'
import type { Database } from '@/lib/types/database'
import { cn } from '@/lib/utils'
import { useAssignments } from '@/hooks/use-assignments' // For linking assignments
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

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

    // UseRefs and flags
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [uploadingFile, setUploadingFile] = useState(false)
    const [generatingAI, setGeneratingAI] = useState(false)

    // To link assignments
    const [selectedAssignments, setSelectedAssignments] = useState<string[]>([])
    const { assignments, loading: loadingAssignments, fetchAssignments } = useAssignments(courseId)

    useEffect(() => {
        if (isOpen && courseId) {
            fetchAssignments()
        }
    }, [isOpen, courseId, fetchAssignments])

    // En escenario de edición, cargar las vinculaciones de TPs existentes.
    useEffect(() => {
        if (isOpen && initialData?.id) {
            const fetchLinks = async () => {
                const supabase = createClient()
                const { data } = await supabase
                    .from('lesson_plan_assignments')
                    .select('assignment_id')
                    .eq('lesson_plan_id', initialData.id)
                
                if (data) {
                    setSelectedAssignments(data.map(d => d.assignment_id))
                }
            }
            fetchLinks()
        } else if (isOpen && !initialData) {
            setSelectedAssignments([])
        }
    }, [isOpen, initialData])

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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingFile(true)
        const supabase = createClient()
        
        // Clean name and create path (timestamp + safe name)
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
        const filePath = `${courseId}/${fileName}`

        const { error, data } = await supabase.storage
            .from('lesson_attachments')
            .upload(filePath, file)

        if (error) {
            toast.error('Error al subir el archivo', { description: error.message })
        } else if (data) {
            // Get public URL
            const { data: publicData } = supabase.storage.from('lesson_attachments').getPublicUrl(filePath)
            
            setFormData(prev => ({
                ...prev,
                attachment_urls: [...(prev.attachment_urls || []), publicData.publicUrl]
            }))
            toast.success('Archivo subido exitosamente')
        }

        setUploadingFile(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const removeAttachment = (urlToRemove: string) => {
        // En una app más avanzada, podríamos querer borrar el objeto de storage también
        setFormData(prev => ({
            ...prev,
            attachment_urls: prev.attachment_urls.filter((url: string) => url !== urlToRemove)
        }))
    }

    const handleGenerateAI = async () => {
        if (!formData.title.trim()) {
            toast.error('Por favor ingresa un Título primero para que la IA sepa de qué generar la clase.')
            return
        }

        setGeneratingAI(true)
        const loadingToast = toast.loading('Generando planificación con Gemini AI...')

        try {
            const res = await fetch('/api/ai/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: formData.title, type: formData.type })
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Error de servidores de IA')
            }

            const data = await res.json()
            setFormData(prev => ({ ...prev, content: data.html }))
            toast.success('¡Planificación generada con éxito!', { id: loadingToast })
        } catch (error: any) {
            console.error(error)
            toast.error(`Error: ${error.message}`, { id: loadingToast })
        } finally {
            setGeneratingAI(false)
        }
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
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-text-secondary">
                                Título *
                            </label>
                            <button
                                type="button"
                                onClick={handleGenerateAI}
                                disabled={generatingAI}
                                className={cn(
                                    "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md transition-all active:scale-95",
                                    generatingAI 
                                        ? "bg-primary-100 text-primary-400 cursor-wait dark:bg-primary-900/30" 
                                        : "bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-900/40 dark:hover:bg-primary-900/60 shadow-sm border border-primary-200/50 dark:border-primary-800/50"
                                )}
                                title="Autocompletar contenido con Inteligencia Artificial"
                            >
                                {generatingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-primary-500" />}
                                {generatingAI ? "Pensando..." : "Copiloto IA"}
                            </button>
                        </div>
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

                {/* Content (Rich Text Editor) */}
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                        Contenido / Descripción
                    </label>
                    <RichTextEditor
                        value={formData.content}
                        onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                        placeholder="Desarrollo de la planificación, objetivos, saberes..."
                    />
                </div>

                {/* File Upload */}
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                        Archivos Adjuntos (PDF, Word, Imágenes, etc.)
                    </label>
                    
                    {/* Upload Dropzone */}
                    <div 
                        onClick={() => !uploadingFile && fileInputRef.current?.click()}
                        className={cn("border border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center bg-surface-secondary/50 transition-colors group", uploadingFile ? "opacity-70 cursor-wait" : "hover:bg-surface-secondary cursor-pointer")}
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            className="hidden" 
                        />
                        {uploadingFile ? (
                            <>
                                <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-2" />
                                <p className="text-sm font-medium text-text-primary">Subiendo al servidor...</p>
                            </>
                        ) : (
                            <>
                                <UploadCloud className="w-8 h-8 text-text-muted group-hover:text-primary-500 transition-colors mb-2" />
                                <p className="text-sm font-medium text-text-primary">Clic para explorar y adjuntar</p>
                                <p className="text-xs text-text-muted mt-1">Soporta PDF, DOCX, ZIP e imágenes</p>
                            </>
                        )}
                    </div>

                    {/* Attached files list */}
                    {formData.attachment_urls && formData.attachment_urls.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {formData.attachment_urls.map((url: string, idx: number) => {
                                const urlParts = url.split('/')
                                const rawName = urlParts[urlParts.length - 1]
                                const displayFileName = decodeURIComponent(rawName).replace(/^\d+_/, '')
                                
                                return (
                                    <div key={idx} className="flex items-center justify-between p-2.5 bg-surface border border-border rounded-lg animate-fade-in shadow-sm">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-8 h-8 rounded bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0 text-primary-600">
                                                <LinkIcon className="w-4 h-4" />
                                            </div>
                                            <a href={url} target="_blank" rel="noreferrer" className="text-sm text-text-primary font-medium truncate hover:text-primary-600 transition-colors" title={displayFileName}>
                                                {displayFileName}
                                            </a>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => removeAttachment(url)}
                                            className="p-1.5 text-text-muted hover:bg-red-50 hover:text-red-600 rounded-md transition-colors ml-2"
                                            title="Remover archivo"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Link Assignments */}
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
