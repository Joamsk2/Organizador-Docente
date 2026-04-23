// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLessonPlans } from '../use-lesson-plans'
import { createMockSupabaseClient } from '../../../test/mocks/supabase'
import { toast } from 'sonner'

const mockClient = createMockSupabaseClient()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockClient,
}))

describe('useLessonPlans', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.from().reset()
  })

  it('fetches lesson plans for a course', async () => {
    const plansData = [
      { id: 'lp1', title: 'Plan 1', course_id: 'c1', lesson_plan_assignments: [{ count: 2 }] },
      { id: 'lp2', title: 'Plan 2', course_id: 'c1', lesson_plan_assignments: [{ count: 0 }] },
    ]

    const fromChain = mockClient.from()
    fromChain._resolve(plansData)

    const { result } = renderHook(() => useLessonPlans('c1'))

    await act(async () => {
      await result.current.fetchPlans()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.plans).toHaveLength(2)
    expect(result.current.plans[0].title).toBe('Plan 1')
    expect(result.current.plans[0].assignments_count).toBe(2)
  })

  it('fetches all lesson plans when no course filter', async () => {
    const plansData = [
      { id: 'lp1', title: 'Plan 1', course_id: 'c1', lesson_plan_assignments: [{ count: 0 }] },
    ]

    const fromChain = mockClient.from()
    fromChain._resolve(plansData)

    const { result } = renderHook(() => useLessonPlans())

    await act(async () => {
      await result.current.fetchPlans()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.plans).toHaveLength(1)
  })

  it('shows error toast when fetch fails', async () => {
    const fromChain = mockClient.from()
    fromChain._resolve([], { message: 'DB error' })

    const { result } = renderHook(() => useLessonPlans('c1'))

    await act(async () => {
      await result.current.fetchPlans()
    })

    expect(result.current.loading).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al cargar planificaciones')
  })

  it('creates a lesson plan without assignments', async () => {
    mockClient.from().reset()
    const newPlan = { id: 'lp1', title: 'Nuevo Plan', course_id: 'c1', content_html: '<p>Contenido</p>' }
    
    const insertChain = mockClient.from()
    insertChain._resolve([newPlan])

    const { result } = renderHook(() => useLessonPlans('c1'))

    const planData = {
      title: 'Nuevo Plan',
      course_id: 'c1',
      type: 'clase',
      content_html: '<p>Contenido</p>',
      planned_date: '2024-03-15',
    }

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.createPlan(planData)
    })

    expect(success).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('Planificación creada')
  })

  it('creates a lesson plan with linked assignments', async () => {
    mockClient.from().reset()
    const newPlan = { id: 'lp1', title: 'Nuevo Plan', course_id: 'c1' }
    
    const insertChain = mockClient.from()
    insertChain._resolve([newPlan])
    
    const linkChain = mockClient.from()
    linkChain._resolve(null)

    const { result } = renderHook(() => useLessonPlans('c1'))

    const planData = {
      title: 'Nuevo Plan',
      course_id: 'c1',
      type: 'clase',
      content_html: '',
      planned_date: '2024-03-15',
    }

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.createPlan(planData, ['a1', 'a2'])
    })

    expect(success).toBe(true)
  })

  it('handles create plan error', async () => {
    mockClient.from().reset()
    const insertChain = mockClient.from()
    insertChain._resolve(null, { message: 'insert error' })

    const { result } = renderHook(() => useLessonPlans('c1'))

    const planData = {
      title: 'Nuevo Plan',
      course_id: 'c1',
      type: 'clase',
      content_html: '',
      planned_date: '2024-03-15',
    }

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.createPlan(planData)
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al crear la planificación')
  })

  it('updates a lesson plan and links assignments', async () => {
    mockClient.from().reset()
    
    const updateChain = mockClient.from()
    updateChain._resolve(null)
    
    const existingLinks = [{ assignment_id: 'a1' }]
    const fetchChain = mockClient.from()
    fetchChain._resolve(existingLinks)

    const { result } = renderHook(() => useLessonPlans('c1'))

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.updatePlan('lp1', { title: 'Plan Actualizado' }, ['a1', 'a2'])
    })

    expect(success).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('Planificación actualizada')
  })

  it('deletes a lesson plan', async () => {
    mockClient.from().reset()
    const deleteChain = mockClient.from()
    deleteChain._resolve(null)

    const { result } = renderHook(() => useLessonPlans('c1'))

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deletePlan('lp1')
    })

    expect(success).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('Planificación eliminada')
  })

  it('handles delete error', async () => {
    mockClient.from().reset()
    const deleteChain = mockClient.from()
    deleteChain._resolve(null, { message: 'delete error' })

    const { result } = renderHook(() => useLessonPlans('c1'))

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deletePlan('lp1')
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al eliminar la planificación')
  })
})
