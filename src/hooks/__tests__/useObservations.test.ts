// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useObservations } from '../use-observations'
import { createMockSupabaseClient, mockUser } from '../../../test/mocks/supabase'
import { toast } from 'sonner'

const mockClient = createMockSupabaseClient()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockClient,
}))

describe('useObservations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({ data: { user: mockUser() }, error: null })
    mockClient.from().reset()
  })

  it('requires studentId and courseId to fetch', async () => {
    const { result } = renderHook(() => useObservations(null, null))

    await act(async () => {
      await result.current.fetchObservations()
    })

    expect(result.current.loading).toBe(true)
    expect(result.current.observations).toEqual([])
  })

  it('fetches observations with teacher names', async () => {
    const observationsData = [
      { id: 'o1', content: 'Buen desempeño', student_id: 's1', course_id: 'c1', date: '2024-03-15', teachers: { full_name: 'Profesor A' } },
      { id: 'o2', content: 'Faltó clase', student_id: 's1', course_id: 'c1', date: '2024-03-10', teachers: { full_name: 'Profesor B' } },
    ]

    const fromChain = mockClient.from()
    fromChain._resolve(observationsData)

    const { result } = renderHook(() => useObservations('s1', 'c1'))

    await act(async () => {
      await result.current.fetchObservations()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.observations).toHaveLength(2)
    expect(result.current.observations[0].content).toBe('Buen desempeño')
    expect(result.current.observations[0].teachers?.full_name).toBe('Profesor A')
  })

  it('shows error toast when fetch fails', async () => {
    const fromChain = mockClient.from()
    fromChain._resolve([], { message: 'DB error' })

    const { result } = renderHook(() => useObservations('s1', 'c1'))

    await act(async () => {
      await result.current.fetchObservations()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeTruthy()
    expect(toast.error).toHaveBeenCalledWith('Error al cargar las observaciones')
  })

  it('adds an observation with provided date', async () => {
    mockClient.from().reset()
    const newObservation = {
      id: 'o1',
      content: 'Nueva observación',
      student_id: 's1',
      course_id: 'c1',
      date: '2024-03-20',
      teachers: { full_name: 'Test User' },
    }
    
    const insertChain = createMockSupabaseClient().from()
    insertChain._resolve(newObservation)
    mockClient.from.mockReturnValueOnce(insertChain)

    const { result } = renderHook(() => useObservations('s1', 'c1'))

    let data: any
    await act(async () => {
      data = await result.current.addObservation('Nueva observación', '2024-03-20')
    })

    expect(data).toBeTruthy()
    expect(data?.content).toBe('Nueva observación')
    expect(data?.date).toBe('2024-03-20')
    expect(toast.success).toHaveBeenCalledWith('Observación guardada')
  })

  it('adds an observation with default date when not provided', async () => {
    mockClient.from().reset()
    const newObservation = {
      id: 'o1',
      content: 'Observación hoy',
      student_id: 's1',
      course_id: 'c1',
      date: expect.any(String),
      teachers: { full_name: 'Test User' },
    }
    
    const insertChain = createMockSupabaseClient().from()
    insertChain._resolve(newObservation)
    mockClient.from.mockReturnValueOnce(insertChain)

    const { result } = renderHook(() => useObservations('s1', 'c1'))

    let data: any
    await act(async () => {
      data = await result.current.addObservation('Observación hoy')
    })

    expect(data).toBeTruthy()
  })

  it('returns null when adding observation without studentId or courseId', async () => {
    const { result } = renderHook(() => useObservations(null, null))

    let data: any
    await act(async () => {
      data = await result.current.addObservation('Observación')
    })

    expect(data).toBeNull()
  })

  it('handles add observation error when not authenticated', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    mockClient.from().reset()

    const { result } = renderHook(() => useObservations('s1', 'c1'))

    let data: any
    await act(async () => {
      data = await result.current.addObservation('Observación')
    })

    expect(data).toBeNull()
    expect(toast.error).toHaveBeenCalledWith('Error al guardar la observación')
  })

  it('deletes an observation and removes from state', async () => {
    const initialObservations = [
      { id: 'o1', content: 'Obs 1', student_id: 's1', course_id: 'c1' },
      { id: 'o2', content: 'Obs 2', student_id: 's1', course_id: 'c1' },
    ]

    const fromChain = mockClient.from()
    fromChain._resolve(initialObservations)

    const { result } = renderHook(() => useObservations('s1', 'c1'))

    await act(async () => {
      await result.current.fetchObservations()
    })

    mockClient.from().reset()
    const deleteChain = mockClient.from()
    deleteChain._resolve(null)

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteObservation('o1')
    })

    expect(success).toBe(true)
    expect(result.current.observations).toHaveLength(1)
    expect(result.current.observations[0].id).toBe('o2')
    expect(toast.success).toHaveBeenCalledWith('Observación eliminada')
  })

  it('handles delete error', async () => {
    mockClient.from().reset()
    const deleteChain = mockClient.from()
    deleteChain._resolve(null, { message: 'delete error' })

    const { result } = renderHook(() => useObservations('s1', 'c1'))

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteObservation('o1')
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al eliminar la observación')
  })
})
