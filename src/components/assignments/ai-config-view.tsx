'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
    BookOpen,
    CloudUpload,
    FileText,
    Image as ImageIcon,
    ClipboardList,
    Ruler,
    Plus,
    Wand2,
    ChevronRight,
    Loader2,
    Trash2,
    CheckCircle,
    Sparkles,
    Zap,
    X,
    File
} from 'lucide-react'
import type { Assignment } from '@/hooks/use-assignments'
import { createClient } from '@/lib/supabase/client'
import { uploadFile, getFileUrl, deleteFile } from '@/lib/supabase/storage'
import { cn } from '@/lib/utils'

interface AiConfigViewProps {
    courseId: string
    assignment: Assignment
}

interface Criterion {
    id: string
    name: string
    weight: string
}

interface UploadedFile {
    id: string // reference material id in DB
    name: string
    url: string
    storagePath: string
}

type Step = 'config' | 'generating' | 'ready'

export function AiConfigView({ courseId, assignment }: AiConfigViewProps) {
    const router = useRouter()

    // State
    const [instructions, setInstructions] = useState(assignment.description || '')
    const [criteriaList, setCriteriaList] = useState<Criterion[]>([
        { id: crypto.randomUUID(), name: 'Claridad de Conceptos', weight: '30%' },
        { id: crypto.randomUUID(), name: 'Argumentación Crítica', weight: '40%' },
        { id: crypto.randomUUID(), name: 'Ortografía y Gramática', weight: '30%' },
    ])
    const [step, setStep] = useState<Step>('config')
    const [digest, setDigest] = useState<string | null>(null)
    const [keyTopics, setKeyTopics] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)
    const [loadingExisting, setLoadingExisting] = useState(true)
    const [submissionCount, setSubmissionCount] = useState(0)
    const [isCorrectingBatch, setIsCorrectingBatch] = useState(false)
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const [isDragOver, setIsDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Load existing materials and submission count on mount
    useEffect(() => {
        const loadExisting = async () => {
            const supabase = createClient()

            // Fetch assignment to get the digest
            const { data: assignmentData } = await supabase
                .from('assignments')
                .select('digest')
                .eq('id', assignment.id)
                .single()

            if (assignmentData?.digest) {
                setDigest(assignmentData.digest)
            }

            // Fetch existing reference materials
            const { data: materials } = await supabase
                .from('assignment_reference_materials')
                .select('*')
                .eq('assignment_id', assignment.id)

            if (materials && materials.length > 0) {
                // Load instructions
                const instructionsMaterial = materials.find(m => m.material_type === 'instructions')
                if (instructionsMaterial) {
                    setInstructions(instructionsMaterial.content_text || '')
                }

                // Load criteria
                const criteriaMaterial = materials.find(m => m.material_type === 'evaluation_criteria')
                if (criteriaMaterial && criteriaMaterial.content_text) {
                    try {
                        const parsed = JSON.parse(criteriaMaterial.content_text)
                        if (Array.isArray(parsed)) {
                            setCriteriaList(parsed.map((c: any) => ({
                                id: c.id || crypto.randomUUID(),
                                name: c.name,
                                weight: c.weight,
                            })))
                        }
                    } catch { /* keep defaults */ }
                }

                // Load existing uploaded files (reading_material with file_url)
                const fileMaterials = materials.filter(m => m.material_type === 'reading_material' && m.file_url)
                if (fileMaterials.length > 0) {
                    setUploadedFiles(fileMaterials.map(m => ({
                        id: m.id,
                        name: m.title,
                        url: m.file_url!,
                        storagePath: m.file_url!.split('/assignments/')[1] || '',
                    })))
                }

                // Check if digest was already generated (topics field populated)
                const readingMaterial = materials.find(m => m.material_type === 'reading_material')
                if (readingMaterial?.topics && readingMaterial.topics.length > 0) {
                    setKeyTopics(readingMaterial.topics)
                    // If we have topics but no digest in state yet (fallback for older records)
                    if (!digest && readingMaterial.content_text) {
                        setDigest(readingMaterial.content_text)
                    }
                    setStep('ready')
                }
            }

            // Count pending submissions
            const { count } = await supabase
                .from('assignment_submissions')
                .select('id', { count: 'exact', head: true })
                .eq('assignment_id', assignment.id)
                .eq('status', 'entregado')

            setSubmissionCount(count || 0)

            setLoadingExisting(false)
        }

        loadExisting()
    }, [assignment.id])

    // --- File upload handlers ---
    const handleFiles = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return
        setIsUploading(true)
        setError(null)

        try {
            const supabase = createClient()

            for (const file of Array.from(files)) {
                // Validate type
                const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
                if (!allowed.includes(file.type)) {
                    setError(`Formato no soportado: ${file.name}. Usa PDF, JPG, PNG o WebP.`)
                    continue
                }

                // Validate size (max 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    setError(`Archivo muy grande: ${file.name}. Máximo 10MB.`)
                    continue
                }

                // Upload to storage
                const ext = file.name.split('.').pop() || 'pdf'
                const storagePath = `${assignment.id}/ref_${Date.now()}.${ext}`
                await uploadFile('assignments', storagePath, file)

                // Get public URL
                const publicUrl = getFileUrl('assignments', storagePath)

                // Save as reading_material in DB
                const { data: inserted, error: insertErr } = await supabase
                    .from('assignment_reference_materials')
                    .insert({
                        assignment_id: assignment.id,
                        material_type: 'reading_material',
                        title: file.name,
                        file_url: publicUrl,
                    })
                    .select('id')
                    .single()

                if (insertErr) throw insertErr

                setUploadedFiles(prev => [...prev, {
                    id: inserted.id,
                    name: file.name,
                    url: publicUrl,
                    storagePath,
                }])
            }
        } catch (err: any) {
            console.error('Upload error:', err)
            setError(err.message || 'Error al subir el archivo')
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }, [assignment.id])

    const handleRemoveFile = async (file: UploadedFile) => {
        try {
            const supabase = createClient()
            // Delete from storage
            if (file.storagePath) {
                await deleteFile('assignments', [file.storagePath]).catch(() => { })
            }
            // Delete from DB
            await supabase.from('assignment_reference_materials').delete().eq('id', file.id)
            setUploadedFiles(prev => prev.filter(f => f.id !== file.id))
        } catch (err: any) {
            setError(err.message || 'Error al eliminar el archivo')
        }
    }

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
        handleFiles(e.dataTransfer.files)
    }, [handleFiles])

    // --- Criteria handlers ---
    const handleAddCriterion = () => {
        setCriteriaList([...criteriaList, { id: crypto.randomUUID(), name: 'Nuevo Criterio', weight: '10%' }])
    }

    const handleRemoveCriterion = (id: string) => {
        if (criteriaList.length <= 1) return
        setCriteriaList(criteriaList.filter(c => c.id !== id))
    }

    const handleGenerateKey = async () => {
        setStep('generating')
        setError(null)

        try {
            const supabase = createClient()

            // 1. Upsert instructions as reference material
            const { data: existingInstructions } = await supabase
                .from('assignment_reference_materials')
                .select('id')
                .eq('assignment_id', assignment.id)
                .eq('material_type', 'instructions')
                .maybeSingle()

            if (existingInstructions) {
                await supabase
                    .from('assignment_reference_materials')
                    .update({ content_text: instructions, title: 'Consignas del Trabajo' })
                    .eq('id', existingInstructions.id)
            } else {
                await supabase
                    .from('assignment_reference_materials')
                    .insert({
                        assignment_id: assignment.id,
                        material_type: 'instructions',
                        title: 'Consignas del Trabajo',
                        content_text: instructions,
                    })
            }

            // 2. Upsert criteria as reference material
            const criteriaText = JSON.stringify(criteriaList)
            const criteriaReadable = criteriaList.map(c => `- ${c.name} (${c.weight})`).join('\n')

            const { data: existingCriteria } = await supabase
                .from('assignment_reference_materials')
                .select('id')
                .eq('assignment_id', assignment.id)
                .eq('material_type', 'evaluation_criteria')
                .maybeSingle()

            if (existingCriteria) {
                await supabase
                    .from('assignment_reference_materials')
                    .update({ content_text: criteriaText, title: 'Criterios de Evaluación' })
                    .eq('id', existingCriteria.id)
            } else {
                await supabase
                    .from('assignment_reference_materials')
                    .insert({
                        assignment_id: assignment.id,
                        material_type: 'evaluation_criteria',
                        title: 'Criterios de Evaluación',
                        content_text: criteriaText,
                    })
            }

            // 3. Ensure there's a reading_material entry (use instructions as content if none exists)
            const { data: existingReading } = await supabase
                .from('assignment_reference_materials')
                .select('id')
                .eq('assignment_id', assignment.id)
                .eq('material_type', 'reading_material')
                .maybeSingle()

            if (!existingReading) {
                await supabase
                    .from('assignment_reference_materials')
                    .insert({
                        assignment_id: assignment.id,
                        material_type: 'reading_material',
                        title: 'Material Base',
                        content_text: `Consignas:\n${instructions}\n\nCriterios de Evaluación:\n${criteriaReadable}`,
                    })
            }

            // 4. Call the pre-digest API
            const response = await fetch('/api/ai/pre-digest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignment_id: assignment.id }),
            })

            if (!response.ok) {
                let errorMessage = 'Error al generar el digest'
                try {
                    const errorData = await response.json()
                    errorMessage = errorData.error || errorMessage
                } catch (e) {
                    const rawText = await response.text().catch(() => '')
                    if (rawText.includes('<html')) {
                        errorMessage = `Error del servidor (${response.status}). Intente nuevamente.`
                    } else if (rawText) {
                        errorMessage = rawText.slice(0, 100)
                    }
                }
                throw new Error(errorMessage)
            }


            const result = await response.json()
            setDigest(result.digest)
            setKeyTopics(result.key_topics || [])
            setStep('ready')

        } catch (err: any) {
            console.error('Error generating digest:', err)
            setError(err.message || 'Error inesperado al generar la clave de corrección')
            setStep('config')
        }
    }

    const handleLaunchCorrection = async () => {
        if (!digest || submissionCount === 0) return

        setIsCorrectingBatch(true)
        setError(null)

        try {
            const response = await fetch('/api/ai/correct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assignment_id: assignment.id,
                    digest: digest,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Error en la corrección batch')
            }

            const result = await response.json()

            // Navigate to AI Studio to review results
            router.push(`/cursos/${courseId}/trabajos/${assignment.id}/ai-studio`)

        } catch (err: any) {
            console.error('Batch correction error:', err)
            setError(err.message || 'Error al lanzar la corrección automática')
            setIsCorrectingBatch(false)
        }
    }

    if (loadingExisting) {
        return (
            <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
                <p className="text-text-secondary font-medium">Cargando configuración...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col max-w-5xl mx-auto w-full gap-8 animate-fade-in pb-12">
            {/* Header Section */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-text-secondary text-sm font-medium">
                    <button
                        onClick={() => router.push(`/cursos/${courseId}/trabajos`)}
                        className="hover:text-primary-600 transition-colors"
                    >
                        Trabajos Prácticos
                    </button>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-text-primary text-ellipsis overflow-hidden whitespace-nowrap max-w-[200px]">
                        {assignment.title}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-text-primary">Configuración IA</span>
                </div>
                <div className="flex flex-wrap justify-between items-center gap-4 mt-2">
                    <h1 className="text-3xl md:text-4xl font-black text-text-primary leading-tight tracking-tight">
                        Configurar Corrección Asistida
                    </h1>
                    <button
                        onClick={() => router.push(`/cursos/${courseId}/trabajos`)}
                        className="flex items-center justify-center rounded-xl h-10 px-6 bg-surface-secondary text-text-primary text-sm font-bold hover:bg-surface-hover transition-colors"
                    >
                        Volver
                    </button>
                </div>
                <p className="text-text-secondary">
                    Define el material base, consignas y rúbrica para generar el cerebro evaluador de este trabajo.
                </p>
            </div>

            {/* Error display */}
            {error && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl p-4 flex items-start gap-3 animate-slide-up">
                    <span className="text-rose-600 mt-0.5">⚠</span>
                    <div>
                        <p className="text-sm font-medium text-rose-800 dark:text-rose-400">{error}</p>
                        <button onClick={() => setError(null)} className="text-xs text-rose-600 hover:underline mt-1">Cerrar</button>
                    </div>
                </div>
            )}

            {/* Step: Config */}
            {step === 'config' && (
                <div className="grid grid-cols-1 gap-8">
                    {/* Upload Section */}
                    <section className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <BookOpen className="w-6 h-6 text-primary-600" />
                            <h2 className="text-xl font-bold text-text-primary">Material de Referencia</h2>
                        </div>

                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            multiple
                            className="hidden"
                            onChange={(e) => handleFiles(e.target.files)}
                        />

                        {/* Drop zone */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={cn(
                                "flex flex-col items-center gap-4 rounded-xl border-2 border-dashed px-6 py-10 transition-all cursor-pointer group",
                                isDragOver
                                    ? "border-primary-500 bg-primary-50/50 dark:bg-primary-950/20 scale-[1.01]"
                                    : "border-border bg-surface-secondary/50 hover:border-primary-500/50"
                            )}
                        >
                            <div className={cn(
                                "p-4 rounded-full transition-transform",
                                isDragOver
                                    ? "bg-primary-100 dark:bg-primary-900/50 scale-110"
                                    : "bg-primary-50 dark:bg-primary-950/30 group-hover:scale-110"
                            )}>
                                {isUploading ? (
                                    <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
                                ) : (
                                    <CloudUpload className="w-10 h-10 text-primary-600" />
                                )}
                            </div>
                            <div className="flex flex-col items-center text-center">
                                <p className="text-lg font-bold text-text-primary">
                                    {isUploading ? 'Subiendo...' : 'Subir Material (PDF o Imagen)'}
                                </p>
                                <p className="text-sm text-text-secondary mt-1">
                                    {isDragOver ? '¡Soltá el archivo aquí!' : 'Arrastrá y soltá, o hacé click para examinar'}
                                </p>
                            </div>
                            <div className="flex gap-4 mt-1">
                                <div className="flex items-center gap-1.5 text-xs text-text-muted bg-surface px-2.5 py-1.5 rounded-lg border border-border">
                                    <FileText className="w-4 h-4 text-rose-500" /> PDF
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-text-muted bg-surface px-2.5 py-1.5 rounded-lg border border-border">
                                    <ImageIcon className="w-4 h-4 text-emerald-500" /> JPG / PNG
                                </div>
                            </div>
                        </div>

                        {/* Uploaded files list */}
                        {uploadedFiles.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                                    {uploadedFiles.length} archivo{uploadedFiles.length > 1 ? 's' : ''} subido{uploadedFiles.length > 1 ? 's' : ''}
                                </p>
                                {uploadedFiles.map(file => (
                                    <div key={file.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-secondary/50 border border-border group/file">
                                        <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center shrink-0">
                                            {file.name.endsWith('.pdf')
                                                ? <FileText className="w-5 h-5 text-rose-500" />
                                                : <ImageIcon className="w-5 h-5 text-emerald-500" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
                                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary-600 hover:underline">
                                                Ver archivo ↗
                                            </a>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRemoveFile(file) }}
                                            className="p-1.5 text-text-muted hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg opacity-0 group-hover/file:opacity-100 transition-all"
                                            title="Eliminar archivo"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Content Details Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Card A: Consignas */}
                        <section className="bg-surface p-6 rounded-2xl border border-border shadow-sm flex flex-col h-full">
                            <div className="flex items-center gap-2 mb-4">
                                <ClipboardList className="w-6 h-6 text-primary-600" />
                                <h2 className="text-xl font-bold text-text-primary">Consignas del Trabajo</h2>
                            </div>
                            <p className="text-sm text-text-secondary mb-4">
                                Describe detalladamente las instrucciones que los alumnos debieron seguir.
                            </p>
                            <textarea
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                                className="flex-1 w-full min-h-[200px] rounded-xl border border-border bg-surface-secondary/50 p-4 text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none resize-y"
                                placeholder="Ej: Leer el texto XYZ y responder las 3 preguntas finales justificando con citas..."
                            />
                        </section>

                        {/* Card B: Criterios */}
                        <section className="bg-surface p-6 rounded-2xl border border-border shadow-sm flex flex-col h-full">
                            <div className="flex items-center gap-2 mb-4">
                                <Ruler className="w-6 h-6 text-primary-600" />
                                <h2 className="text-xl font-bold text-text-primary">Rúbrica de Evaluación</h2>
                            </div>
                            <p className="text-sm text-text-secondary mb-4">
                                Define los parámetros que la IA utilizará para calificar.
                            </p>
                            <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                {criteriaList.map((criterion, idx) => (
                                    <div key={criterion.id} className="p-3 rounded-xl bg-surface-secondary/50 border border-border flex items-center justify-between group">
                                        <input
                                            type="text"
                                            value={criterion.name}
                                            onChange={(e) => {
                                                const newList = [...criteriaList]
                                                newList[idx].name = e.target.value
                                                setCriteriaList(newList)
                                            }}
                                            className="bg-transparent border-none focus:ring-0 text-sm font-medium text-text-primary w-full p-0"
                                        />
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={criterion.weight}
                                                onChange={(e) => {
                                                    const newList = [...criteriaList]
                                                    newList[idx].weight = e.target.value
                                                    setCriteriaList(newList)
                                                }}
                                                className="w-16 text-right text-xs bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400 px-2 py-1 rounded-full font-bold border-none focus:ring-0"
                                            />
                                            <button
                                                onClick={() => handleRemoveCriterion(criterion.id)}
                                                className="p-1 text-text-muted hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                                title="Eliminar criterio"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={handleAddCriterion}
                                    className="w-full mt-2 flex items-center justify-center gap-2 border-2 border-dashed border-border p-3 rounded-xl text-text-secondary text-sm font-medium hover:border-primary-500/40 hover:text-primary-600 transition-all"
                                >
                                    <Plus className="w-5 h-5" />
                                    Añadir Criterio
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            )}

            {/* Step: Generating */}
            {step === 'generating' && (
                <div className="flex flex-col items-center justify-center py-16 bg-surface rounded-2xl border border-border animate-fade-in">
                    <div className="relative mb-6">
                        <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-950/30 flex items-center justify-center">
                            <Sparkles className="w-10 h-10 text-primary-600 animate-pulse" />
                        </div>
                        <Loader2 className="w-24 h-24 text-primary-400 animate-spin absolute -top-2 -left-2" />
                    </div>
                    <h3 className="text-xl font-bold text-text-primary mb-2">Sintetizando Digest IA…</h3>
                    <p className="text-text-secondary text-sm max-w-md text-center">
                        Gemini está analizando el material de referencia, consignas y criterios para construir la clave de corrección inteligente.
                    </p>
                    <div className="mt-6 flex items-center gap-2 text-xs text-text-muted">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Esto puede tardar 10-30 segundos…
                    </div>
                </div>
            )}

            {/* Step: Ready */}
            {step === 'ready' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Success banner */}
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                                <CheckCircle className="w-7 h-7 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-400 mb-1">
                                    ¡Clave de Corrección Generada!
                                </h3>
                                <p className="text-sm text-emerald-700 dark:text-emerald-500">
                                    El cerebro evaluador está listo. Los siguientes temas fueron identificados como centrales:
                                </p>
                                {keyTopics.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {keyTopics.map((topic, i) => (
                                            <span key={i} className="text-xs bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full font-medium">
                                                {topic}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Submissions status */}
                    <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-text-primary flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-amber-500" />
                                    Entregas Pendientes
                                </h4>
                                <p className="text-sm text-text-secondary mt-1">
                                    {submissionCount > 0
                                        ? `Hay ${submissionCount} entrega${submissionCount > 1 ? 's' : ''} lista${submissionCount > 1 ? 's' : ''} para corregir con IA.`
                                        : 'No hay entregas pendientes. Los alumnos aún no entregaron este trabajo.'
                                    }
                                </p>
                            </div>
                            <div className="text-3xl font-black text-primary-600">{submissionCount}</div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                        <button
                            onClick={() => { setStep('config'); setDigest(null) }}
                            className="flex items-center justify-center gap-2 rounded-xl h-12 px-6 bg-surface-secondary text-text-primary text-sm font-bold hover:bg-surface-hover transition-colors"
                        >
                            Reconfigurar
                        </button>

                        {submissionCount > 0 && (
                            <button
                                onClick={handleLaunchCorrection}
                                disabled={isCorrectingBatch}
                                className="flex items-center justify-center gap-3 rounded-xl h-12 px-8 bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/25 disabled:opacity-70"
                            >
                                {isCorrectingBatch ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Corrigiendo {submissionCount} entregas…
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-5 h-5" />
                                        Lanzar Corrección IA ({submissionCount})
                                    </>
                                )}
                            </button>
                        )}

                        <button
                            onClick={() => router.push(`/cursos/${courseId}/trabajos/${assignment.id}/ai-studio`)}
                            className="flex items-center justify-center gap-2 rounded-xl h-12 px-6 border-2 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-400 text-sm font-bold hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-all"
                        >
                            Ir al Estudio IA
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Primary Action Button (only in config step) */}
            {step === 'config' && (
                <div className="flex justify-center pt-8">
                    <button
                        onClick={handleGenerateKey}
                        disabled={!instructions.trim()}
                        className="flex items-center justify-center gap-3 rounded-2xl h-14 md:h-16 px-8 md:px-12 bg-primary-600 text-white text-base md:text-lg font-black hover:bg-primary-700 transition-all shadow-xl shadow-primary-600/30 disabled:opacity-50 disabled:hover:bg-primary-600 disabled:transform-none transform hover:-translate-y-1"
                    >
                        <Wand2 className="w-6 h-6" />
                        Generar Clave de Corrección
                    </button>
                </div>
            )}
        </div>
    )
}
