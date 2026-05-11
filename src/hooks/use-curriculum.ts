'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'
import { toast } from 'sonner'

export type CurriculumModule = Database['public']['Tables']['curriculum_modules']['Row']
export type CurriculumTopic = Database['public']['Tables']['curriculum_topics']['Row']

export type ModuleWithTopics = CurriculumModule & {
    topics: CurriculumTopic[]
}

export function useCurriculum(courseId?: string) {
    const [modules, setModules] = useState<ModuleWithTopics[]>([])
    const [loading, setLoading] = useState(true)

    const fetchCurriculum = useCallback(async (silent = false) => {
        if (!courseId) return
        
        if (!silent) setLoading(true)
        const supabase = createClient()

        // Fetch modules with their topics
        const { data: modulesData, error: modulesError } = await supabase
            .from('curriculum_modules')
            .select(`
                *,
                curriculum_topics (*)
            `)
            .eq('course_id', courseId)
            .order('order_index', { ascending: true })

        if (modulesError) {
            console.error('Error fetching curriculum:', modulesError)
            toast.error('Error al cargar la planificación anual')
        } else {
            // Sort topics within modules
            const formattedModules = (modulesData || []).map(mod => ({
                ...mod,
                topics: (mod.curriculum_topics as unknown as CurriculumTopic[]).sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
            }))
            
            setModules(formattedModules)
        }

        setLoading(false)
    }, [courseId])

    const createModule = async (title: string, description?: string) => {
        if (!courseId) return null
        const supabase = createClient()
        
        // get next order index
        const order_index = modules.length

        const { data, error } = await supabase
            .from('curriculum_modules')
            .insert({
                course_id: courseId,
                title,
                description,
                order_index
            })
            .select()
            .single()

        if (error) {
            toast.error('Error al crear el módulo')
            return null
        }
        
        toast.success('Módulo creado')
        fetchCurriculum(true)
        return data
    }

    const updateModule = async (id: string, updates: Partial<CurriculumModule>) => {
        const supabase = createClient()
        const { error } = await supabase
            .from('curriculum_modules')
            .update(updates)
            .eq('id', id)

        if (error) {
            toast.error('Error al actualizar el módulo')
            return false
        }
        
        toast.success('Módulo actualizado')
        fetchCurriculum(true)
        return true
    }

    const deleteModule = async (id: string) => {
        const supabase = createClient()
        const { error } = await supabase
            .from('curriculum_modules')
            .delete()
            .eq('id', id)

        if (error) {
            toast.error('Error al eliminar el módulo')
            return false
        }
        
        toast.success('Módulo eliminado')
        fetchCurriculum(true)
        return true
    }

    const createTopic = async (moduleId: string, title: string, description?: string) => {
        const supabase = createClient()
        
        const moduleToUpdate = modules.find(m => m.id === moduleId)
        const order_index = moduleToUpdate?.topics.length || 0

        const { data, error } = await supabase
            .from('curriculum_topics')
            .insert({
                module_id: moduleId,
                title,
                description,
                order_index
            })
            .select()
            .single()

        if (error) {
            toast.error('Error al crear el tema')
            return null
        }
        
        toast.success('Tema creado')
        fetchCurriculum(true)
        return data
    }

    const updateTopic = async (id: string, updates: Partial<CurriculumTopic>) => {
        // Optimistic update
        const oldModules = [...modules]
        const newModules = modules.map(mod => ({
            ...mod,
            topics: mod.topics.map(topic => 
                topic.id === id ? { ...topic, ...updates } : topic
            )
        }))
        setModules(newModules)

        const supabase = createClient()
        const { error } = await supabase
            .from('curriculum_topics')
            .update(updates)
            .eq('id', id)

        if (error) {
            toast.error('Error al actualizar el tema')
            setModules(oldModules)
            return false
        }
        
        fetchCurriculum(true)
        return true
    }

    const deleteTopic = async (id: string) => {
        const supabase = createClient()
        const { error } = await supabase
            .from('curriculum_topics')
            .delete()
            .eq('id', id)

        if (error) {
            toast.error('Error al eliminar el tema')
            return false
        }
        
        toast.success('Tema eliminado')
        fetchCurriculum(true)
        return true
    }

    // Function to reorder modules and topics
    const reorderModules = async (reorderedIds: string[]) => {
        if (!courseId) return

        // Optimistic update
        const oldModules = [...modules]
        const newModules = reorderedIds.map((id, index) => {
            const mod = modules.find(m => m.id === id)!
            return { ...mod, order_index: index }
        }).sort((a, b) => a.order_index - b.order_index)
        
        setModules(newModules)

        const supabase = createClient()
        const updates = reorderedIds.map((id, index) => ({
            id,
            order_index: index,
        }))
        
        const { error } = await supabase
            .from('curriculum_modules')
            .upsert(updates as any)

        if (error) {
            console.error('Error reordering modules:', error)
            toast.error('Error al guardar el nuevo orden de módulos')
            setModules(oldModules) // Rollback
        }
    }

    const reorderTopics = async (moduleId: string, reorderedIds: string[]) => {
        // Optimistic update
        const oldModules = [...modules]
        const newModules = modules.map(mod => {
            if (mod.id !== moduleId) return mod
            
            const newTopics = reorderedIds.map((id, index) => {
                const topic = mod.topics.find(t => t.id === id)!
                return { ...topic, order_index: index }
            }).sort((a, b) => a.order_index - b.order_index)
            
            return { ...mod, topics: newTopics }
        })
        
        setModules(newModules)

        const supabase = createClient()
        const updates = reorderedIds.map((id, index) => ({
            id,
            order_index: index,
        }))
        
        const { error } = await supabase
            .from('curriculum_topics')
            .upsert(updates as any)

        if (error) {
            console.error('Error reordering topics:', error)
            toast.error('Error al guardar el nuevo orden de temas')
            setModules(oldModules) // Rollback
        }
    }

    return {
        modules,
        loading,
        fetchCurriculum,
        createModule,
        updateModule,
        deleteModule,
        createTopic,
        updateTopic,
        deleteTopic,
        reorderModules,
        reorderTopics
    }
}
