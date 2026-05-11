'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'
import { toast } from 'sonner'

export type ClassSession = Database['public']['Tables']['class_sessions']['Row']
export type ClassMaterial = Database['public']['Tables']['class_materials']['Row']
export type CurriculumTopic = Database['public']['Tables']['curriculum_topics']['Row']

export type ClassSessionWithDetails = ClassSession & {
    topics: CurriculumTopic[]
    materials: ClassMaterial[]
}

export function useClassSessions(courseId?: string) {
    const [sessions, setSessions] = useState<ClassSessionWithDetails[]>([])
    const [loading, setLoading] = useState(true)

    const fetchSessions = useCallback(async () => {
        if (!courseId) return
        
        setLoading(true)
        const supabase = createClient()

        // Fetch sessions with materials and topics
        const { data: sessionsData, error: sessionsError } = await supabase
            .from('class_sessions')
            .select(`
                *,
                class_materials (*),
                class_session_topics (
                    curriculum_topics (*)
                )
            `)
            .eq('course_id', courseId)
            .order('date', { ascending: false })

        if (sessionsError) {
            console.error('Error fetching class sessions:', sessionsError)
            toast.error('Error al cargar la bitácora de clases')
        } else {
            // Format the response
            const formattedSessions = (sessionsData || []).map(session => ({
                ...session,
                materials: (session.class_materials as unknown as ClassMaterial[]).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)),
                topics: session.class_session_topics
                    ? (session.class_session_topics as any[]).map(st => st.curriculum_topics).filter(Boolean)
                    : []
            }))
            
            setSessions(formattedSessions)
        }

        setLoading(false)
    }, [courseId])

    const createSession = async (
        sessionData: Pick<ClassSession, 'date' | 'title' | 'teacher_notes' | 'instructions'>, 
        topicIds: string[] = []
    ) => {
        if (!courseId) return null
        const supabase = createClient()
        
        // 1. Create Session
        const { data: session, error: sessionError } = await supabase
            .from('class_sessions')
            .insert({
                ...sessionData,
                course_id: courseId
            })
            .select()
            .single()

        if (sessionError) {
            toast.error('Error al crear la sesión de clase')
            return null
        }
        
        // 2. Link Topics
        if (topicIds.length > 0) {
            const topicLinks = topicIds.map(topic_id => ({
                class_session_id: session.id,
                topic_id
            }))
            
            const { error: topicsError } = await supabase
                .from('class_session_topics')
                .insert(topicLinks)
                
            if (topicsError) {
                console.error('Error linking topics:', topicsError)
                toast.warning('Clase creada, pero hubo un error vinculando los temas')
            } else {
                // Update topic statuses to 'completado' or 'en_curso' optionally
                // Assuming marking a topic in a past class makes it completed
            }
        }
        
        toast.success('Clase registrada en la bitácora')
        fetchSessions()
        return session
    }

    const updateSession = async (
        id: string, 
        updates: Partial<ClassSession>,
        newTopicIds?: string[]
    ) => {
        const supabase = createClient()
        
        // 1. Update basic info
        if (Object.keys(updates).length > 0) {
            const { error } = await supabase
                .from('class_sessions')
                .update(updates)
                .eq('id', id)

            if (error) {
                toast.error('Error al actualizar la clase')
                return false
            }
        }
        
        // 2. Update topics if provided
        if (newTopicIds !== undefined) {
            // Delete existing links
            await supabase.from('class_session_topics').delete().eq('class_session_id', id)
            
            // Insert new links
            if (newTopicIds.length > 0) {
                const topicLinks = newTopicIds.map(topic_id => ({
                    class_session_id: id,
                    topic_id
                }))
                await supabase.from('class_session_topics').insert(topicLinks)
            }
        }
        
        toast.success('Clase actualizada')
        fetchSessions()
        return true
    }

    const deleteSession = async (id: string) => {
        if (!courseId) return false
        const supabase = createClient()
        
        // Fetch session date before deleting to know which grades to delete
        const { data: sessionData } = await supabase
            .from('class_sessions')
            .select('date')
            .eq('id', id)
            .single()

        const { error } = await supabase
            .from('class_sessions')
            .delete()
            .eq('id', id)

        if (error) {
            toast.error('Error al eliminar la clase')
            return false
        }
        
        // Also delete associated grades for that date
        if (sessionData?.date) {
            const [, month, day] = sessionData.date.split('-')
            const formattedDate = `${day}/${month}`
            
            await supabase
                .from('grades')
                .delete()
                .eq('course_id', courseId as string)
                .eq('category', `Desempeño ${formattedDate}`)
        }

        toast.success('Clase eliminada')
        fetchSessions()
        return true
    }

    // Material Management
    const addMaterial = async (
        sessionId: string, 
        material: Pick<ClassMaterial, 'type' | 'title' | 'content'>
    ) => {
        const supabase = createClient()
        
        // Get session from state to find next order index
        const session = sessions.find(s => s.id === sessionId)
        const order_index = session?.materials.length || 0

        const { data, error } = await supabase
            .from('class_materials')
            .insert({
                ...material,
                class_session_id: sessionId,
                order_index
            })
            .select()
            .single()

        if (error) {
            toast.error('Error al agregar el material')
            return null
        }
        
        fetchSessions()
        return data
    }
    
    const removeMaterial = async (materialId: string) => {
        const supabase = createClient()
        const { error } = await supabase
            .from('class_materials')
            .delete()
            .eq('id', materialId)

        if (error) {
            toast.error('Error al eliminar el material')
            return false
        }
        
        fetchSessions()
        return true
    }

    return {
        sessions,
        loading,
        fetchSessions,
        createSession,
        updateSession,
        deleteSession,
        addMaterial,
        removeMaterial
    }
}
