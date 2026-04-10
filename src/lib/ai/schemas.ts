import { z } from 'zod'

// Schema for criteria scores in corrections
export const criteriaScoreSchema = z.object({
    criterion_name: z.string().describe('Name of the evaluation criterion'),
    max_score: z.number().describe('Maximum possible score for this criterion'),
    achieved_score: z.number().describe('Score achieved by the student'),
    feedback: z.string().describe('Brief feedback for this specific criterion'),
})

// Schema for detected errors
export const detectedErrorSchema = z.object({
    error_type: z.enum(['conceptual', 'procedural', 'spelling', 'incomplete'])
        .describe('Type of error detected'),
    description: z.string().describe('Description of the error'),
    severity: z.enum(['high', 'medium', 'low']).describe('Severity of the error'),
    related_topic: z.string().describe('Topic related to this error'),
})

// Schema for a single student correction
export const studentCorrectionSchema = z.object({
    student_id: z.string().describe('UUID of the student'),
    criteria_scores: z.array(criteriaScoreSchema),
    suggested_grade: z.number().min(1).max(10).describe('Suggested grade from 1 to 10'),
    detected_errors: z.array(detectedErrorSchema),
    student_feedback: z.string().describe('Empathetic feedback message using sandwich technique: positive -> error -> improvement plan'),
    improvement_suggestions: z.string().describe('Specific topics or materials the student should review'),
    correction_summary: z.string().describe('Brief conclusion summarizing this correction in 1-2 sentences'),
})

// Schema for batch correction response
export const batchCorrectionSchema = z.object({
    corrections: z.array(studentCorrectionSchema),
})

// Schema for pre-digest output
export const preDigestSchema = z.object({
    digest: z.string().describe('Condensed summary of the reference material, including key concepts, expected answers, and important data points'),
    key_topics: z.array(z.string()).describe('List of main topics covered'),
})

// Schema for OCR transcription
export const transcriptionSchema = z.object({
    transcribed_text: z.string().describe('Exact transcription of what the student wrote'),
    has_drawings: z.boolean().describe('Whether the submission contains drawings or diagrams'),
    drawings_description: z.string().optional().describe('Description of any drawings or diagrams found'),
    legibility: z.enum(['clear', 'partially_legible', 'difficult']).describe('Overall legibility of the handwriting'),
})

// Schema for student report
export const studentReportSchema = z.object({
    narrative_summary: z.string().describe('Formal narrative summary of the student performance for parents or institution, in Spanish'),
    overall_trend: z.enum(['improving', 'stable', 'declining']).describe('Overall performance trend'),
    key_strengths: z.array(z.string()).describe('Main strengths identified'),
    key_areas_for_improvement: z.array(z.string()).describe('Main areas where the student needs improvement'),
    recommendations: z.string().describe('Specific recommendations for the student and parents'),
})
