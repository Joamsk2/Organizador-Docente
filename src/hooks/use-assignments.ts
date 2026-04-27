import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'
import { toast } from 'sonner'
import type { EvaluationCriterion, ReferenceMaterial } from '@/components/assignments/assignment-form'

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

    /**
     * Creates an assignment with optional evaluation criteria and reference materials.
     * After creation, fires a background pre-digest so the AI is ready to correct.
     */
    const createAssignment = async (
        assignmentData: InsertAssignment,
        criteria: EvaluationCriterion[] = [],
        materials: ReferenceMaterial[] = []
    ) => {
        const supabase = createClient()

        // 1. Create the assignment
        const { data: newAssignment, error } = await supabase
            .from('assignments')
            .insert(assignmentData)
            .select()
            .single()

        if (error) {
            toast.error('Error al crear trabajo práctico', { description: error.message })
            return null
        }

        // 2. Save criteria as reference material (if any)
        if (criteria.length > 0) {
            const { error: criteriaError } = await supabase
                .from('assignment_reference_materials')
                .insert({
                    assignment_id: newAssignment.id,
                    material_type: 'evaluation_criteria',
                    title: 'Criterios de Evaluación',
                    content_text: JSON.stringify(criteria),
                })

            if (criteriaError) {
                console.error('Error saving criteria:', criteriaError.message)
            }
        }

        // 3. Save the description as "instructions" material
        if (assignmentData.description?.trim()) {
            await supabase.from('assignment_reference_materials').insert({
                assignment_id: newAssignment.id,
                material_type: 'instructions',
                title: 'Consigna del Trabajo',
                content_text: assignmentData.description,
            })
        }

        // 4. Upload files and save text materials
        for (const material of materials) {
            if (material.type === 'text' && material.content) {
                await supabase.from('assignment_reference_materials').insert({
                    assignment_id: newAssignment.id,
                    material_type: 'reading_material',
                    title: material.title,
                    content_text: material.content,
                })
            } else if (material.type === 'file' && material.file) {
                try {
                    const fileExt = material.file.name.split('.').pop()
                    const filePath = `${newAssignment.id}/${Date.now()}.${fileExt}`
                    const { error: uploadError } = await supabase.storage
                        .from('assignments')
                        .upload(filePath, material.file)

                    if (!uploadError) {
                        const { data: urlData } = supabase.storage.from('assignments').getPublicUrl(filePath)
                        await supabase.from('assignment_reference_materials').insert({
                            assignment_id: newAssignment.id,
                            material_type: 'reading_material',
                            title: material.title,
                            file_url: urlData.publicUrl,
                        })
                    }
                } catch (e) {
                    console.error('Error uploading material file:', e)
                }
            }
        }

        setAssignments(prev => [...prev, newAssignment])
        toast.success('Trabajo Práctico creado', { description: 'La IA está procesando el material en segundo plano.' })

        // 5. Fire pre-digest in background (no await, non-blocking)
        fetch('/api/ai/pre-digest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assignment_id: newAssignment.id }),
        }).catch(() => { /* silent fail — can retry on demand */ })

        return newAssignment
    }

    const updateAssignment = async (
        id: string,
        updates: Partial<InsertAssignment>,
        criteria: EvaluationCriterion[] = [],
        materials: ReferenceMaterial[] = []
    ) => {
        const supabase = createClient()

        // 1. Update the main assignment record
        const { error: updateError } = await supabase
            .from('assignments')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (updateError) {
            toast.error('Error al actualizar trabajo práctico', { description: updateError.message })
            return false
        }

        // 2. Synchronize materials (Delete old ones and re-insert to ensure consistency)
        // We delete all types to avoid complex diffing, as the form provides the full state
        await supabase
            .from('assignment_reference_materials')
            .delete()
            .eq('assignment_id', id)

        // 3. Save criteria as reference material
        if (criteria.length > 0) {
            await supabase.from('assignment_reference_materials').insert({
                assignment_id: id,
                material_type: 'evaluation_criteria',
                title: 'Criterios de Evaluación',
                content_text: JSON.stringify(criteria),
            })
        }

        // 4. Save the description as "instructions" material
        if (updates.description?.trim()) {
            await supabase.from('assignment_reference_materials').insert({
                assignment_id: id,
                material_type: 'instructions',
                title: 'Consigna del Trabajo',
                content_text: updates.description,
            })
        }

        // 5. Upload new files and save text/existing materials
        for (const material of materials) {
            if (material.type === 'text' && material.content) {
                await supabase.from('assignment_reference_materials').insert({
                    assignment_id: id,
                    material_type: 'reading_material',
                    title: material.title,
                    content_text: material.content,
                })
            } else if (material.type === 'file') {
                if (material.file) {
                    // New file upload
                    try {
                        const fileExt = material.file.name.split('.').pop()
                        const filePath = `${id}/${Date.now()}.${fileExt}`
                        const { error: uploadError } = await supabase.storage
                            .from('assignments')
                            .upload(filePath, material.file)

                        if (!uploadError) {
                            const { data: urlData } = supabase.storage.from('assignments').getPublicUrl(filePath)
                            await supabase.from('assignment_reference_materials').insert({
                                assignment_id: id,
                                material_type: 'reading_material',
                                title: material.title,
                                file_url: urlData.publicUrl,
                            })
                        }
                    } catch (e) {
                        console.error('Error uploading new material file:', e)
                    }
                } else if (material.url) {
                    // Keep existing file reference
                    await supabase.from('assignment_reference_materials').insert({
                        assignment_id: id,
                        material_type: 'reading_material',
                        title: material.title,
                        file_url: material.url,
                    })
                }
            }
        }

        // 6. Finalize
        setAssignments(prev => prev.map(a => a.id === id ? { ...a, ...updates, updated_at: new Date().toISOString() } : a))
        toast.success('Trabajo Práctico actualizado')

        // 7. Fire pre-digest in background
        fetch('/api/ai/pre-digest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assignment_id: id }),
        }).catch(() => { /* silent fail */ })

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
