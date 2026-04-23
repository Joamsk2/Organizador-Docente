// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAssignments } from '../use-assignments'
import { createMockSupabaseClient } from '../../../test/mocks/supabase'
import { toast } from 'sonner'

const mockClient = createMockSupabaseClient()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockClient,
}))

describe('useAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.from().reset()
  })

  it('requires courseId to fetch assignments', async () => {
    const { result } = renderHook(() => useAssignments(null))

    await act(async () => {
      await result.current.fetchAssignments()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.assignments).toEqual([])
  })

  it('fetches assignments for a course', async () => {
    const assignmentsData = [
      { id: 'a1', title: 'TP 1', course_id: 'c1', status: 'borrador', due_date: '2024-03-20' },
      { id: 'a2', title: 'TP 2', course_id: 'c1', status: 'activo', due_date: '2024-03-25' },
    ]

    const fromChain = mockClient.from()
    fromChain._resolve(assignmentsData)

    const { result } = renderHook(() => useAssignments('c1'))

    await act(async () => {
      await result.current.fetchAssignments()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.assignments).toHaveLength(2)
    expect(result.current.assignments[0].title).toBe('TP 1')
  })

  it('shows error toast when fetch fails', async () => {
    const fromChain = mockClient.from()
    fromChain._resolve([], { message: 'DB error' })

    const { result } = renderHook(() => useAssignments('c1'))

    await act(async () => {
      await result.current.fetchAssignments()
    })

    expect(result.current.loading).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al cargar trabajos prácticos', { description: 'DB error' })
  })

  it('creates an assignment and adds to state', async () => {
    mockClient.from().reset()
    const newAssignment = { id: 'a1', title: 'Nuevo TP', course_id: 'c1', status: 'borrador' }
    
    const insertChain = createMockSupabaseClient().from()
    insertChain._resolve(newAssignment)
    mockClient.from.mockReturnValueOnce(insertChain)

    const { result } = renderHook(() => useAssignments('c1'))

    const assignmentData = {
      title: 'Nuevo TP',
      course_id: 'c1',
      type: 'trabajo_practico',
      status: 'borrador',
      due_date: '2024-03-20',
    }

    let data: any
    await act(async () => {
      data = await result.current.createAssignment(assignmentData)
    })

    expect(data).toEqual(newAssignment)
    expect(result.current.assignments).toHaveLength(1)
    expect(toast.success).toHaveBeenCalledWith('Trabajo Práctico creado')
  })

  it('handles create assignment error', async () => {
    mockClient.from().reset()
    const insertChain = mockClient.from()
    insertChain._resolve(null, { message: 'insert error' })

    const { result } = renderHook(() => useAssignments('c1'))

    const assignmentData = { title: 'Nuevo TP', course_id: 'c1', type: 'trabajo_practico' }

    let data: any
    await act(async () => {
      data = await result.current.createAssignment(assignmentData)
    })

    expect(data).toBeNull()
    expect(toast.error).toHaveBeenCalledWith('Error al crear trabajo práctico', { description: 'insert error' })
  })

  it('updates an assignment optimistically', async () => {
    mockClient.from().reset()
    const initialAssignments = [{ id: 'a1', title: 'TP Original', status: 'borrador' }]
    
    const selectChain = mockClient.from()
    selectChain._resolve(initialAssignments)

    const { result } = renderHook(() => useAssignments('c1'))

    await act(async () => {
      await result.current.fetchAssignments()
    })

    const updateChain = mockClient.from()
    updateChain._resolve(null)

    await act(async () => {
      await result.current.updateAssignment('a1', { title: 'TP Actualizado' })
    })

    expect(result.current.assignments[0].title).toBe('TP Actualizado')
  })

  it('reverts optimistic update on error', async () => {
    mockClient.from().reset()
    const initialAssignments = [{ id: 'a1', title: 'TP Original', status: 'borrador' }]
    
    const selectChain = mockClient.from()
    selectChain._resolve(initialAssignments)

    const { result } = renderHook(() => useAssignments('c1'))

    await act(async () => {
      await result.current.fetchAssignments()
    })

    const updateChain = createMockSupabaseClient().from()
    updateChain._resolve(null, { message: 'update error' })
    
    const refetchChain = createMockSupabaseClient().from()
    refetchChain._resolve(initialAssignments)

    mockClient.from
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(refetchChain)

    await act(async () => {
      await result.current.updateAssignment('a1', { title: 'TP Actualizado' })
    })

    expect(toast.error).toHaveBeenCalledWith('Error al actualizar trabajo práctico', { description: 'update error' })
  })

  it('updates assignment status', async () => {
    mockClient.from().reset()
    const initialAssignments = [{ id: 'a1', title: 'TP 1', status: 'borrador' }]
    
    const selectChain = mockClient.from()
    selectChain._resolve(initialAssignments)

    const { result } = renderHook(() => useAssignments('c1'))

    await act(async () => {
      await result.current.fetchAssignments()
    })

    const updateChain = mockClient.from()
    updateChain._resolve(null)

    await act(async () => {
      await result.current.updateAssignmentStatus('a1', 'activo')
    })

    expect(result.current.assignments[0].status).toBe('activo')
  })

  it('deletes an assignment and removes from state', async () => {
    mockClient.from().reset()
    const initialAssignments = [
      { id: 'a1', title: 'TP 1' },
      { id: 'a2', title: 'TP 2' },
    ]
    
    const selectChain = mockClient.from()
    selectChain._resolve(initialAssignments)

    const { result } = renderHook(() => useAssignments('c1'))

    await act(async () => {
      await result.current.fetchAssignments()
    })

    const deleteChain = mockClient.from()
    deleteChain._resolve(null)

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteAssignment('a1')
    })

    expect(success).toBe(true)
    expect(result.current.assignments).toHaveLength(1)
    expect(result.current.assignments[0].id).toBe('a2')
    expect(toast.success).toHaveBeenCalledWith('Trabajo Práctico eliminado')
  })

  it('handles delete error', async () => {
    mockClient.from().reset()
    const initialAssignments = [{ id: 'a1', title: 'TP 1' }]
    
    const selectChain = mockClient.from()
    selectChain._resolve(initialAssignments)

    const { result } = renderHook(() => useAssignments('c1'))

    await act(async () => {
      await result.current.fetchAssignments()
    })

    const deleteChain = mockClient.from()
    deleteChain._resolve(null, { message: 'delete error' })

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteAssignment('a1')
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al eliminar trabajo práctico', { description: 'delete error' })
  })
})
