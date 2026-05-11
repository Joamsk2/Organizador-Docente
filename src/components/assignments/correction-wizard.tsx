'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
    X, ChevronLeft, Upload, Loader2, CheckCircle2, Clock,
    AlertCircle, BookOpen, Star, ChevronRight, Users, RefreshCw, FileText
} from 'lucide-react'
import type { Assignment } from '@/hooks/use-assignments'
import { useCorrectionWizard, type CorrectionResult } from '@/hooks/use-correction-wizard'
import { GRADE_PERIOD_LABELS } from '@/lib/constants'
import type { Database } from '@/lib/types/database'
import { cn } from '@/lib/utils'

type GradePeriod = Database['public']['Enums']['grade_period']

const GRADE_PERIODS: { value: GradePeriod; label: string }[] = [
    { value: '1er_trimestre', label: '1er Trimestre' },
    { value: '2do_trimestre', label: '2do Trimestre' },
    { value: '3er_trimestre', label: '3er Trimestre' },
    { value: 'final', label: 'Final' },
]

const severityColor: Record<string, string> = {
    high: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    medium: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    low: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
}

type WizardStep =
    | 'select_student'
    | 'upload_file'
    | 'correcting'
    | 'review_list'
    | 'review_single'

interface CorrectionWizardProps {
    assignment: Assignment
    courseId: string
    onClose: () => void
}

export function CorrectionWizard({ assignment, courseId, onClose }: CorrectionWizardProps) {
    const [step, setStep] = useState<WizardStep>('select_student')
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [reviewingCorrection, setReviewingCorrection] = useState<CorrectionResult | null>(null)
    const [finalGrade, setFinalGrade] = useState<number>(0)
    const [editedFeedback, setEditedFeedback] = useState('')
    const [teacherNotes, setTeacherNotes] = useState('')
    const [selectedPeriod, setSelectedPeriod] = useState<GradePeriod>('1er_trimestre')
    const [savingApproval, setSavingApproval] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const {
        submissionStatuses,
        loadingStatus,
        uploadingFor,
        correcting,
        correctionProgress,
        fetchStatuses,
        uploadStudentWork,
        runBatchCorrection,
        fetchCorrectionDetail,
        saveApprovedCorrection,
    } = useCorrectionWizard(assignment.id, courseId)

    useEffect(() => {
        fetchStatuses()
    }, [fetchStatuses])

    const selectedStudent = submissionStatuses.find(s => s.studentId === selectedStudentId)

    const readyToCorrectCount = submissionStatuses.filter(s => s.status === 'cargado' || s.status === 'corregido').length
    const uploadedCount = submissionStatuses.filter(s => s.status === 'cargado').length
    const correctedCount = submissionStatuses.filter(s => s.status === 'corregido' || s.status === 'aprobado').length
    const approvedCount = submissionStatuses.filter(s => s.status === 'aprobado').length

    // --- Handlers ---
    const handleSelectStudent = (studentId: string) => {
        const student = submissionStatuses.find(s => s.studentId === studentId)
        if (!student) return
        if (student.status === 'corregido' || student.status === 'aprobado') {
            // Go to review if already corrected
            handleOpenReview(student.correctionId!, studentId)
            return
        }
        setSelectedStudentId(studentId)
        setSelectedFile(null)
        setStep('upload_file')
    }

    const handleFileDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) setSelectedFile(file)
    }, [])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setSelectedFile(e.target.files[0])
    }

    const handleUploadAndReturn = async () => {
        if (!selectedFile || !selectedStudentId) return
        const ok = await uploadStudentWork(selectedFile, selectedStudentId)
        if (ok) {
            setSelectedStudentId(null)
            setSelectedFile(null)
            setStep('select_student')
        }
    }

    const handleRunCorrection = async () => {
        setStep('correcting')
        const ok = await runBatchCorrection()
        if (ok) {
            setStep('review_list')
        } else {
            setStep('select_student')
        }
    }

    const handleOpenReview = async (correctionId: string, studentId: string) => {
        const result = await fetchCorrectionDetail(correctionId, studentId)
        if (!result) return
        setReviewingCorrection(result)
        setFinalGrade(result.suggestedGrade)
        setEditedFeedback(result.studentFeedback)
        setTeacherNotes('')
        setSelectedStudentId(studentId) // Ensure selectedStudentId is set for re-correction
        setStep('review_single')
    }

    const handleReCorrectSingle = async () => {
        if (!selectedStudentId) return
        setStep('correcting')
        const ok = await runBatchCorrection([selectedStudentId])
        if (ok) {
            // After re-correction, find the new correction ID and open it
            // We need to fetch statuses first (runBatchCorrection already does it)
            setStep('review_list')
        } else {
            setStep('review_list')
        }
    }

    const handleSaveApproval = async () => {
        if (!reviewingCorrection || !selectedStudent) return
        setSavingApproval(true)
        const ok = await saveApprovedCorrection({
            correctionId: reviewingCorrection.correctionId,
            submissionId: selectedStudent.submissionId!,
            studentId: reviewingCorrection.studentId,
            finalGrade,
            editedFeedback,
            teacherNotes,
            period: selectedPeriod,
            assignmentType: assignment.type || 'tp',
        })
        setSavingApproval(false)
        if (ok) {
            setReviewingCorrection(null)
            setStep('review_list')
        }
    }

    const severityColor: Record<string, string> = {
        alta: 'bg-red-500/10 border-red-500/30 text-red-400',
        media: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        baja: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    }

    // --- Render ---
    return (
        <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="relative ml-auto w-full max-w-lg h-full bg-surface/95 dark:bg-surface/80 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">

                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-shrink-0">
                    {(step === 'upload_file' || step === 'review_single') && (
                        <button
                            onClick={() => {
                                if (step === 'upload_file') setStep('select_student')
                                else setStep('review_list')
                            }}
                            className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-text-muted"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-text-primary truncate text-sm">
                            {step === 'select_student' && 'Cargar trabajos'}
                            {step === 'upload_file' && `Trabajo de ${selectedStudent?.studentName}`}
                            {step === 'correcting' && 'Corrigiendo con IA...'}
                            {step === 'review_list' && 'Revisá las correcciones'}
                            {step === 'review_single' && `Revisando — ${reviewingCorrection?.studentName}`}
                        </h2>
                        <p className="text-xs text-text-muted truncate">{assignment.title}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-text-muted flex-shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">

                    {/* ===== STEP: SELECT STUDENT ===== */}
                    {step === 'select_student' && (
                        <div className="p-5 space-y-4">
                            {/* Summary pills */}
                            <div className="flex gap-2 flex-wrap animate-fade-in">
                                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                                    {submissionStatuses.length} alumnos
                                </span>
                                {uploadedCount > 0 && (
                                    <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                        {uploadedCount} cargados
                                    </span>
                                )}
                                {correctedCount > 0 && (
                                    <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                        {correctedCount} corregidos
                                    </span>
                                )}
                                {approvedCount > 0 && (
                                    <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                        {approvedCount} aprobados
                                    </span>
                                )}
                            </div>

                            {loadingStatus ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                                </div>
                            ) : (
                                <div className="space-y-3 animate-fade-in">
                                    {submissionStatuses.map((s, idx) => (
                                        <button
                                            key={s.studentId}
                                            onClick={() => handleSelectStudent(s.studentId)}
                                            disabled={s.status === 'aprobado'}
                                            style={{ animationDelay: `${idx * 40}ms` }}
                                            className={cn(
                                                "w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all group animate-fade-in",
                                                s.status === 'aprobado'
                                                    ? 'bg-emerald-500/5 border-emerald-500/10 cursor-default opacity-70'
                                                    : s.status === 'corregido'
                                                        ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-400 hover:bg-amber-500/10 shadow-lg shadow-amber-500/5'
                                                        : s.status === 'cargado'
                                                            ? 'bg-blue-500/5 border-blue-500/20 hover:border-blue-400 hover:bg-blue-500/10'
                                                            : 'bg-surface-secondary/50 border-white/5 hover:border-primary-500/50 hover:bg-primary-500/5'
                                            )}
                                        >
                                            {/* Avatar */}
                                            <div className={cn(
                                                "w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-transform group-hover:scale-110 shadow-inner",
                                                s.status === 'aprobado' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                                                    s.status === 'corregido' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
                                                        s.status === 'cargado' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' :
                                                            'bg-surface-secondary text-text-muted border border-white/10'
                                            )}>
                                                {s.studentName.charAt(0).toUpperCase()}
                                            </div>
 
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <p className="text-sm font-semibold text-text-primary truncate">{s.studentName}</p>
                                                    {s.status === 'corregido' && (
                                                        <span className="text-[10px] font-black px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-md border border-amber-500/20 uppercase tracking-tighter">
                                                            Sugerido
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] leading-tight text-text-muted font-medium">
                                                    {s.status === 'pendiente' && 'Sin trabajo cargado'}
                                                    {s.status === 'cargado' && 'Trabajo cargado • Listo para corregir'}
                                                    {s.status === 'corregido' && `IA sugiere nota ${s.suggestedGrade} • Clic para revisar`}
                                                    {s.status === 'aprobado' && `Nota aprobada: ${s.suggestedGrade}`}
                                                </p>
                                            </div>
 
                                            {/* Status icon */}
                                            <div className="flex-shrink-0 ml-1">
                                                {s.status === 'aprobado' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                                                {s.status === 'corregido' && <Star className="w-5 h-5 text-amber-400 animate-pulse" />}
                                                {s.status === 'cargado' && <Clock className="w-5 h-5 text-blue-400" />}
                                                {s.status === 'pendiente' && <ChevronRight className="w-4 h-4 text-text-muted group-hover:translate-x-1 transition-transform" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ===== STEP: UPLOAD FILE ===== */}
                    {step === 'upload_file' && (
                        <div className="p-6 space-y-5 animate-slide-in-right">
                            <div className="p-4 bg-primary-500/5 border border-primary-500/10 rounded-2xl">
                                <p className="text-sm text-text-secondary leading-relaxed">
                                    Subí el trabajo de <strong className="text-text-primary font-bold">{selectedStudent?.studentName}</strong>. 
                                    La IA procesará imágenes, PDFs o documentos para evaluarlos.
                                </p>
                            </div>

                            {/* Drop zone */}
                            <div
                                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleFileDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all",
                                    isDragging ? 'border-primary-500 bg-primary-500/10' :
                                        selectedFile ? 'border-emerald-500 bg-emerald-500/5' :
                                            'border-border hover:border-primary-400 hover:bg-surface-secondary/30'
                                )}
                            >
                                {selectedFile ? (
                                    <>
                                        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                                        <p className="text-sm font-semibold text-emerald-400">{selectedFile.name}</p>
                                        <p className="text-xs text-text-muted mt-1">Tocá para cambiar el archivo</p>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-10 h-10 text-text-muted mx-auto mb-2" />
                                        <p className="text-sm font-medium text-text-primary">Arrastrá el archivo o tocá para buscar</p>
                                        <p className="text-xs text-text-muted mt-1">PDF, imagen (JPG/PNG) o Word (.docx)</p>
                                    </>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.docx,.jpg,.jpeg,.png,image/*,application/pdf"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                            </div>

                            <button
                                onClick={handleUploadAndReturn}
                                disabled={!selectedFile || !!uploadingFor}
                                className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                {uploadingFor ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</>
                                ) : (
                                    <><CheckCircle2 className="w-4 h-4" /> Confirmar carga</>
                                )}
                            </button>
                        </div>
                    )}

                    {/* ===== STEP: CORRECTING ===== */}
                    {step === 'correcting' && (
                        <div className="p-8 space-y-8 animate-fade-in flex flex-col items-center justify-center h-full">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full border-4 border-primary-500/10 border-t-primary-500 animate-spin" />
                                <Star className="w-10 h-10 text-primary-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-bold text-text-primary">Evaluando con IA</h3>
                                <p className="text-sm text-text-muted max-w-[280px] mx-auto">
                                    Estamos analizando cada entrega según tus criterios y bibliografía...
                                </p>
                            </div>
                            <div className="w-full space-y-3">
                                {submissionStatuses.filter(s => s.status === 'cargado' || s.status === 'corregido').slice(0, 4).map((s, i) => (
                                    <div 
                                        key={s.studentId} 
                                        style={{ animationDelay: `${i * 100}ms` }}
                                        className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl animate-fade-in opacity-60"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center text-xs font-bold text-text-muted">
                                            {s.studentName.charAt(0)}
                                        </div>
                                        <span className="flex-1 text-xs text-text-secondary">{s.studentName}</span>
                                        <Loader2 className="w-3 h-3 animate-spin text-primary-400" />
                                    </div>
                                ))}
                                {readyToCorrectCount > 4 && (
                                    <p className="text-center text-[10px] text-text-muted font-bold tracking-widest uppercase">
                                        + {readyToCorrectCount - 4} alumnos más
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ===== STEP: REVIEW LIST ===== */}
                    {step === 'review_list' && (
                        <div className="p-5 space-y-4 animate-slide-in-right">
                            <p className="text-sm text-text-secondary font-medium px-1">
                                Revisá la corrección de cada alumno antes de guardar la nota.
                            </p>
                            <div className="space-y-3">
                                {submissionStatuses
                                    .filter(s => s.status === 'corregido' || s.status === 'aprobado')
                                    .map((s, idx) => (
                                        <button
                                            key={s.studentId}
                                            onClick={() => s.correctionId && handleOpenReview(s.correctionId, s.studentId)}
                                            disabled={s.status === 'aprobado'}
                                            style={{ animationDelay: `${idx * 40}ms` }}
                                            className={cn(
                                                "w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all group animate-fade-in",
                                                s.status === 'aprobado'
                                                    ? 'bg-emerald-500/5 border-emerald-500/10 cursor-default opacity-70'
                                                    : 'bg-amber-500/5 border-amber-500/20 hover:border-amber-400 hover:bg-amber-500/10 shadow-lg shadow-amber-500/5'
                                            )}
                                        >
                                            <div className={cn(
                                                "w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-transform group-hover:scale-110",
                                                s.status === 'aprobado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                                            )}>
                                                {s.studentName.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-text-primary">{s.studentName}</p>
                                                <p className="text-[11px] font-medium text-text-muted">
                                                    {s.status === 'aprobado' ? `Nota guardada: ${s.suggestedGrade}` : `IA sugiere nota ${s.suggestedGrade} • Clic para revisar`}
                                                </p>
                                            </div>
                                            {s.status === 'aprobado'
                                                ? <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                                : <ChevronRight className="w-4 h-4 text-text-muted group-hover:translate-x-1 transition-transform flex-shrink-0" />
                                            }
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* ===== STEP: REVIEW SINGLE ===== */}
                    {step === 'review_single' && reviewingCorrection && (
                        <div className="p-5 space-y-5">

                            {/* Diagnosis note */}
                            {reviewingCorrection.hasLearningDiagnosis && (
                                <div className="flex gap-2 p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                                    <BookOpen className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-violet-300">
                                        <strong>Adaptación aplicada:</strong> La IA tuvo en cuenta el diagnóstico de este alumno al evaluar.
                                    </p>
                                </div>
                            )}

                            {/* Grade */}
                            <div className="bg-surface-secondary/50 p-5 rounded-2xl border border-white/5 shadow-inner">
                                <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3">Nota Final</label>
                                <div className="flex items-center gap-5">
                                    <div className="relative group">
                                        <input
                                            type="number"
                                            min={1} max={10} step={0.5}
                                            value={finalGrade}
                                            onChange={e => setFinalGrade(Number(e.target.value))}
                                            className="w-24 text-4xl font-black text-center py-4 bg-surface border-2 border-primary-500/30 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all text-text-primary shadow-lg"
                                        />
                                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-white text-[10px] shadow-lg animate-bounce">
                                            ✏️
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium text-text-primary">Sugerencia de IA: <span className="text-amber-400 font-bold">{reviewingCorrection.suggestedGrade}</span></p>
                                        <p className="text-xs text-text-muted leading-snug">Podés ajustar la nota según tu criterio pedagógico.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Period selector */}
                            <div>
                                <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3">Guardar en Trimestre / Periodo</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {GRADE_PERIODS.map(p => (
                                        <button
                                            key={p.value}
                                            type="button"
                                            onClick={() => setSelectedPeriod(p.value)}
                                            className={cn(
                                                "py-2.5 px-3 rounded-xl border text-xs font-bold transition-all uppercase tracking-wider",
                                                selectedPeriod === p.value
                                                    ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/20'
                                                    : 'bg-white/5 border-white/5 text-text-secondary hover:border-white/10 hover:bg-white/10'
                                            )}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Errors */}
                            {reviewingCorrection.detectedErrors.length > 0 && (
                                <div>
                                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                                        Errores detectados ({reviewingCorrection.detectedErrors.length})
                                    </label>
                                    <div className="space-y-2">
                                        {reviewingCorrection.detectedErrors.map((err, i) => (
                                            <div key={i} className={cn("p-2.5 rounded-lg border text-xs", severityColor[err.severity] || severityColor.baja)}>
                                                <p className="font-semibold">{err.type}</p>
                                                <p className="mt-0.5 opacity-80">{err.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Improvement suggestions */}
                            {reviewingCorrection.improvementSuggestions && (
                                <div className="animate-fade-in">
                                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 px-1">Áreas de mejora</label>
                                    <div className="text-sm text-text-secondary bg-surface-secondary/30 border border-white/5 rounded-2xl p-4 italic leading-relaxed">
                                        "{reviewingCorrection.improvementSuggestions}"
                                    </div>
                                </div>
                            )}

                            {/* Feedback editable */}
                            <div>
                                <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 px-1">
                                    Devolución al alumno <span className="normal-case font-normal text-primary-400/80">(Editable)</span>
                                </label>
                                <textarea
                                    rows={5}
                                    value={editedFeedback}
                                    onChange={e => setEditedFeedback(e.target.value)}
                                    className="w-full px-4 py-3 bg-surface border border-white/10 rounded-2xl text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all custom-scrollbar text-text-primary placeholder:text-text-muted/50"
                                    placeholder="Escribí aquí los comentarios para el alumno..."
                                />
                            </div>

                            {/* Teacher notes */}
                            <div className="pb-4">
                                <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 px-1">
                                    Notas del docente <span className="normal-case font-normal text-text-muted/50">(Privado)</span>
                                </label>
                                <textarea
                                    rows={2}
                                    value={teacherNotes}
                                    onChange={e => setTeacherNotes(e.target.value)}
                                    placeholder="Observaciones personales..."
                                    className="w-full px-4 py-3 bg-surface border border-white/10 rounded-2xl text-xs focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all custom-scrollbar text-text-primary italic"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="border-t border-white/10 p-5 flex-shrink-0 space-y-3 bg-surface-secondary/50 backdrop-blur-md">

                    {/* Select student footer: Correct all button */}
                    {step === 'select_student' && readyToCorrectCount > 0 && (
                        <button
                            onClick={() => handleRunCorrection()}
                            disabled={correcting}
                            className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 disabled:opacity-50 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary-500/20 active:scale-[0.98]"
                        >
                            {correcting
                                ? <><Loader2 className="w-5 h-5 animate-spin" /> Procesando...</>
                                : <><Star className="w-5 h-5 fill-current" /> {uploadedCount > 0 ? 'Corregir con IA' : 'Re-corregir con IA'} ({readyToCorrectCount})</>
                            }
                        </button>
                    )}

                    {/* Review list footer: go to correct more */}
                    {step === 'review_list' && (
                        <button
                            onClick={() => setStep('select_student')}
                            className="w-full py-3.5 border border-white/10 text-text-secondary hover:bg-white/5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2"
                        >
                            <Users className="w-4 h-4" /> Cargar más trabajos
                        </button>
                    )}

                    {/* Review single footer: save */}
                    {step === 'review_single' && (
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleSaveApproval}
                                disabled={savingApproval || !selectedStudent?.submissionId}
                                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 active:scale-[0.98]"
                            >
                                {savingApproval
                                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</>
                                    : <><CheckCircle2 className="w-5 h-5" /> Aprobar y Guardar Nota</>
                                }
                            </button>
                            
                            <button
                                onClick={handleReCorrectSingle}
                                disabled={savingApproval || correcting}
                                className="w-full py-3 border border-amber-500/30 text-amber-400 hover:bg-amber-500/5 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw className={cn("w-3 h-3", correcting && "animate-spin")} /> Re-corregir con IA
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
