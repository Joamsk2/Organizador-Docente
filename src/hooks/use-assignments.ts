import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'
import { toast } from 'sonner'

export type Assignment = Database['public']['Tables']['assignments']['Row']
export type InsertAssignment = Database['public']['Tables']['assignments']['Insert']
export type AssignmentStatus = Database['public']['Enums']['assignment_status']

export function useAssignments(courseId: string | null) {
    const [assignments, setAssignments] = useState<Assignment[]>([])
    const [loading, setLoading] = useState(true)

    const fetchAssignments = useCallback(async () => {
        if (!courseId) {
            setAssignments([])
            setLoading(false)
            return
        }

        setLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
            .from('assignments')
            .select('*')
            .eq('course_id', courseId)
            .order('due_date', { ascending: true })

        if (error) {
            toast.error('Error al cargar trabajos prácticos', { description: error.message })
        } else {
            setAssignments(data || [])
        }
        setLoading(false)
    }, [courseId])

    const createAssignment = async (assignmentData: InsertAssignment) => {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('assignments')
            .insert(assignmentData)
            .select()
            .single()

        if (error) {
            toast.error('Error al crear trabajo práctico', { description: error.message })
            return null
        }

        setAssignments(prev => [...prev, data])
        toast.success('Trabajo Práctico creado')
        return data
    }

    const updateAssignment = async (id: string, updates: Partial<InsertAssignment>) => {
        const supabase = createClient()

        // Optimistic UI update
        setAssignments(prev => prev.map(a => a.id === id ? { ...a, ...updates, updated_at: new Date().toISOString() } : a))

        const { error } = await supabase
            .from('assignments')
            .update(updates)
            .eq('id', id)

        if (error) {
            toast.error('Error al actualizar trabajo práctico', { description: error.message })
            fetchAssignments() // Revert on error by refetching
            return false
        }

        return true
    }

    const updateAssignmentStatus = async (id: string, newStatus: AssignmentStatus) => {
        return updateAssignment(id, { status: newStatus })
    }

    const deleteAssignment = async (id: string) => {
        const supabase = createClient()
        const { error } = await supabase
            .from('assignments')
            .delete()
            .eq('id', id)

        if (error) {
            toast.error('Error al eliminar trabajo práctico', { description: error.message })
            return false
        }

        setAssignments(prev => prev.filter(a => a.id !== id))
        toast.success('Trabajo Práctico eliminado')
        return true
    }

    return {
        assignments,
        loading,
        fetchAssignments,
        createAssignment,
        updateAssignment,
        updateAssignmentStatus,
        deleteAssignment
    }
}
