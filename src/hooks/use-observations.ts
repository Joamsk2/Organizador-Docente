import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Database } from '@/lib/types/database'

type Observation = Database['public']['Tables']['student_observations']['Row'] & {
    teachers: { full_name: string } | null
}

export function useObservations(studentId: string | null, courseId: string | null) {
    const [observations, setObservations] = useState<Observation[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const supabase = createClient()

    const fetchObservations = useCallback(async () => {
        if (!studentId || !courseId) return

        setLoading(true)
        try {
            const { data, error: err } = await supabase
                .from('student_observations')
                .select('*, teachers(full_name)')
                .eq('student_id', studentId)
                .eq('course_id', courseId)
                .order('date', { ascending: false })
                .order('created_at', { ascending: false })

            if (err) throw err
            setObservations(data || [])
        } catch (err) {
            console.error('Error fetching observations:', err)
            setError(err as Error)
            toast.error('Error al cargar las observaciones')
        } finally {
            setLoading(false)
        }
    }, [studentId, courseId, supabase])

    const addObservation = async (content: string, date?: string) => {
        if (!studentId || !courseId) return null

        let useDate = date
        if (!useDate) {
            const d = new Date()
            const year = d.getFullYear()
            const month = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            useDate = `${year}-${month}-${day}`
        }

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No autorizado')

            const { data, error } = await supabase
                .from('student_observations')
                .insert({
                    student_id: studentId,
                    course_id: courseId,
                    teacher_id: user.id,
                    content,
                    date: useDate
                })
                .select('*, teachers(full_name)')
                .single()

            if (error) throw error

            setObservations(prev => [data, ...prev])
            toast.success('Observación guardada')
            return data
        } catch (err) {
            console.error('Error adding observation:', err)
            toast.error('Error al guardar la observación')
            return null
        }
    }

    const deleteObservation = async (id: string) => {
        try {
            const { error } = await supabase
                .from('student_observations')
                .delete()
                .eq('id', id)

            if (error) throw error

            setObservations(prev => prev.filter(obs => obs.id !== id))
            toast.success('Observación eliminada')
            return true
        } catch (err) {
            console.error('Error deleting observation:', err)
            toast.error('Error al eliminar la observación')
            return false
        }
    }

    return {
        observations,
        loading,
        error,
        fetchObservations,
        addObservation,
        deleteObservation
    }
}
