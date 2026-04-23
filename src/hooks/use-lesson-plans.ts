'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'
import { toast } from 'sonner'

export type LessonPlan = Database['public']['Tables']['lesson_plans']['Row']
export type LessonPlanType = Database['public']['Enums']['lesson_plan_type']

export type LessonPlanWithStats = LessonPlan & {
    assignments_count: number
}

export function useLessonPlans(courseIdFilter?: string) {
    const [plans, setPlans] = useState<LessonPlanWithStats[]>([])
    const [loading, setLoading] = useState(true)

    const fetchPlans = useCallback(async () => {
        setLoading(true)
        const supabase = createClient()

        let query = supabase
            .from('lesson_plans')
            .select(`
        *,
        lesson_plan_assignments (count)
      `)
            .order('created_at', { ascending: false })

        if (courseIdFilter) {
            query = query.eq('course_id', courseIdFilter)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching lesson plans:', error)
            toast.error('Error al cargar planificaciones')
        } else {
            // Transform data to include the count nicely
            const formatted = (data || []).map(plan => ({
                ...plan,
                assignments_count: plan.lesson_plan_assignments?.[0]?.count || 0
            })) as unknown as LessonPlanWithStats[]

            setPlans(formatted)
        }

        setLoading(false)
    }, [courseIdFilter])

    const createPlan = async (
        planData: Omit<Database['public']['Tables']['lesson_plans']['Insert'], 'id' | 'created_at' | 'updated_at'>,
        assignmentIds?: string[]
    ) => {
        const supabase = createClient()

        // 1. Insert plan
        const { data: newPlan, error: planError } = await supabase
            .from('lesson_plans')
            .insert(planData)
            .select()
            .single()

        if (planError) {
            console.error('Error creating plan:', planError)
            toast.error('Error al crear la planificación')
            return false
        }

        // 2. Link assignments if any
        if (assignmentIds && assignmentIds.length > 0 && newPlan) {
            const links = assignmentIds.map(aId => ({
                lesson_plan_id: newPlan.id,
                assignment_id: aId
            }))

            const { error: linkError } = await supabase
                .from('lesson_plan_assignments')
                .insert(links)

            if (linkError) {
                console.error('Error linking assignments:', linkError)
                toast.warning('Planificación creada, pero hubo un error vinculando los TPs')
            }
        }

        toast.success('Planificación creada')
        fetchPlans()
        return true
    }

    const updatePlan = async (
        id: string,
        updates: Partial<Database['public']['Tables']['lesson_plans']['Update']>,
        newAssignmentIds?: string[]
    ) => {
        const supabase = createClient()

        // 1. Update basic info
        const { error } = await supabase
            .from('lesson_plans')
            .update(updates)
            .eq('id', id)

        if (error) {
            console.error('Error updating plan:', error)
            toast.error('Error al actualizar la planificación')
            return false
        }

        // 2. Handle linked assignments logic if provided
        if (newAssignmentIds !== undefined) {
            // Fetch existing
            const { data: existingLinks } = await supabase
                .from('lesson_plan_assignments')
                .select('assignment_id')
                .eq('lesson_plan_id', id)

            const existingIds = existingLinks?.map(l => l.assignment_id) || []
            const toAdd = newAssignmentIds.filter(id => !existingIds.includes(id))
            const toRemove = existingIds.filter(id => !newAssignmentIds.includes(id))

            if (toAdd.length > 0) {
                await supabase.from('lesson_plan_assignments').insert(
                    toAdd.map(aId => ({ lesson_plan_id: id, assignment_id: aId }))
                )
            }

            if (toRemove.length > 0) {
                await supabase
                    .from('lesson_plan_assignments')
                    .delete()
                    .eq('lesson_plan_id', id)
                    .in('assignment_id', toRemove)
            }
        }

        toast.success('Planificación actualizada')
        fetchPlans()
        return true
    }

    const deletePlan = async (id: string) => {
        const supabase = createClient()

        // Deleting the plan will cascade delete the lesson_plan_assignments 
        // based on our DB setup.
        const { error } = await supabase
            .from('lesson_plans')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting plan:', error)
            toast.error('Error al eliminar la planificación')
            return false
        }

        toast.success('Planificación eliminada')
        fetchPlans()
        return true
    }

    return {
        plans,
        loading,
        fetchPlans,
        createPlan,
        updatePlan,
        deletePlan
    }
}
