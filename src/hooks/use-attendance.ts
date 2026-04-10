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

    // Bulk operation to mark everyone as present for example
    const markAllAsPresent = async (studentIds: string[]) => {
        if (!courseId || !date) return false

        setLoading(true)
        try {
            // For simplicity in this demo/free tier, we do it in a way that respects existing records
            // but a real app might use a stored procedure or multiple upserts
            for (const studentId of studentIds) {
                const hasAttendance = attendance.some(a => a.student_id === studentId)
                if (!hasAttendance) {
                    await saveAttendance(studentId, 'presente')
                }
            }
            toast.success('Asistencia actualizada')
            return true
        } catch (error) {
            toast.error('Error en operación masiva')
            return false
        } finally {
            setLoading(false)
        }
    }

    return {
        attendance,
        loading,
        fetchAttendance,
        saveAttendance,
        markAllAsPresent
    }
}
