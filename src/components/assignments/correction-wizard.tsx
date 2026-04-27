'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
    X, ChevronLeft, Upload, Loader2, CheckCircle2, Clock,
    AlertCircle, BookOpen, Star, ChevronRight, Users
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
        setStep('review_single')
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
            <div className="relative ml-auto w-full max-w-lg h-full bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden">

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
                            <div className="flex gap-2 flex-wrap">
                                <span className="px-3 py-1 bg-surface-secondary rounded-full text-xs text-text-secondary">
                                    {submissionStatuses.length} alumnos
                                </span>
                                {uploadedCount > 0 && (
                                    <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs">
                                        {uploadedCount} cargados
                                    </span>
                                )}
                                {correctedCount > 0 && (
                                    <span className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-xs">
                                        {correctedCount} corregidos
                                    </span>
                                )}
                                {approvedCount > 0 && (
                                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs">
                                        {approvedCount} aprobados
                                    </span>
                                )}
                            </div>

                            {loadingStatus ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {submissionStatuses.map(s => (
                                        <button
                                            key={s.studentId}
                                            onClick={() => handleSelectStudent(s.studentId)}
                                            disabled={s.status === 'aprobado'}
                                            className={cn(
                                                "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                                                s.status === 'aprobado'
                                                    ? 'bg-emerald-500/5 border-emerald-500/20 cursor-default'
                                                    : s.status === 'corregido'
                                                        ? 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10'
                                                        : s.status === 'cargado'
                                                            ? 'bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10'
                                                            : 'bg-surface border-border hover:border-primary-400 hover:bg-primary-500/5'
                                            )}
                                        >
                                            {/* Avatar */}
                                            <div className={cn(
                                                "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                                                s.status === 'aprobado' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    s.status === 'corregido' ? 'bg-amber-500/20 text-amber-400' :
                                                        s.status === 'cargado' ? 'bg-blue-500/20 text-blue-400' :
                                                            'bg-surface-secondary text-text-muted'
                                            )}>
                                                {s.studentName.charAt(0).toUpperCase()}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-text-primary truncate">{s.studentName}</p>
                                                <p className="text-xs text-text-muted">
                                                    {s.status === 'pendiente' && 'Sin trabajo cargado'}
                                                    {s.status === 'cargado' && 'Trabajo cargado — listo para corregir'}
                                                    {s.status === 'corregido' && `IA sugiere nota ${s.suggestedGrade} — clic para revisar`}
                                                    {s.status === 'aprobado' && `Nota aprobada: ${s.suggestedGrade}`}
                                                </p>
                                            </div>

                                            {/* Status icon */}
                                            {s.status === 'aprobado' && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                                            {s.status === 'corregido' && <Star className="w-5 h-5 text-amber-400 flex-shrink-0" />}
                                            {s.status === 'cargado' && <Clock className="w-5 h-5 text-blue-400 flex-shrink-0" />}
                                            {s.status === 'pendiente' && <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ===== STEP: UPLOAD FILE ===== */}
                    {step === 'upload_file' && (
                        <div className="p-5 space-y-4">
                            <p className="text-sm text-text-secondary">
                                Subí el trabajo de <strong className="text-text-primary">{selectedStudent?.studentName}</strong>. Puede ser una foto del examen, un PDF o un documento Word.
                            </p>

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
                        <div className="p-5 space-y-4">
                            <p className="text-sm text-text-secondary text-center pt-4">
                                La IA está leyendo y evaluando cada trabajo. Esto puede tardar un momento.
                            </p>
                            <div className="space-y-2 mt-4">
                                {submissionStatuses.filter(s => s.status === 'cargado').map(s => (
                                    <div key={s.studentId} className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl">
                                        <div className="w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center text-sm font-bold text-text-muted">
                                            {s.studentName.charAt(0)}
                                        </div>
                                        <span className="flex-1 text-sm text-text-primary">{s.studentName}</span>
                                        <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ===== STEP: REVIEW LIST ===== */}
                    {step === 'review_list' && (
                        <div className="p-5 space-y-4">
                            <p className="text-sm text-text-secondary">
                                Revisá la corrección de cada alumno antes de guardar la nota.
                            </p>
                            <div className="space-y-2">
                                {submissionStatuses
                                    .filter(s => s.status === 'corregido' || s.status === 'aprobado')
                                    .map(s => (
                                        <button
                                            key={s.studentId}
                                            onClick={() => s.correctionId && handleOpenReview(s.correctionId, s.studentId)}
                                            disabled={s.status === 'aprobado'}
                                            className={cn(
                                                "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                                                s.status === 'aprobado'
                                                    ? 'bg-emerald-500/5 border-emerald-500/20 cursor-default'
                                                    : 'bg-surface border-border hover:border-primary-400'
                                            )}
                                        >
                                            <div className={cn(
                                                "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                                                s.status === 'aprobado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                                            )}>
                                                {s.studentName.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-text-primary">{s.studentName}</p>
                                                <p className="text-xs text-text-muted">
                                                    {s.status === 'aprobado' ? `Nota guardada: ${s.suggestedGrade}` : `Nota sugerida: ${s.suggestedGrade} — Tocá para revisar`}
                                                </p>
                                            </div>
                                            {s.status === 'aprobado'
                                                ? <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                                : <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
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
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Nota Final</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min={1} max={10} step={0.5}
                                        value={finalGrade}
                                        onChange={e => setFinalGrade(Number(e.target.value))}
                                        className="w-24 text-3xl font-black text-center py-3 bg-surface border-2 border-primary-500 rounded-xl focus:ring-2 focus:ring-primary-500 text-text-primary"
                                    />
                                    <div className="text-sm text-text-secondary">
                                        <p>La IA sugirió <strong className="text-text-primary">{reviewingCorrection.suggestedGrade}</strong></p>
                                        <p className="text-xs text-text-muted">Podés cambiarlo antes de guardar</p>
                                    </div>
                                </div>
                            </div>

                            {/* Period selector */}
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Guardar en</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {GRADE_PERIODS.map(p => (
                                        <button
                                            key={p.value}
                                            type="button"
                                            onClick={() => setSelectedPeriod(p.value)}
                                            className={cn(
                                                "py-2 px-3 rounded-lg border text-sm font-medium transition-all",
                                                selectedPeriod === p.value
                                                    ? 'bg-primary-600 border-primary-600 text-white'
                                                    : 'bg-surface border-border text-text-secondary hover:border-primary-400'
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
                                <div>
                                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Áreas de mejora</label>
                                    <p className="text-sm text-text-secondary bg-surface border border-border rounded-xl p-3">
                                        {reviewingCorrection.improvementSuggestions}
                                    </p>
                                </div>
                            )}

                            {/* Feedback editable */}
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                                    Devolución al alumno <span className="normal-case font-normal">(editable)</span>
                                </label>
                                <textarea
                                    rows={5}
                                    value={editedFeedback}
                                    onChange={e => setEditedFeedback(e.target.value)}
                                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y custom-scrollbar text-text-primary"
                                />
                            </div>

                            {/* Teacher notes */}
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                                    Notas del docente <span className="normal-case font-normal">(privadas, no se muestran al alumno)</span>
                                </label>
                                <textarea
                                    rows={2}
                                    value={teacherNotes}
                                    onChange={e => setTeacherNotes(e.target.value)}
                                    placeholder="Observaciones personales sobre esta corrección..."
                                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y custom-scrollbar text-text-primary"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="border-t border-border p-4 flex-shrink-0 space-y-2">

                    {/* Select student footer: Correct all button */}
                    {step === 'select_student' && uploadedCount > 0 && (
                        <button
                            onClick={handleRunCorrection}
                            disabled={correcting}
                            className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            {correcting
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Corrigiendo...</>
                                : <><Star className="w-4 h-4" /> Corregir con IA ({uploadedCount} {uploadedCount === 1 ? 'trabajo' : 'trabajos'})</>
                            }
                        </button>
                    )}

                    {/* Review list footer: go to correct more */}
                    {step === 'review_list' && (
                        <button
                            onClick={() => setStep('select_student')}
                            className="w-full py-2.5 border border-border text-text-secondary hover:bg-surface-hover text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <Users className="w-4 h-4" /> Cargar más trabajos
                        </button>
                    )}

                    {/* Review single footer: save */}
                    {step === 'review_single' && (
                        <button
                            onClick={handleSaveApproval}
                            disabled={savingApproval || !selectedStudent?.submissionId}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            {savingApproval
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                : <><CheckCircle2 className="w-4 h-4" /> Guardar corrección</>
                            }
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
