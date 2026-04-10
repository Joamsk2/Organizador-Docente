'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    Info,
    ClipboardCheck,
    AlertTriangle,
    MessageSquare,
    Wand2,
    Loader2,
    Settings,
    ArrowRight
} from 'lucide-react'
import type { Assignment } from '@/hooks/use-assignments'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface AiStudioViewProps {
    courseId: string
    assignment: Assignment
}

interface CriterionScore {
    criterion_name: string
    achieved_score: number
    max_score: number
    feedback: string
}

interface DetectedError {
    error_type: string
    description: string
    severity: 'high' | 'medium' | 'low'
    related_topic: string
}

interface StudentCorrection {
    id: string // ai_corrections.id
    submission_id: string
    student_id: string
    first_name: string
    last_name: string
    suggested_grade: number
    final_grade: number
    status: string
    summary: string
    criteria_scores: CriterionScore[]
    detected_errors: DetectedError[]
    feedback: string
    improvement_suggestions: string
}

export function AiStudioView({ courseId, assignment }: AiStudioViewProps) {
    const router = useRouter()

    const [corrections, setCorrections] = useState<StudentCorrection[]>([])
    const [activeIndex, setActiveIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [approving, setApproving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    // Fetch real corrections from DB
    useEffect(() => {
        const fetchCorrections = async () => {
            const supabase = createClient()

            // Fetch corrections joined with submissions and students
            const { data, error: fetchError } = await supabase
                .from('ai_corrections')
                .select(`
                    id,
                    submission_id,
                    suggested_grade,
                    teacher_override_grade,
                    criteria_scores,
                    detected_errors,
                    student_feedback,
                    improvement_suggestions,
                    correction_summary,
                    status,
                    assignment_submissions!inner (
                        id,
                        student_id,
                        assignment_id,
                        students!inner (
                            id,
                            first_name,
                            last_name
                        )
                    )
                `)
                .eq('assignment_submissions.assignment_id', assignment.id)

            if (fetchError) {
                console.error('Error fetching corrections:', fetchError)
                setError('Error al cargar las correcciones')
                setLoading(false)
                return
            }

            if (data && data.length > 0) {
                const mapped: StudentCorrection[] = data.map((row: any) => {
                    const sub = row.assignment_submissions
                    const student = sub?.students

                    return {
                        id: row.id,
                        submission_id: row.submission_id,
                        student_id: student?.id || sub?.student_id || '',
                        first_name: student?.first_name || 'Alumno',
                        last_name: student?.last_name || 'Desconocido',
                        suggested_grade: row.suggested_grade || 0,
                        final_grade: row.teacher_override_grade || row.suggested_grade || 0,
                        status: row.status || 'corrected_by_ai',
                        summary: row.correction_summary || 'Sin resumen disponible.',
                        criteria_scores: Array.isArray(row.criteria_scores) ? row.criteria_scores : [],
                        detected_errors: Array.isArray(row.detected_errors) ? row.detected_errors : [],
                        feedback: row.student_feedback || '',
                        improvement_suggestions: row.improvement_suggestions || '',
                    }
                })

                setCorrections(mapped)
            }

            setLoading(false)
        }

        fetchCorrections()
    }, [assignment.id])

    const activeCorrection = corrections[activeIndex]

    const handleUpdateActiveGrade = (newGrade: string) => {
        const val = parseFloat(newGrade)
        if (isNaN(val)) return

        const updated = [...corrections]
        updated[activeIndex].final_grade = val
        setCorrections(updated)
    }

    const handleUpdateActiveFeedback = (newText: string) => {
        const updated = [...corrections]
        updated[activeIndex].feedback = newText
        setCorrections(updated)
    }

    const handleSaveSingle = async () => {
        if (!activeCorrection) return
        setSaving(true)

        try {
            const supabase = createClient()
            const { error: updateError } = await supabase
                .from('ai_corrections')
                .update({
                    teacher_override_grade: activeCorrection.final_grade,
                    student_feedback: activeCorrection.feedback,
                    status: 'reviewed',
                })
                .eq('id', activeCorrection.id)

            if (updateError) throw updateError

            const updated = [...corrections]
            updated[activeIndex].status = 'reviewed'
            setCorrections(updated)

            setSuccessMsg('Corrección guardada')
            setTimeout(() => setSuccessMsg(null), 2000)
        } catch (err: any) {
            setError(err.message || 'Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    const handleApproveBatch = async () => {
        setApproving(true)
        setError(null)

        try {
            const supabase = createClient()

            // Update all corrections as approved
            for (const corr of corrections) {
                await supabase
                    .from('ai_corrections')
                    .update({
                        status: 'approved',
                        teacher_override_grade: corr.final_grade,
                        student_feedback: corr.feedback,
                    })
                    .eq('id', corr.id)

                // Optionally update the submission status to 'corregido'
                await supabase
                    .from('assignment_submissions')
                    .update({ status: 'corregido' })
                    .eq('id', corr.submission_id)
            }

            setSuccessMsg('¡Lote aprobado! Notas enviadas.')
            setTimeout(() => {
                router.push(`/cursos/${courseId}/trabajos`)
            }, 1500)

        } catch (err: any) {
            setError(err.message || 'Error al aprobar el lote')
            setApproving(false)
        }
    }

    // Loading state
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full animate-fade-in">
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
                <p className="text-text-secondary font-medium">Cargando correcciones IA...</p>
            </div>
        )
    }

    // Empty state (no corrections found)
    if (corrections.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full animate-fade-in max-w-lg mx-auto text-center">
                <div className="w-20 h-20 rounded-full bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center mb-6">
                    <Wand2 className="w-10 h-10 text-primary-400" />
                </div>
                <h2 className="text-2xl font-bold text-text-primary mb-3">
                    Aún no hay correcciones IA
                </h2>
                <p className="text-text-secondary mb-8">
                    Para generar correcciones automáticas, primero configurá el material de referencia y la rúbrica, y luego lanzá la corrección batch.
                </p>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push(`/cursos/${courseId}/trabajos/${assignment.id}/ai-config`)}
                        className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/25"
                    >
                        <Settings className="w-5 h-5" />
                        Configurar IA
                    </button>
                    <button
                        onClick={() => router.push(`/cursos/${courseId}/trabajos`)}
                        className="flex items-center gap-2 px-6 py-3 bg-surface-secondary text-text-primary rounded-xl font-bold hover:bg-surface-hover transition-colors"
                    >
                        Volver
                    </button>
                </div>
            </div>
        )
    }

    const pendingCount = corrections.filter(c => c.status !== 'approved').length
    const approvedCount = corrections.filter(c => c.status === 'approved').length

    const errorSeverityLabel = (sev: string) => {
        switch (sev) {
            case 'high': return 'Crítico'
            case 'medium': return 'Moderado'
            case 'low': return 'Sugerencia'
            default: return sev
        }
    }

    return (
        <div className="flex h-[calc(100vh-140px)] flex-col md:flex-row overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            {/* LEFT PANEL: Student List */}
            <aside className="w-full md:w-80 border-r border-border bg-surface-secondary/30 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
                <div className="p-5 border-b border-border sticky top-0 bg-surface-secondary/95 backdrop-blur z-10">
                    <h3 className="font-bold text-text-primary">Lote de Corrección</h3>
                    <p className="text-xs text-text-secondary mt-1">
                        {corrections.length} correcciones • {approvedCount} aprobadas
                    </p>
                </div>

                <div className="flex flex-col">
                    {corrections.map((corr, idx) => (
                        <div
                            key={corr.id}
                            onClick={() => setActiveIndex(idx)}
                            className={cn(
                                "p-4 cursor-pointer border-l-4 transition-colors",
                                activeIndex === idx
                                    ? "bg-primary-50 dark:bg-primary-950/20 border-primary-600"
                                    : "hover:bg-surface-hover border-transparent"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-text-secondary">
                                    {corr.first_name[0]}{corr.last_name[0]}
                                </div>
                                <div className="flex-1">
                                    <p className={cn("text-sm font-semibold", activeIndex === idx ? "text-text-primary" : "text-text-secondary")}>
                                        {corr.last_name}, {corr.first_name}
                                    </p>
                                    <p className="text-xs font-bold text-primary-600">
                                        {corr.suggested_grade} / 10
                                    </p>
                                </div>
                                {corr.status === 'approved' ? (
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                ) : (
                                    <span className="size-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            {/* MAIN PANEL: Correction Detail */}
            <section className="flex-1 overflow-y-auto bg-surface p-6 md:p-8 custom-scrollbar relative">
                {activeCorrection && (
                    <div className="max-w-4xl mx-auto space-y-6 pb-20">

                        {/* Header Details */}
                        <div className="flex items-center justify-between pb-4 border-b border-border">
                            <div>
                                <nav className="flex items-center gap-2 text-xs text-text-muted mb-2 font-medium">
                                    <span className="text-primary-600">Estudio AI</span>
                                    <ChevronRight className="w-3 h-3" />
                                    <span>{assignment.title}</span>
                                </nav>
                                <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
                                    Revisión: {activeCorrection.first_name} {activeCorrection.last_name}
                                </h1>
                            </div>
                            <div className="flex items-center gap-4 bg-surface-secondary/50 p-3 rounded-xl border border-border">
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Nota IA Suggest</span>
                                    <span className="text-xl font-black text-text-secondary opacity-70">
                                        {activeCorrection.suggested_grade}
                                    </span>
                                </div>
                                <div className="w-px h-10 bg-border line-vertical"></div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-primary-600 uppercase font-bold tracking-wider mb-1">Nota Final</label>
                                    <input
                                        className="w-20 h-9 border-2 border-primary-200 dark:border-primary-900 bg-primary-50 dark:bg-primary-950/20 rounded-lg text-center font-bold text-primary-700 dark:text-primary-400 focus:ring-primary-500 focus:border-primary-500"
                                        type="number"
                                        step="0.1"
                                        min="1"
                                        max="10"
                                        value={activeCorrection.final_grade}
                                        onChange={(e) => handleUpdateActiveGrade(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Correction Summary Glass Box */}
                        <div className="bg-gradient-to-br from-primary-50 to-surface dark:from-primary-950/20 dark:to-surface p-6 rounded-2xl shadow-sm border border-primary-100 dark:border-primary-900/50 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 text-primary-900 dark:text-primary-100 mix-blend-overlay">
                                <Wand2 className="w-24 h-24" />
                            </div>
                            <h3 className="flex items-center gap-2 font-bold text-text-primary mb-3 text-lg">
                                <Wand2 className="w-5 h-5 text-primary-600" />
                                Resumen de la Corrección
                            </h3>
                            <p className="text-text-secondary leading-relaxed text-sm md:text-base relative z-10">
                                {activeCorrection.summary}
                            </p>
                        </div>

                        {/* Feedback Editor Box */}
                        <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm flex flex-col">
                            <h4 className="font-bold text-text-primary mb-3 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-primary-600" />
                                Feedback al Alumno (Técnica Sándwich)
                            </h4>
                            <div className="flex-1 relative">
                                <textarea
                                    value={activeCorrection.feedback}
                                    onChange={(e) => handleUpdateActiveFeedback(e.target.value)}
                                    className="w-full min-h-[140px] text-sm bg-surface-secondary/30 border border-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y p-4 text-text-primary leading-relaxed"
                                />
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[11px] text-text-muted font-medium bg-surface-secondary px-2 py-1 rounded-md">
                                    <Info className="w-3.5 h-3.5" /> Generado por IA. Editable por el docente.
                                </div>
                                <button
                                    onClick={handleSaveSingle}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400 rounded-lg text-xs font-bold hover:bg-primary-200 dark:hover:bg-primary-900/40 transition-colors disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                    Guardar cambios
                                </button>
                            </div>
                        </div>

                        {/* Improvement Suggestions */}
                        {activeCorrection.improvement_suggestions && (
                            <div className="bg-amber-50/50 dark:bg-amber-950/10 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                                <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-2 text-sm flex items-center gap-2">
                                    <ArrowRight className="w-4 h-4" />
                                    Sugerencia de Mejora
                                </h4>
                                <p className="text-sm text-amber-700 dark:text-amber-500 leading-relaxed">
                                    {activeCorrection.improvement_suggestions}
                                </p>
                            </div>
                        )}

                        {/* Details Grid: Scores & Errors */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Puntajes por Criterio */}
                            <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
                                <h4 className="font-bold text-text-primary mb-5 flex items-center gap-2">
                                    <ClipboardCheck className="w-5 h-5 text-blue-500" />
                                    Puntajes por Criterio
                                </h4>
                                <div className="space-y-4">
                                    {activeCorrection.criteria_scores.length > 0 ? activeCorrection.criteria_scores.map((crit, i) => {
                                        const percent = crit.max_score > 0 ? (crit.achieved_score / crit.max_score) * 100 : 0;
                                        return (
                                            <div key={i}>
                                                <div className="flex justify-between text-xs mb-1.5 font-medium">
                                                    <span className="text-text-secondary">{crit.criterion_name}</span>
                                                    <span className="text-text-primary">{crit.achieved_score}/{crit.max_score}</span>
                                                </div>
                                                <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
                                                    <div
                                                        className={cn("h-full rounded-full transition-all", percent >= 80 ? "bg-emerald-500" : percent >= 60 ? "bg-amber-500" : "bg-rose-500")}
                                                        style={{ width: `${percent}%` }}
                                                    ></div>
                                                </div>
                                                {crit.feedback && (
                                                    <p className="text-[11px] text-text-muted mt-1 italic">{crit.feedback}</p>
                                                )}
                                            </div>
                                        )
                                    }) : <p className="text-xs text-text-muted italic">No hay desglose disponible.</p>}
                                </div>
                            </div>

                            {/* Errores Detectados */}
                            <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
                                <h4 className="font-bold text-text-primary mb-5 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                                    Errores Detectados
                                </h4>
                                <div className="space-y-3">
                                    {activeCorrection.detected_errors.length > 0 ? activeCorrection.detected_errors.map((err, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-surface-secondary/50 border border-border hover:border-primary-200 dark:hover:border-primary-900 transition-colors">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-[10px] font-black uppercase mt-0.5 shrink-0",
                                                err.severity === 'high' ? "bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400" :
                                                    err.severity === 'medium' ? "bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400" :
                                                        "bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                                            )}>
                                                {errorSeverityLabel(err.severity)}
                                            </span>
                                            <div className="flex-1">
                                                <p className="text-xs font-medium text-text-secondary leading-tight mt-0.5">{err.description}</p>
                                                {err.related_topic && (
                                                    <p className="text-[10px] text-text-muted mt-1">Tema: {err.related_topic}</p>
                                                )}
                                            </div>
                                        </div>
                                    )) : <p className="text-xs text-text-muted italic text-center py-4">No se detectaron errores importantes.</p>}
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {/* Notifications */}
                {successMsg && (
                    <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-bold animate-slide-up flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {successMsg}
                    </div>
                )}

                {error && (
                    <div className="fixed top-4 right-4 z-50 bg-rose-600 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-bold animate-slide-up flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                        <button onClick={() => setError(null)} className="ml-2 hover:opacity-80">✕</button>
                    </div>
                )}

                {/* BOTTOM ACTION BAR (Sticky to panel) */}
                <div className="absolute bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-md border-t border-border p-4 z-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            disabled={activeIndex === 0}
                            onClick={() => setActiveIndex(activeIndex - 1)}
                            className="p-2 rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-xs font-medium text-text-muted">
                            {activeIndex + 1} de {corrections.length}
                        </span>
                        <button
                            disabled={activeIndex === corrections.length - 1}
                            onClick={() => setActiveIndex(activeIndex + 1)}
                            className="p-2 rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-200 dark:ring-amber-900 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-bold">
                            <span className="size-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]"></span>
                            {pendingCount} Pendientes
                        </div>
                        <button
                            onClick={handleApproveBatch}
                            disabled={approving || pendingCount === 0}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary-600/20 transition-all flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                            {approving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Aprobando…
                                </>
                            ) : (
                                <>
                                    <span>Aprobar Lote ({corrections.length})</span>
                                    <CheckCircle className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    )
}
