import type { Database } from '@/lib/types/database'

// Row types from Supabase
export type AssignmentReferenceRow = Database['public']['Tables']['assignment_reference_materials']['Row']
export type AICorrectionRow = Database['public']['Tables']['ai_corrections']['Row']
export type StudentPerformanceSnapshotRow = Database['public']['Tables']['student_performance_snapshots']['Row']

// Material types
export type ReferenceMaterialType = 'reading_material' | 'instructions' | 'evaluation_criteria'

// AI Correction status
export type CorrectionStatus = 'pending' | 'corrected_by_ai' | 'approved_by_teacher'

// Risk levels
export type RiskLevel = 'low' | 'medium' | 'high'

// JSON structures inside ai_corrections
export interface CriteriaScore {
    criterion_name: string
    max_score: number
    achieved_score: number
    feedback: string
}

export interface DetectedError {
    error_type: 'conceptual' | 'procedural' | 'spelling' | 'incomplete'
    description: string
    severity: 'high' | 'medium' | 'low'
    related_topic: string
}

// JSON structure for corrections_history inside student_performance_snapshots
export interface CorrectionHistoryEntry {
    assignment_title: string
    date: string
    summary: string  // The correction_summary from ai_corrections
    grade: number
}

// Parsed interfaces with typed JSONB fields
export interface AICorrection extends Omit<AICorrectionRow, 'criteria_scores' | 'detected_errors'> {
    criteria_scores: CriteriaScore[]
    detected_errors: DetectedError[]
}

export interface StudentPerformanceSnapshot extends Omit<StudentPerformanceSnapshotRow, 'corrections_history'> {
    corrections_history: CorrectionHistoryEntry[]
}
