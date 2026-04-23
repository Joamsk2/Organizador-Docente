// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSchools } from '../use-schools'
import { createMockSupabaseClient, mockUser } from '../../../test/mocks/supabase'
import { toast } from 'sonner'

const mockClient = createMockSupabaseClient()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockClient,
}))

describe('useSchools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getUser.mockResolvedValue({ data: { user: mockUser() }, error: null })
    mockClient.from().reset()
  })

  it('fetches schools ordered by name', async () => {
    const schoolsData = [
      { id: 's1', name: 'Escuela Primaria A', teacher_id: 't1', address: null, phone: null },
      { id: 's2', name: 'Escuela Secundaria B', teacher_id: 't1', address: null, phone: null },
    ]

    const fromChain = mockClient.from()
    fromChain._resolve(schoolsData)

    const { result } = renderHook(() => useSchools())

    await act(async () => {
      await result.current.fetchSchools()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.schools).toHaveLength(2)
    expect(result.current.schools[0].name).toBe('Escuela Primaria A')
  })

  it('shows error toast when fetch fails', async () => {
    const fromChain = mockClient.from()
    fromChain._resolve([], { message: 'DB error' })

    const { result } = renderHook(() => useSchools())

    await act(async () => {
      await result.current.fetchSchools()
    })

    expect(result.current.loading).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al cargar escuelas', { description: 'DB error' })
  })

  it('creates a school with teacher_id from user', async () => {
    mockClient.from().reset()
    const insertChain = mockClient.from()
    insertChain._resolve(null)

    const { result } = renderHook(() => useSchools())

    const schoolData = { name: 'Nueva Escuela', address: 'Calle 123', phone: '555-1234' }
    
    let success: boolean | undefined
    await act(async () => {
      success = await result.current.createSchool(schoolData)
    })

    expect(success).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('Escuela creada exitosamente')
  })

  it('returns false when creating school without user', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    mockClient.from().reset()

    const { result } = renderHook(() => useSchools())

    const schoolData = { name: 'Nueva Escuela' }
    
    let success: boolean | undefined
    await act(async () => {
      success = await result.current.createSchool(schoolData)
    })

    expect(success).toBe(false)
  })

  it('handles create school error', async () => {
    mockClient.from().reset()
    const insertChain = mockClient.from()
    insertChain._resolve(null, { message: 'insert error' })

    const { result } = renderHook(() => useSchools())

    const schoolData = { name: 'Nueva Escuela' }
    
    let success: boolean | undefined
    await act(async () => {
      success = await result.current.createSchool(schoolData)
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al crear escuela', { description: 'insert error' })
  })

  it('updates a school', async () => {
    mockClient.from().reset()
    const updateChain = mockClient.from()
    updateChain._resolve(null)

    const { result } = renderHook(() => useSchools())

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.updateSchool('s1', { name: 'Escuela Actualizada', address: 'Nueva dirección' })
    })

    expect(success).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('Escuela actualizada')
  })

  it('handles update error', async () => {
    mockClient.from().reset()
    const updateChain = mockClient.from()
    updateChain._resolve(null, { message: 'update error' })

    const { result } = renderHook(() => useSchools())

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.updateSchool('s1', { name: 'Escuela Actualizada' })
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al actualizar escuela', { description: 'update error' })
  })

  it('deletes a school', async () => {
    mockClient.from().reset()
    const deleteChain = mockClient.from()
    deleteChain._resolve(null)

    const { result } = renderHook(() => useSchools())

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteSchool('s1')
    })

    expect(success).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('Escuela eliminada')
  })

  it('handles delete error', async () => {
    mockClient.from().reset()
    const deleteChain = mockClient.from()
    deleteChain._resolve(null, { message: 'delete error' })

    const { result } = renderHook(() => useSchools())

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteSchool('s1')
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al eliminar escuela', { description: 'delete error' })
  })
})
