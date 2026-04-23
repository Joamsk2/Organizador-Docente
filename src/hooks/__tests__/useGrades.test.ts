import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useGrades } from '@/hooks/use-grades'
import { createMockSupabaseClient } from '../../../test/mocks/supabase'
import { toast } from 'sonner'

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/client'

const mockedCreateClient = vi.mocked(createClient)

describe('useGrades', () => {
  let mockClient: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = createMockSupabaseClient()
    mockedCreateClient.mockReturnValue(mockClient as any)
  })

  it('requires courseId and period to fetch grades', async () => {
    const { result } = renderHook(() => useGrades(null, null))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.grades).toEqual([])
    expect(mockClient.from).not.toHaveBeenCalled()
  })

  it('fetches grades for a course and period', async () => {
    const gradesData = [
      { id: 'g1', student_id: 's1', course_id: 'c1', period: '1er_trimestre', category: 'parcial', value: 8, observations: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
    ]

    const fromChain = mockClient.from()
    fromChain._resolve(gradesData)

    const { result } = renderHook(() => useGrades('c1', '1er_trimestre'))

    await act(async () => {
      await result.current.fetchGrades()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.grades).toHaveLength(1)
    expect(result.current.grades[0].value).toBe(8)
    expect(mockClient.from).toHaveBeenCalledWith('grades')
  })

  it('shows error toast when fetch fails', async () => {
    const fromChain = mockClient.from()
    fromChain._resolve(null, { message: 'DB error' })

    const { result } = renderHook(() => useGrades('c1', '1er_trimestre'))

    await act(async () => {
      await result.current.fetchGrades()
    })

    expect(result.current.loading).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al cargar calificaciones', { description: 'DB error' })
  })

  it('updates an existing grade', async () => {
    const existingGrade = { id: 'g1', student_id: 's1', course_id: 'c1', period: '1er_trimestre', category: 'parcial', value: 8, observations: null, created_at: '2024-01-01', updated_at: '2024-01-01' }

    // fetch
    const fetchChain = mockClient.from()
    fetchChain._resolve([existingGrade])

    const { result } = renderHook(() => useGrades('c1', '1er_trimestre'))

    await act(async () => {
      await result.current.fetchGrades()
    })

    expect(result.current.loading).toBe(false)

    // update
    const updatedGrade = { ...existingGrade, value: 9 }
    const updateChain = mockClient.from()
    updateChain._resolve(updatedGrade)

    let saved: any
    await act(async () => {
      saved = await result.current.saveGrade({
        id: 'g1',
        student_id: 's1',
        course_id: 'c1',
        period: '1er_trimestre',
        category: 'parcial',
        value: 9,
      } as any)
    })

    expect(saved).not.toBeNull()
    expect(result.current.grades[0].value).toBe(9)
  })

  it('inserts a new grade when no existing grade matches', async () => {
    const fetchChain = mockClient.from()
    fetchChain._resolve([])

    const { result } = renderHook(() => useGrades('c1', '1er_trimestre'))

    await act(async () => {
      await result.current.fetchGrades()
    })

    expect(result.current.loading).toBe(false)

    const newGrade = { id: 'g2', student_id: 's2', course_id: 'c1', period: '1er_trimestre', category: 'tp', value: 7, observations: null, created_at: '2024-01-01', updated_at: '2024-01-01' }
    const insertChain = mockClient.from()
    insertChain._resolve(newGrade)

    let saved: any
    await act(async () => {
      saved = await result.current.saveGrade({
        student_id: 's2',
        course_id: 'c1',
        period: '1er_trimestre',
        category: 'tp',
        value: 7,
      } as any)
    })

    expect(saved).not.toBeNull()
    expect(result.current.grades).toHaveLength(1)
  })

  it('deletes a grade optimistically', async () => {
    const existingGrade = { id: 'g1', student_id: 's1', course_id: 'c1', period: '1er_trimestre', category: 'parcial', value: 8, observations: null, created_at: '2024-01-01', updated_at: '2024-01-01' }

    const fetchChain = mockClient.from()
    fetchChain._resolve([existingGrade])

    const { result } = renderHook(() => useGrades('c1', '1er_trimestre'))

    await act(async () => {
      await result.current.fetchGrades()
    })

    expect(result.current.loading).toBe(false)

    const deleteChain = mockClient.from()
    deleteChain._resolve(null)

    let deleted: boolean | undefined
    await act(async () => {
      deleted = await result.current.deleteGrade('g1')
    })

    expect(deleted).toBe(true)
    expect(result.current.grades).toHaveLength(0)
  })

  it('shows error toast when saveGrade fails', async () => {
    const fetchChain = mockClient.from()
    fetchChain._resolve([])

    const { result } = renderHook(() => useGrades('c1', '1er_trimestre'))

    await act(async () => {
      await result.current.fetchGrades()
    })

    expect(result.current.loading).toBe(false)

    const insertChain = mockClient.from()
    insertChain._resolve(null, { message: 'insert error' })

    await act(async () => {
      await result.current.saveGrade({
        student_id: 's2',
        course_id: 'c1',
        period: '1er_trimestre',
        category: 'tp',
        value: 7,
      } as any)
    })

    expect(toast.error).toHaveBeenCalledWith('Error al guardar calificación', { description: 'insert error' })
  })
})
