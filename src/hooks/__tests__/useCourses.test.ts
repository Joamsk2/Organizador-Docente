// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCourses } from '../use-courses'
import { createMockSupabaseClient, mockUser } from '../../../test/mocks/supabase'
import { toast } from 'sonner'

const mockClient = createMockSupabaseClient()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockClient,
}))

describe('useCourses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.from().reset()
  })

  it('fetches courses for a school', async () => {
    const coursesData = [
      { id: 'c1', name: 'Matemática', year: '1', division: 'A', school_id: 's1', course_schedules: [] },
      { id: 'c2', name: 'Lengua', year: '2', division: 'B', school_id: 's1', course_schedules: [] },
    ]

    const fromChain = mockClient.from()
    fromChain._resolve(coursesData)

    const { result } = renderHook(() => useCourses('s1'))

    await act(async () => {
      await result.current.fetchCourses()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.courses).toHaveLength(2)
    expect(result.current.courses[0].name).toBe('Matemática')
    expect(mockClient.from).toHaveBeenCalledWith('courses')
  })

  it('fetches all courses when no schoolId provided', async () => {
    const coursesData = [
      { id: 'c1', name: 'Matemática', year: '1', division: 'A', school_id: 's1', course_schedules: [] },
    ]

    const fromChain = mockClient.from()
    fromChain._resolve(coursesData)

    const { result } = renderHook(() => useCourses())

    await act(async () => {
      await result.current.fetchCourses()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.courses).toHaveLength(1)
  })

  it('shows error toast when fetch fails', async () => {
    const fromChain = mockClient.from()
    fromChain._resolve([], { message: 'DB error' })

    const { result } = renderHook(() => useCourses('s1'))

    await act(async () => {
      await result.current.fetchCourses()
    })

    expect(result.current.loading).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al cargar cursos', { description: 'DB error' })
  })

  it('creates a course with schedules', async () => {
    mockClient.from().reset()
    const newCourse = { id: 'c1', name: 'Historia', year: '3', division: 'A', school_id: 's1' }
    
    // First call: insert course
    const insertChain = mockClient.from()
    insertChain._resolve([newCourse])
    
    // Second call: insert schedules
    const scheduleChain = mockClient.from()
    scheduleChain._resolve(null)

    const { result } = renderHook(() => useCourses('s1'))

    const courseData = { name: 'Historia', year: '3', division: 'A', school_id: 's1', subject: 'HIS' }
    const schedulesData = [{ day: 'Lunes', start_time: '08:00', end_time: '10:00' }]

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.createCourse(courseData, schedulesData)
    })

    expect(success).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('Curso creado exitosamente')
  })

  it('handles course creation error', async () => {
    mockClient.from().reset()
    const insertChain = mockClient.from()
    insertChain._resolve(null, { message: 'insert error' })

    const { result } = renderHook(() => useCourses('s1'))

    const courseData = { name: 'Historia', year: '3', division: 'A', school_id: 's1' }
    
    let success: boolean | undefined
    await act(async () => {
      success = await result.current.createCourse(courseData, [])
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al crear curso', { description: 'insert error' })
  })

  it('updates a course and replaces schedules', async () => {
    mockClient.from().reset()
    
    // First: update course
    const updateChain = mockClient.from()
    updateChain._resolve(null)
    
    // Second: delete schedules
    const deleteChain = mockClient.from()
    deleteChain._resolve(null)
    
    // Third: insert new schedules
    const insertChain = mockClient.from()
    insertChain._resolve(null)

    const { result } = renderHook(() => useCourses('s1'))

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.updateCourse('c1', { name: 'Matemática Avanzada' }, [])
    })

    expect(success).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('Curso actualizado')
  })

  it('deletes a course', async () => {
    mockClient.from().reset()
    const deleteChain = mockClient.from()
    deleteChain._resolve(null)

    const { result } = renderHook(() => useCourses('s1'))

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteCourse('c1')
    })

    expect(success).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('Curso eliminado')
  })

  it('handles delete error', async () => {
    mockClient.from().reset()
    const deleteChain = mockClient.from()
    deleteChain._resolve(null, { message: 'delete error' })

    const { result } = renderHook(() => useCourses('s1'))

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteCourse('c1')
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al eliminar curso', { description: 'delete error' })
  })
})
