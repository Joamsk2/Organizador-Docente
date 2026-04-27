import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'
import { toast } from 'sonner'
import { compressImageForAI } from '@/lib/ai/image-utils'

type GradePeriod = Database['public']['Enums']['grade_period']
type SubmissionStatus = Database['public']['Enums']['submission_status']

export interface StudentSubmissionStatus {
    studentId: string
    studentName: string
    submissionId: string | null
    correctionId: string | null
    status: 'pendiente' | 'cargado' | 'corregido' | 'aprobado'
    suggestedGrade: number | null
}

export interface CorrectionResult {
    correctionId: string
    studentId: string
    studentName: string
    suggestedGrade: number
    correctionSummary: string
    studentFeedback: string
    detectedErrors: Array<{ type: string; description: string; severity: 'alta' | 'media' | 'baja'; topic: string }>
    improvementSuggestions: string
    criteriaScores: Array<{ criterion: string; score: number; maxScore: number; feedback: string }>
    hasLearningDiagnosis: boolean
    diagnosisNote: string | null
}

export function useCorrectionWizard(assignmentId: string, courseId: string) {
    const [submissionStatuses, setSubmissionStatuses] = useState<StudentSubmissionStatus[]>([])
    const [correctionResults, setCorrectionResults] = useState<CorrectionResult[]>([])
    const [loadingStatus, setLoadingStatus] = useState(false)
    const [uploadingFor, setUploadingFor] = useState<string | null>(null) // studentId being uploaded
    const [correcting, setCorreting] = useState(false)
    const [correctionProgress, setCorrectionProgress] = useState<Record<string, 'pending' | 'processing' | 'done' | 'error'>>({})

    /**
     * Loads the upload/correction status for each student in the course for this assignment.
     */
    const fetchStatuses = useCallback(async () => {
        setLoadingStatus(true)
        const supabase = createClient()

        // Get all students enrolled in this course
        const { data: enrollments, error: enrollError } = await supabase
            .from('course_students')
            .select('student_id, students(id, first_name, last_name)')
            .eq('course_id', courseId)
            .eq('status', 'activo')

        if (enrollError || !enrollments) {
            toast.error('No se pudieron cargar los alumnos')
            setLoadingStatus(false)
            return
        }

        // Get all submissions for this assignment
        const { data: submissions } = await supabase
            .from('assignment_submissions')
            .select('id, student_id, status')
            .eq('assignment_id', assignmentId)

        // Get all corrections for those submissions
        const submissionIds = (submissions || []).map(s => s.id)
        const { data: corrections } = submissionIds.length > 0
            ? await supabase
                .from('ai_corrections')
                .select('id, submission_id, suggested_grade, status')
                .in('submission_id', submissionIds)
            : { data: [] }

        const statuses: StudentSubmissionStatus[] = enrollments.map(e => {
            const student = e.students as any
            const submission = (submissions || []).find(s => s.student_id === student?.id)
            const correction = submission
                ? (corrections || []).find(c => c.submission_id === submission.id)
                : null

            let status: StudentSubmissionStatus['status'] = 'pendiente'
            if (correction?.status === 'approved') status = 'aprobado'
            else if (correction) status = 'corregido'
            else if (submission) status = 'cargado'

            return {
                studentId: student?.id || '',
                studentName: `${student?.first_name || ''} ${student?.last_name || ''}`.trim(),
                submissionId: submission?.id || null,
                correctionId: correction?.id || null,
                status,
                suggestedGrade: correction?.suggested_grade || null,
            }
        })

        setSubmissionStatuses(statuses)
        setLoadingStatus(false)
    }, [assignmentId, courseId])

    /**
     * Uploads a student's work file and creates/updates the submission record.
     */
    const uploadStudentWork = async (file: File, studentId: string): Promise<boolean> => {
        setUploadingFor(studentId)
        const supabase = createClient()

        try {
            let fileToUpload: File | Blob = file
            let contentType = file.type

            // Compress images before upload
            if (file.type.startsWith('image/')) {
                const compressed = await compressImageForAI(file)
                fileToUpload = compressed.blob
                contentType = compressed.blob.type
            }

            // Upload to storage
            const ext = file.name.split('.').pop() || 'pdf'
            const storagePath = `${assignmentId}/${studentId}/${Date.now()}.${ext}`
            const { error: uploadError } = await supabase.storage
                .from('submissions')
                .upload(storagePath, fileToUpload, { contentType, upsert: true })

            if (uploadError) throw uploadError

            const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(storagePath)
            const fileUrl = urlData.publicUrl

            // Check if submission already exists
            const existing = submissionStatuses.find(s => s.studentId === studentId)

            if (existing?.submissionId) {
                // Update existing submission
                await supabase
                    .from('assignment_submissions')
                    .update({ file_urls: [fileUrl], status: 'entregado', submitted_at: new Date().toISOString() })
                    .eq('id', existing.submissionId)
            } else {
                // Create new submission
                await supabase
                    .from('assignment_submissions')
                    .insert({
                        assignment_id: assignmentId,
                        student_id: studentId,
                        file_urls: [fileUrl],
                        status: 'entregado',
                        submitted_at: new Date().toISOString(),
                    })
            }

            // Update local state
            setSubmissionStatuses(prev => prev.map(s =>
                s.studentId === studentId ? { ...s, status: 'cargado' } : s
            ))

            toast.success('Trabajo cargado correctamente')
            return true
        } catch (err: any) {
            toast.error('Error al cargar el trabajo', { description: err?.message })
            return false
        } finally {
            setUploadingFor(null)
        }
    }

    /**
     * Runs batch AI correction for all uploaded (but not yet corrected) submissions.
     */
    const runBatchCorrection = async (): Promise<boolean> => {
        setCorreting(true)

        // Get IDs of students that have uploaded work but not been corrected yet
        const toCorrect = submissionStatuses.filter(s => s.status === 'cargado')

        if (toCorrect.length === 0) {
            toast.error('No hay trabajos cargados para corregir')
            setCorreting(false)
            return false
        }

        // Mark all as pending in progress map
        const initialProgress: Record<string, 'pending' | 'processing' | 'done' | 'error'> = {}
        toCorrect.forEach(s => { initialProgress[s.studentId] = 'pending' })
        setCorrectionProgress(initialProgress)

        try {
            const supabase = createClient()

            // 1. Get the digest for this assignment
            let { data: assignment } = await supabase
                .from('assignments')
                .select('digest')
                .eq('id', assignmentId)
                .single()

            let currentDigest = (assignment as any)?.digest

            // 2. If digest is missing, generate it now
            if (!currentDigest) {
                const digestRes = await fetch('/api/ai/pre-digest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ assignment_id: assignmentId }),
                })

                if (!digestRes.ok) {
                    let errorMessage = 'No se pudo generar el resumen del material (pre-digest)'
                    try {
                        const errorData = await digestRes.json()
                        errorMessage = errorData.error || errorMessage
                    } catch (e) {
                        // If JSON parsing fails, try to get the raw text (might be HTML error)
                        const rawText = await digestRes.text().catch(() => '')
                        if (rawText.includes('<html')) {
                            errorMessage = `Error del servidor (${digestRes.status}). Posible tiempo de espera agotado.`
                        } else if (rawText) {
                            errorMessage = rawText.slice(0, 100)
                        }
                    }
                    throw new Error(errorMessage)
                }

                const digestData = await digestRes.json()
                currentDigest = digestData.digest

            }

            // 3. Call the batch correction API with the digest
            const response = await fetch('/api/ai/correct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assignment_id: assignmentId,
                    digest: currentDigest
                }),
            })

            if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || 'Error en la corrección')
            }

            const result = await response.json()

            // Mark all as done
            toCorrect.forEach(s => {
                setCorrectionProgress(prev => ({ ...prev, [s.studentId]: 'done' }))
            })

            // Refresh statuses to get updated corrections
            await fetchStatuses()

            toast.success(`${toCorrect.length} trabajos corregidos`, {
                description: 'Revisá cada corrección antes de guardar la nota.'
            })
            return true
        } catch (err: any) {
            toast.error('Error al corregir trabajos', { description: err?.message })
            toCorrect.forEach(s => {
                setCorrectionProgress(prev => ({ ...prev, [s.studentId]: 'error' }))
            })
            return false
        } finally {
            setCorreting(false)
        }
    }

    /**
     * Fetches the full correction result for a specific student to display in the review step.
     */
    const fetchCorrectionDetail = async (correctionId: string, studentId: string): Promise<CorrectionResult | null> => {
        const supabase = createClient()

        const [{ data: correction }, { data: student }] = await Promise.all([
            supabase
                .from('ai_corrections')
                .select('*')
                .eq('id', correctionId)
                .single(),
            supabase
                .from('students')
                .select('first_name, last_name, notes')
                .eq('id', studentId)
                .single(),
        ])

        if (!correction || !student) return null

        const hasLearningDiagnosis = !!(student.notes && /dislexia|TEA|TDAH|trastorno|diagnóstico|dificultad/i.test(student.notes))

        return {
            correctionId: correction.id,
            studentId,
            studentName: `${student.first_name} ${student.last_name}`,
            suggestedGrade: correction.suggested_grade || 0,
            correctionSummary: correction.correction_summary || '',
            studentFeedback: correction.student_feedback || '',
            detectedErrors: (correction.detected_errors as any[]) || [],
            improvementSuggestions: correction.improvement_suggestions || '',
            criteriaScores: (correction.criteria_scores as any[]) || [],
            hasLearningDiagnosis,
            diagnosisNote: hasLearningDiagnosis ? student.notes : null,
        }
    }

    /**
     * Saves the teacher-approved correction: updates ai_corrections + inserts into grades.
     */
    const saveApprovedCorrection = async ({
        correctionId,
        submissionId,
        studentId,
        finalGrade,
        editedFeedback,
        teacherNotes,
        period,
        assignmentType,
    }: {
        correctionId: string
        submissionId: string
        studentId: string
        finalGrade: number
        editedFeedback: string
        teacherNotes: string
        period: GradePeriod
        assignmentType: string
    }): Promise<boolean> => {
        const supabase = createClient()

        try {
            // 1. Update correction record
            await supabase
                .from('ai_corrections')
                .update({
                    teacher_override_grade: finalGrade,
                    student_feedback: editedFeedback,
                    teacher_notes: teacherNotes,
                    status: 'approved',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', correctionId)

            // 2. Update submission status
            await supabase
                .from('assignment_submissions')
                .update({ status: 'corregido', graded_at: new Date().toISOString(), feedback: editedFeedback })
                .eq('id', submissionId)

            // 3. Upsert grade record
            const { data: existingGrade } = await supabase
                .from('grades')
                .select('id')
                .eq('assignment_id', assignmentId)
                .eq('student_id', studentId)
                .eq('period', period)
                .single()

            if (existingGrade) {
                await supabase
                    .from('grades')
                    .update({ value: finalGrade, observations: editedFeedback, updated_at: new Date().toISOString() })
                    .eq('id', existingGrade.id)
            } else {
                await supabase.from('grades').insert({
                    student_id: studentId,
                    course_id: courseId,
                    assignment_id: assignmentId,
                    value: finalGrade,
                    category: assignmentType || 'tp',
                    period,
                    observations: editedFeedback,
                })
            }

            // Update local status
            setSubmissionStatuses(prev => prev.map(s =>
                s.studentId === studentId ? { ...s, status: 'aprobado', suggestedGrade: finalGrade } : s
            ))

            toast.success('Corrección guardada', { description: `Nota ${finalGrade} registrada en Calificaciones.` })
            return true
        } catch (err: any) {
            toast.error('Error al guardar la corrección', { description: err?.message })
            return false
        }
    }

    return {
        submissionStatuses,
        correctionResults,
        loadingStatus,
        uploadingFor,
        correcting,
        correctionProgress,
        fetchStatuses,
        uploadStudentWork,
        runBatchCorrection,
        fetchCorrectionDetail,
        saveApprovedCorrection,
    }
}
