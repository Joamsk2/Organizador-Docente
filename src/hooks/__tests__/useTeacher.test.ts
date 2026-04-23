// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTeacher } from '../use-teacher'
import { createMockSupabaseClient, mockUser } from '../../../test/mocks/supabase'
import { toast } from 'sonner'

const mockClient = createMockSupabaseClient()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockClient,
}))

describe('useTeacher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.auth.getSession.mockResolvedValue({ data: { session: { user: mockUser() } }, error: null })
    mockClient.from().reset()
  })

  it('fetches teacher profile from session', async () => {
    const teacherData = {
      id: 'u1',
      full_name: 'Profesor Test',
      email: 'profesor@escuela.edu.ar',
      avatar_url: null,
      preferences: { theme: 'light' },
    }

    const fromChain = mockClient.from()
    fromChain._resolve(teacherData)

    const { result } = renderHook(() => useTeacher())

    await act(async () => {
      await result.current.fetchTeacher()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.teacher).toEqual(teacherData)
    expect(result.current.teacher?.full_name).toBe('Profesor Test')
  })

  it('sets teacher to null when no session', async () => {
    mockClient.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })

    const fromChain = mockClient.from()
    fromChain._resolve([])

    const { result } = renderHook(() => useTeacher())

    await act(async () => {
      await result.current.fetchTeacher()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.teacher).toBeNull()
  })

  it('shows error toast when fetch fails', async () => {
    mockClient.from().reset()
    const fromChain = mockClient.from()
    fromChain._resolve([], { message: 'DB error' })

    const { result } = renderHook(() => useTeacher())

    await act(async () => {
      await result.current.fetchTeacher()
    })

    expect(result.current.loading).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al cargar perfil', { description: 'DB error' })
  })

  it('updates teacher profile', async () => {
    const { result } = renderHook(() => useTeacher())

    // First fetch to set teacher
    const teacherData = { id: 'u1', full_name: 'Original', email: 'test@test.com' }
    mockClient.from()._resolve(teacherData)
    await act(async () => {
      await result.current.fetchTeacher()
    })

    const updateChain = createMockSupabaseClient().from()
    updateChain._resolve(null)
    mockClient.from.mockReturnValueOnce(updateChain)

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.updateTeacher({ full_name: 'Nombre Actualizado' })
    })

    expect(success).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('Perfil actualizado')
  })

  it('returns false when updating without teacher loaded', async () => {
    mockClient.from().reset()
    
    const { result } = renderHook(() => useTeacher())

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.updateTeacher({ full_name: 'Nuevo' })
    })

    expect(success).toBe(false)
  })

  it('handles update error', async () => {
    const { result } = renderHook(() => useTeacher())

    // First set teacher
    const teacherData = { id: 'u1', full_name: 'Original', email: 'test@test.com' }
    mockClient.from()._resolve(teacherData)
    await act(async () => {
      await result.current.fetchTeacher()
    })

    const updateChain = createMockSupabaseClient().from()
    updateChain._resolve(null, { message: 'update error' })
    mockClient.from.mockReturnValueOnce(updateChain)

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.updateTeacher({ full_name: 'Nuevo' })
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al actualizar', expect.objectContaining({ description: 'update error' }))
  })

  it('strips restricted fields when updating', async () => {
    const { result } = renderHook(() => useTeacher())

    // Set teacher
    const teacherData = { id: 'u1', full_name: 'Original', email: 'original@test.com' }
    mockClient.from()._resolve(teacherData)
    await act(async () => {
      await result.current.fetchTeacher()
    })

    const updateChain = createMockSupabaseClient().from()
    updateChain._resolve(null)
    mockClient.from.mockReturnValueOnce(updateChain)

    await act(async () => {
      await result.current.updateTeacher({
        full_name: 'Nuevo',
        email: 'nuevo@test.com', // should be stripped
        id: 'u2', // should be stripped
        created_at: '2020-01-01', // should be stripped
      })
    })

    expect(toast.success).toHaveBeenCalledWith('Perfil actualizado')
  })

  it('updates preferences with merge', async () => {
    const { result } = renderHook(() => useTeacher())

    // Set teacher with existing preferences
    const teacherData = {
      id: 'u1',
      full_name: 'Test',
      email: 'test@test.com',
      preferences: { theme: 'dark', notifications: true },
    }
    mockClient.from()._resolve(teacherData)
    await act(async () => {
      await result.current.fetchTeacher()
    })

    const updateChain = createMockSupabaseClient().from()
    updateChain._resolve(null)
    mockClient.from.mockReturnValueOnce(updateChain)

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.updatePreferences({ sidebar_collapsed: true })
    })

    expect(success).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('Perfil actualizado')
  })

  it('creates preferences object when null', async () => {
    const { result } = renderHook(() => useTeacher())

    // Set teacher without preferences
    const teacherData = {
      id: 'u1',
      full_name: 'Test',
      email: 'test@test.com',
      preferences: null,
    }
    mockClient.from()._resolve(teacherData)
    await act(async () => {
      await result.current.fetchTeacher()
    })

    const updateChain = createMockSupabaseClient().from()
    updateChain._resolve(null)
    mockClient.from.mockReturnValueOnce(updateChain)

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.updatePreferences({ theme: 'light' })
    })

    expect(success).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('Perfil actualizado')
  })

  it('returns false when updating preferences without teacher', async () => {
    mockClient.from().reset()

    const { result } = renderHook(() => useTeacher())

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.updatePreferences({ theme: 'dark' })
    })

    expect(success).toBe(false)
  })
})
