import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'
import { toast } from 'sonner'

type School = Database['public']['Tables']['schools']['Row']
type InsertSchool = Database['public']['Tables']['schools']['Insert']

export function useSchools() {
    const [schools, setSchools] = useState<School[]>([])
    const [loading, setLoading] = useState(true)

    const fetchSchools = useCallback(async () => {
        setLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
            .from('schools')
            .select('*')
            .order('name')

        if (error) {
            toast.error('Error al cargar escuelas', { description: error.message })
        } else {
            setSchools(data || [])
        }
        setLoading(false)
    }, [])

    const createSchool = async (schoolData: Omit<InsertSchool, 'teacher_id'>) => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return false

        const { error } = await supabase
            .from('schools')
            .insert({ ...schoolData, teacher_id: user.id })

        if (error) {
            toast.error('Error al crear escuela', { description: error.message })
            return false
        }

        toast.success('Escuela creada exitosamente')
        fetchSchools()
        return true
    }

    const updateSchool = async (id: string, updates: Partial<InsertSchool>) => {
        const supabase = createClient()
        const { error } = await supabase
            .from('schools')
            .update(updates)
            .eq('id', id)

        if (error) {
            toast.error('Error al actualizar escuela', { description: error.message })
            return false
        }

        toast.success('Escuela actualizada')
        fetchSchools()
        return true
    }

    const deleteSchool = async (id: string) => {
        const supabase = createClient()
        const { error } = await supabase
            .from('schools')
            .delete()
            .eq('id', id)

        if (error) {
            toast.error('Error al eliminar escuela', { description: error.message })
            return false
        }

        toast.success('Escuela eliminada')
        fetchSchools()
        return true
    }

    return {
        schools,
        loading,
        fetchSchools,
        createSchool,
        updateSchool,
        deleteSchool,
    }
}
