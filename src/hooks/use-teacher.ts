import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'
import { toast } from 'sonner'

export type Teacher = Database['public']['Tables']['teachers']['Row']

export function useTeacher() {
    const [teacher, setTeacher] = useState<Teacher | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchTeacher = useCallback(async () => {
        setLoading(true)
        const supabase = createClient()
        
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) {
                setTeacher(null)
                return
            }

            const { data, error } = await supabase
                .from('teachers')
                .select('*')
                .eq('id', session.user.id)
                .single()

            if (error) throw error
            if (data) setTeacher(data)
        } catch (error: any) {
            console.error('Error fetching teacher:', error)
            toast.error('Error al cargar perfil', { description: error.message })
        } finally {
            setLoading(false)
        }
    }, [])

    const updateTeacher = async (updates: Partial<Teacher>) => {
        if (!teacher?.id) return false

        const supabase = createClient()
        try {
            // Remove email since it should be updated via auth, and id since it's PK
            const { id, email, created_at, ...safeUpdates } = updates as any

            const { error } = await supabase
                .from('teachers')
                .update({ ...safeUpdates, updated_at: new Date().toISOString() })
                .eq('id', teacher.id)

            if (error) throw error

            setTeacher(prev => prev ? { ...prev, ...safeUpdates } : null)
            toast.success('Perfil actualizado')
            return true
        } catch (error: any) {
            console.error('Error updating teacher:', error)
            toast.error('Error al actualizar', { description: error.message })
            return false
        }
    }

    const updatePreferences = async (newPreferences: any) => {
        if (!teacher?.id) return false
        
        const currentPrefs = typeof teacher.preferences === 'object' && teacher.preferences !== null 
            ? teacher.preferences 
            : {}

        const mergedPrefs = {
            ...currentPrefs,
            ...newPreferences
        }

        return updateTeacher({ preferences: mergedPrefs as any })
    }

    return {
        teacher,
        loading,
        fetchTeacher,
        updateTeacher,
        updatePreferences
    }
}
