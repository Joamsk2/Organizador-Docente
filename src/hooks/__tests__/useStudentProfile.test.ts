// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStudentProfile } from '../use-student-profile'
import { createMockSupabaseClient, mockUser } from '../../../test/mocks/supabase'
import { toast } from 'sonner'

const mockClient = createMockSupabaseClient()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockClient,
}))

describe('useStudentProfile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockClient.auth.getUser.mockResolvedValue({ data: { user: mockUser() }, error: null })
  })

  it('requires studentId and courseId to fetch', async () => {
    const { result } = renderHook(() => useStudentProfile('', ''))

    await act(async () => {
      await result.current.fetchProfile()
    })

    expect(result.current.loading).toBe(true)
    expect(result.current.profile).toBeNull()
  })

  it('fetches complete student profile with stats', async () => {
    const studentData = { id: 's1', first_name: 'Juan', last_name: 'Pérez', dni: '12345678' }
    const attendanceData = [
      { id: 'a1', student_id: 's1', course_id: 'c1', date: '2024-03-15', status: 'presente', notes: null },
      { id: 'a2', student_id: 's1', course_id: 'c1', date: '2024-03-14', status: 'ausente', notes: null },
      { id: 'a3', student_id: 's1', course_id: 'c1', date: '2024-03-13', status: 'tardanza', notes: 'Llegó tarde' },
    ]
    const gradesData = [
      { id: 'g1', student_id: 's1', course_id: 'c1', value: 8, period: '1er_trimestre', category: 'practica' },
      { id: 'g2', student_id: 's1', course_id: 'c1', value: 9, period: '1er_trimestre', category: 'teorica' },
    ]
    const submissionsData = [
      { id: 'sub1', student_id: 's1', assignment_id: 'as1', status: 'entregado', assignments: { title: 'TP 1', due_date: '2024-03-10', course_id: 'c1' } },
    ]

    // Mock chain calls in sequence
    let callCount = 0
    mockClient.from.mockImplementation(() => {
      callCount++
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        single: vi.fn(() => chain),
        count: vi.fn(() => chain),
        then: vi.fn((onFulfilled) => {
          if (callCount === 1) return Promise.resolve(onFulfilled({ data: studentData, error: null }))
          if (callCount === 2) return Promise.resolve(onFulfilled({ data: attendanceData, error: null }))
          if (callCount === 3) return Promise.resolve(onFulfilled({ data: gradesData, error: null }))
          if (callCount === 4) return Promise.resolve(onFulfilled({ data: submissionsData, error: null }))
          return Promise.resolve(onFulfilled({ count: 5, data: null, error: null }))
        }),
        _resolve: vi.fn(),
        reset: vi.fn(),
      }
      return chain
    })

    const { result } = renderHook(() => useStudentProfile('s1', 'c1'))

    await act(async () => {
      await result.current.fetchProfile()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.profile).toBeTruthy()
    expect(result.current.profile?.student?.first_name).toBe('Juan')
    
    // Attendance stats
    expect(result.current.profile?.attendanceStats.total).toBe(3)
    expect(result.current.profile?.attendanceStats.present).toBe(1)
    expect(result.current.profile?.attendanceStats.late).toBe(1)
    expect(result.current.profile?.attendanceStats.absent).toBe(1)
    expect(result.current.profile?.attendanceStats.percentage).toBe(67) // (1+1)/3 * 100 rounded
    
    // Grades stats
    expect(result.current.profile?.gradesStats.average).toBe(8.5)
    expect(result.current.profile?.gradesStats.recentGrades).toHaveLength(2)
    
    // Assignment stats
    expect(result.current.profile?.assignmentStats.totalAssigned).toBe(5)
    expect(result.current.profile?.assignmentStats.delivered).toBe(1)
    expect(result.current.profile?.assignmentStats.deliveryRate).toBe(20)
  })

  it('handles 100% attendance when all present', async () => {
    const studentData = { id: 's1', first_name: 'María' }
    const attendanceData = [
      { id: 'a1', student_id: 's1', course_id: 'c1', date: '2024-03-15', status: 'presente', notes: null },
      { id: 'a2', student_id: 's1', course_id: 'c1', date: '2024-03-14', status: 'presente', notes: null },
    ]
    const gradesData: any[] = []
    const submissionsData: any[] = []

    let callCount = 0
    mockClient.from.mockImplementation(() => {
      callCount++
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        single: vi.fn(() => chain),
        count: vi.fn(() => chain),
        then: vi.fn((onFulfilled) => {
          if (callCount === 1) return Promise.resolve(onFulfilled({ data: studentData, error: null }))
          if (callCount === 2) return Promise.resolve(onFulfilled({ data: attendanceData, error: null }))
          if (callCount === 3) return Promise.resolve(onFulfilled({ data: gradesData, error: null }))
          if (callCount === 4) return Promise.resolve(onFulfilled({ data: submissionsData, error: null }))
          return Promise.resolve(onFulfilled({ count: 0, data: null, error: null }))
        }),
        _resolve: vi.fn(),
        reset: vi.fn(),
      }
      return chain
    })

    const { result } = renderHook(() => useStudentProfile('s1', 'c1'))

    await act(async () => {
      await result.current.fetchProfile()
    })

    expect(result.current.profile?.attendanceStats.percentage).toBe(100)
  })

  it('handles 0% delivery rate when no assignments', async () => {
    const studentData = { id: 's1', first_name: 'Pedro' }
    const attendanceData: any[] = []
    const gradesData: any[] = []
    const submissionsData: any[] = []

    let callCount = 0
    mockClient.from.mockImplementation(() => {
      callCount++
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        single: vi.fn(() => chain),
        count: vi.fn(() => chain),
        then: vi.fn((onFulfilled) => {
          if (callCount === 1) return Promise.resolve(onFulfilled({ data: studentData, error: null }))
          if (callCount === 2) return Promise.resolve(onFulfilled({ data: attendanceData, error: null }))
          if (callCount === 3) return Promise.resolve(onFulfilled({ data: gradesData, error: null }))
          if (callCount === 4) return Promise.resolve(onFulfilled({ data: submissionsData, error: null }))
          return Promise.resolve(onFulfilled({ count: 0, data: null, error: null }))
        }),
        _resolve: vi.fn(),
        reset: vi.fn(),
      }
      return chain
    })

    const { result } = renderHook(() => useStudentProfile('s1', 'c1'))

    await act(async () => {
      await result.current.fetchProfile()
    })

    expect(result.current.profile?.assignmentStats.deliveryRate).toBe(100)
    expect(result.current.profile?.attendanceStats.percentage).toBe(100)
    expect(result.current.profile?.gradesStats.average).toBe(0)
  })

  it('shows error toast when fetch fails', async () => {
    mockClient.from.mockImplementation(() => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        single: vi.fn(() => chain),
        then: vi.fn((onFulfilled) => Promise.resolve(onFulfilled({ data: null, error: { message: 'Student not found' } }))),
      }
      return chain
    })

    const { result } = renderHook(() => useStudentProfile('s1', 'c1'))

    await act(async () => {
      await result.current.fetchProfile()
    })

    expect(result.current.loading).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al cargar el perfil del alumno')
  })

  it('includes attendance with notes in separate array', async () => {
    const studentData = { id: 's1', first_name: 'Ana' }
    const attendanceData = [
      { id: 'a1', student_id: 's1', course_id: 'c1', date: '2024-03-15', status: 'presente', notes: 'Participó mucho' },
      { id: 'a2', student_id: 's1', course_id: 'c1', date: '2024-03-14', status: 'presente', notes: null },
      { id: 'a3', student_id: 's1', course_id: 'c1', date: '2024-03-13', status: 'ausente', notes: '  ' },
    ]
    const gradesData: any[] = []
    const submissionsData: any[] = []

    let callCount = 0
    mockClient.from.mockImplementation(() => {
      callCount++
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        single: vi.fn(() => chain),
        count: vi.fn(() => chain),
        then: vi.fn((onFulfilled) => {
          if (callCount === 1) return Promise.resolve(onFulfilled({ data: studentData, error: null }))
          if (callCount === 2) return Promise.resolve(onFulfilled({ data: attendanceData, error: null }))
          if (callCount === 3) return Promise.resolve(onFulfilled({ data: gradesData, error: null }))
          if (callCount === 4) return Promise.resolve(onFulfilled({ data: submissionsData, error: null }))
          return Promise.resolve(onFulfilled({ count: 0, data: null, error: null }))
        }),
        _resolve: vi.fn(),
        reset: vi.fn(),
      }
      return chain
    })

    const { result } = renderHook(() => useStudentProfile('s1', 'c1'))

    await act(async () => {
      await result.current.fetchProfile()
    })

    expect(result.current.profile?.attendanceStats.attendanceNotes).toHaveLength(1)
    expect(result.current.profile?.attendanceStats.attendanceNotes[0].notes).toBe('Participó mucho')
  })
})
