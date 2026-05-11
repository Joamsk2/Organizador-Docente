import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'
import { toast } from 'sonner'
import debounce from 'lodash/debounce'

type Grade = Database['public']['Tables']['grades']['Row']
type InsertGrade = Database['public']['Tables']['grades']['Insert']

export function useGrades(courseId: string | null, period: Database['public']['Enums']['grade_period'] | null) {
    const [grades, setGrades] = useState<Grade[]>([])
    const [loading, setLoading] = useState(false)

    const fetchGrades = useCallback(async () => {
        if (!courseId || !period) {
            setGrades([])
            return
        }

        setLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
            .from('grades')
            .select('*')
            .eq('course_id', courseId)
            .eq('period', period)

        if (error) {
            toast.error('Error al cargar calificaciones', { description: error.message })
        } else {
            setGrades(data || [])
        }
        setLoading(false)
    }, [courseId, period])

    // Save or update a single grade cell. 
    // We don't want to re-fetch all grades on every cell change for performance.
    // We'll optimistically update the state and optionally debounce the API call if needed, 
    // but an explicit save is usually safer. Here we just do it immediately.
    const saveGrade = async (gradeData: InsertGrade) => {
        const supabase = createClient()

        // Check if a grade exists for this exact signature (id, or student+course+period+category)
        let existingGrade = grades.find(g =>
            (gradeData.id && g.id === gradeData.id) ||
            (g.student_id === gradeData.student_id && g.category === gradeData.category)
        )

        let resultError = null
        let resultData = null

        if (existingGrade) {
            // Update
            const { data, error } = await supabase
                .from('grades')
                .update({ 
                    value: gradeData.value, 
                    observations: gradeData.observations,
                    is_qualitative: (gradeData as any).is_qualitative 
                })
                .eq('id', existingGrade.id)
                .select()
                .single()

            resultError = error
            resultData = data
        } else {
            // Insert
            const { data, error } = await supabase
                .from('grades')
                .insert(gradeData)
                .select()
                .single()

            resultError = error
            resultData = data
        }

        if (resultError) {
            toast.error('Error al guardar calificación', { description: resultError.message })
            return null
        }

        // Optimistically update local state
        if (resultData) {
            setGrades(prev => {
                const index = prev.findIndex(g => g.id === resultData!.id)
                if (index >= 0) {
                    const newGrades = [...prev]
                    newGrades[index] = resultData!
                    return newGrades
                } else {
                    return [...prev, resultData!]
                }
            })

            // Reverse sync: Update student_daily_records if it's a daily performance grade
            if (resultData.category.startsWith('Desempeño ')) {
                const GRADE_TO_PERFORMANCE: Record<number, string> = {
                    10: 'excelente',
                    8: 'bien',
                    7: 'regular',
                    4: 'mal'
                }
                const performanceValue = GRADE_TO_PERFORMANCE[resultData.value] || 'bien'
                
                // Extract date from observations "Clase YYYY-MM-DD - ..."
                const match = resultData.observations?.match(/Clase (\d{4}-\d{2}-\d{2})/)
                if (match && match[1]) {
                    const classDate = match[1]
                    
                    // Find class session
                    supabase
                        .from('class_sessions')
                        .select('id')
                        .eq('course_id', resultData.course_id)
                        .eq('date', classDate)
                        .single()
                        .then(({ data: session }) => {
                            if (session) {
                                supabase
                                    .from('student_daily_records')
                                    .update({ performance_score: performanceValue as any })
                                    .eq('session_id', session.id)
                                    .eq('student_id', resultData.student_id)
                                    .then() // Fire and forget
                            }
                        })
                }
            }
        }

        return resultData
    }

    const deleteGrade = async (id: string) => {
        const supabase = createClient()
        const { error } = await supabase
            .from('grades')
            .delete()
            .eq('id', id)

        if (error) {
            toast.error('Error al eliminar calificación', { description: error.message })
            return false
        }

        setGrades(prev => prev.filter(g => g.id !== id))
        return true
    }

    const deleteCategory = async (category: string) => {
        if (!courseId || !period) return false

        const supabase = createClient()
        const { error } = await supabase
            .from('grades')
            .delete()
            .eq('course_id', courseId)
            .eq('period', period)
            .eq('category', category)

        if (error) {
            toast.error('Error al eliminar columna', { description: error.message })
            return false
        }

        setGrades(prev => prev.filter(g => g.category !== category))
        return true
    }

    return {
        grades,
        setGrades, // Exported to allow optimistic updates from outside if needed
        loading,
        fetchGrades,
        saveGrade,
        deleteGrade,
        deleteCategory
    }
}
