import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useAttendance } from '@/hooks/use-attendance'
import { createMockSupabaseClient } from '../../../test/mocks/supabase'
import { toast } from 'sonner'

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/client'

const mockedCreateClient = vi.mocked(createClient)

describe('useAttendance', () => {
  let mockClient: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = createMockSupabaseClient()
    mockedCreateClient.mockReturnValue(mockClient as any)
  })

  it('requires courseId and date to fetch attendance', async () => {
    const { result } = renderHook(() => useAttendance(null, null))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.attendance).toEqual([])
    expect(mockClient.from).not.toHaveBeenCalled()
  })

  it('fetches attendance for a course and date', async () => {
    const attendanceData = [
      { id: 'a1', student_id: 's1', course_id: 'c1', date: '2024-03-15', status: 'presente', notes: null, created_at: '2024-03-15T08:00:00', updated_at: '2024-03-15T08:00:00' },
    ]

    const fromChain = mockClient.from()
    fromChain._resolve(attendanceData)

    const { result } = renderHook(() => useAttendance('c1', '2024-03-15'))

    await act(async () => {
      await result.current.fetchAttendance()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.attendance).toHaveLength(1)
    expect(result.current.attendance[0].status).toBe('presente')
    expect(mockClient.from).toHaveBeenCalledWith('attendance')
  })

  it('shows error toast when fetch fails', async () => {
    const fromChain = mockClient.from()
    fromChain._resolve(null, { message: 'DB error' })

    const { result } = renderHook(() => useAttendance('c1', '2024-03-15'))

    await act(async () => {
      await result.current.fetchAttendance()
    })

    expect(result.current.loading).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al cargar asistencia')
  })

  it('inserts a new attendance record', async () => {
    const fromChain = mockClient.from()
    fromChain._resolve([])

    const { result } = renderHook(() => useAttendance('c1', '2024-03-15'))

    await act(async () => {
      await result.current.fetchAttendance()
    })

    expect(result.current.loading).toBe(false)

    const newRecord = { id: 'a1', student_id: 's1', course_id: 'c1', date: '2024-03-15', status: 'ausente', notes: 'Sin justificar', created_at: '2024-03-15T08:00:00', updated_at: '2024-03-15T08:00:00' }
    const insertChain = mockClient.from()
    insertChain._resolve(newRecord)

    await act(async () => {
      await result.current.saveAttendance('s1', 'ausente', 'Sin justificar')
    })

    expect(result.current.attendance).toHaveLength(1)
    expect(result.current.attendance[0].status).toBe('ausente')
  })

  it('updates an existing attendance record', async () => {
    const existing = { id: 'a1', student_id: 's1', course_id: 'c1', date: '2024-03-15', status: 'ausente', notes: null, created_at: '2024-03-15T08:00:00', updated_at: '2024-03-15T08:00:00' }

    const fromChain = mockClient.from()
    fromChain._resolve([existing])

    const { result } = renderHook(() => useAttendance('c1', '2024-03-15'))

    await act(async () => {
      await result.current.fetchAttendance()
    })

    expect(result.current.loading).toBe(false)

    const updated = { ...existing, status: 'presente' }
    const updateChain = mockClient.from()
    updateChain._resolve(updated)

    await act(async () => {
      await result.current.saveAttendance('s1', 'presente')
    })

    expect(result.current.attendance[0].status).toBe('presente')
  })

  it('deletes an attendance record', async () => {
    const existing = { id: 'a1', student_id: 's1', course_id: 'c1', date: '2024-03-15', status: 'presente', notes: null, created_at: '2024-03-15T08:00:00', updated_at: '2024-03-15T08:00:00' }

    const fromChain = mockClient.from()
    fromChain._resolve([existing])

    const { result } = renderHook(() => useAttendance('c1', '2024-03-15'))

    await act(async () => {
      await result.current.fetchAttendance()
    })

    expect(result.current.loading).toBe(false)

    const deleteChain = mockClient.from()
    deleteChain._resolve(null)

    let deleted: boolean | undefined
    await act(async () => {
      deleted = await result.current.deleteAttendance('s1')
    })

    expect(deleted).toBe(true)
    expect(result.current.attendance).toHaveLength(0)
  })

  it('deletes all attendance for the day', async () => {
    const fromChain = mockClient.from()
    fromChain._resolve([
      { id: 'a1', student_id: 's1', course_id: 'c1', date: '2024-03-15', status: 'presente', notes: null, created_at: '2024-03-15T08:00:00', updated_at: '2024-03-15T08:00:00' },
    ])

    const { result } = renderHook(() => useAttendance('c1', '2024-03-15'))

    await act(async () => {
      await result.current.fetchAttendance()
    })

    expect(result.current.loading).toBe(false)

    const deleteChain = mockClient.from()
    deleteChain._resolve(null)

    let deleted: boolean | undefined
    await act(async () => {
      deleted = await result.current.deleteAllAttendance()
    })

    expect(deleted).toBe(true)
    expect(result.current.attendance).toHaveLength(0)
    expect(toast.success).toHaveBeenCalledWith('Registros eliminados')
  })

  it('marks all students as present only for those without attendance', async () => {
    const existing = { id: 'a1', student_id: 's1', course_id: 'c1', date: '2024-03-15', status: 'ausente', notes: null, created_at: '2024-03-15T08:00:00', updated_at: '2024-03-15T08:00:00' }

    const fromChain = mockClient.from()
    fromChain._resolve([existing])

    const { result } = renderHook(() => useAttendance('c1', '2024-03-15'))

    await act(async () => {
      await result.current.fetchAttendance()
    })

    expect(result.current.loading).toBe(false)

    // s1 already has attendance, s2 does not
    const saveChain = mockClient.from()
    saveChain._resolve({ id: 'a2', student_id: 's2', course_id: 'c1', date: '2024-03-15', status: 'presente', notes: null, created_at: '2024-03-15T08:00:00', updated_at: '2024-03-15T08:00:00' })

    await act(async () => {
      await result.current.markAllAsPresent(['s1', 's2'])
    })

    expect(toast.success).toHaveBeenCalledWith('Asistencia actualizada')
  })

  it('shows error toast when saveAttendance fails', async () => {
    const fromChain = mockClient.from()
    fromChain._resolve([])

    const { result } = renderHook(() => useAttendance('c1', '2024-03-15'))

    await act(async () => {
      await result.current.fetchAttendance()
    })

    expect(result.current.loading).toBe(false)

    const insertChain = mockClient.from()
    insertChain._resolve(null, { message: 'insert error' })

    await act(async () => {
      await result.current.saveAttendance('s1', 'presente')
    })

    expect(toast.error).toHaveBeenCalledWith('Error al guardar asistencia')
  })
})
