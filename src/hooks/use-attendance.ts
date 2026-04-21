'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Database } from '@/lib/types/database'

export type AttendanceStatus = Database['public']['Enums']['attendance_status']
export type Attendance = Database['public']['Tables']['attendance']['Row']

export function useAttendance(courseId: string | null, date: string | null) {
    const [attendance, setAttendance] = useState<Attendance[]>([])
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    const fetchAttendance = useCallback(async () => {
        if (!courseId || !date) {
            setAttendance([])
            return
        }

        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('attendance')
                .select('*')
                .eq('course_id', courseId)
                .eq('date', date)

            if (error) throw error
            setAttendance(data || [])
        } catch (error: any) {
            console.error('Error fetching attendance:', error)
            toast.error('Error al cargar asistencia')
        } finally {
            setLoading(false)
        }
    }, [courseId, date, supabase])

    const saveAttendance = async (studentId: string, status: AttendanceStatus, notes?: string) => {
        if (!courseId || !date) return false

        // Find existing record for this student/course/date
        const existing = attendance.find(a => a.student_id === studentId)

        try {
            if (existing) {
                // Update existing
                const { data, error } = await supabase
                    .from('attendance')
                    .update({
                        status,
                        notes: notes !== undefined ? notes : existing.notes
                    })
                    .eq('id', existing.id)
                    .select()
                    .single()

                if (error) throw error
                setAttendance(prev => prev.map(a => a.id === data.id ? data : a))
            } else {
                // Insert new record
                const { data, error } = await supabase
                    .from('attendance')
                    .insert({
                        student_id: studentId,
                        course_id: courseId,
                        date,
                        status,
                        notes: notes || null
                    })
                    .select()
                    .single()

                if (error) throw error
                setAttendance(prev => [...prev, data])
            }
            return true
        } catch (error: any) {
            console.error('Error saving attendance:', error)
            toast.error('Error al guardar asistencia')
            return false
        }
    }

    const deleteAttendance = async (studentId: string) => {
        if (!courseId || !date) return false

        const existing = attendance.find(a => a.student_id === studentId)
        if (!existing) return true

        try {
            const { error } = await supabase
                .from('attendance')
                .delete()
                .eq('id', existing.id)

            if (error) throw error
            setAttendance(prev => prev.filter(a => a.id !== existing.id))
            return true
        } catch (error: any) {
            console.error('Error deleting attendance:', error)
            toast.error('Error al eliminar asistencia')
            return false
        }
    }

    const deleteAllAttendance = async () => {
        if (!courseId || !date) return false

        try {
            const { error } = await supabase
                .from('attendance')
                .delete()
                .eq('course_id', courseId)
                .eq('date', date)

            if (error) throw error
            setAttendance([])
            toast.success('Registros eliminados')
            return true
        } catch (error: any) {
            console.error('Error deleting all attendance:', error)
            toast.error('Error al eliminar registros')
            return false
        }
    }

    return {
        attendance,
        loading,
        fetchAttendance,
        saveAttendance,
        deleteAttendance,
        deleteAllAttendance,
        markAllAsPresent
    }
}
