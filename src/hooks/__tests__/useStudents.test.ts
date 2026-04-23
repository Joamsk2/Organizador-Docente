import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useStudents } from '@/hooks/use-students'
import { createMockSupabaseClient, mockUser } from '../../../test/mocks/supabase'
import { toast } from 'sonner'

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/client'

const mockedCreateClient = vi.mocked(createClient)

describe('useStudents', () => {
  let mockClient: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = createMockSupabaseClient()
    mockedCreateClient.mockReturnValue(mockClient as any)
  })

  it('fetches and filters students by courseId', async () => {
    const studentsData = [
      {
        id: 's1',
        first_name: 'Ana',
        last_name: 'García',
        teacher_id: 't1',
        created_at: '2024-01-01',
        course_students: [
          { id: 'cs1', status: 'activo', course_id: 'c1', courses: { id: 'c1', name: 'Matemática', year: '1', division: 'A' } },
        ],
      },
      {
        id: 's2',
        first_name: 'Luis',
        last_name: 'Pérez',
        teacher_id: 't1',
        created_at: '2024-01-01',
        course_students: [
          { id: 'cs2', status: 'activo', course_id: 'c2', courses: { id: 'c2', name: 'Lengua', year: '2', division: 'B' } },
        ],
      },
    ]

    mockClient.auth.getUser.mockResolvedValue({ data: { user: mockUser() }, error: null })
    const fromChain = mockClient.from()
    fromChain._resolve(studentsData)

    const { result } = renderHook(() => useStudents('c1'))

    await act(async () => {
      await result.current.fetchStudents()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.students).toHaveLength(1)
    expect(result.current.students[0].id).toBe('s1')
    expect(mockClient.from).toHaveBeenCalledWith('students')
  })

  it('shows error toast when fetch fails', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: mockUser() }, error: null })
    const fromChain = mockClient.from()
    fromChain._resolve([], { message: 'DB error' })

    const { result } = renderHook(() => useStudents())

    await act(async () => {
      await result.current.fetchStudents()
    })

    expect(result.current.loading).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al cargar alumnos', { description: 'DB error' })
  })

  it('creates a student and enrolls in courses', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: mockUser() }, error: null })
    const newStudent = { id: 's3', first_name: 'María', last_name: 'Lopez' }

    const studentChain = createMockSupabaseClient().from()
    const enrollmentChain = createMockSupabaseClient().from()
    
    mockedCreateClient.mockReturnValue({
      ...mockClient,
      from: vi.fn()
        .mockReturnValueOnce(studentChain)
        .mockReturnValueOnce(enrollmentChain)
        .mockReturnValue(mockClient.from())
    } as any)

    studentChain._resolve(newStudent)
    enrollmentChain._resolve(null)

    const { result } = renderHook(() => useStudents())

    let created: boolean | undefined
    await act(async () => {
      created = await result.current.createStudent(
        { first_name: 'María', last_name: 'Lopez' },
        ['c1']
      )
    })

    expect(created).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('Alumno creado exitosamente')
  })

  it('shows error toast if enrollment fails in createStudent', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: mockUser() }, error: null })
    
    const studentChain = createMockSupabaseClient().from()
    const enrollmentChain = createMockSupabaseClient().from()
    
    mockedCreateClient.mockReturnValue({
      ...mockClient,
      from: vi.fn()
        .mockReturnValueOnce(studentChain)
        .mockReturnValueOnce(enrollmentChain)
        .mockReturnValue(mockClient.from())
    } as any)

    studentChain._resolve({ id: 's3' })
    enrollmentChain._resolve(null, { message: 'Enroll error' })

    const { result } = renderHook(() => useStudents())

    await act(async () => {
      await result.current.createStudent({ first_name: 'María' }, ['c1'])
    })

    expect(toast.error).toHaveBeenCalledWith('Alumno creado, pero hubo un error al matricularlo en algunos cursos')
  })

  it('returns false when createStudent fails due to missing user', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const { result } = renderHook(() => useStudents())

    let created: boolean | undefined
    await act(async () => {
      created = await result.current.createStudent(
        { first_name: 'María', last_name: 'Lopez' },
        []
      )
    })

    expect(created).toBe(false)
  })

  it('updates student and syncs course enrollments', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: mockUser() }, error: null })

    const updateChain = mockClient.from()
    updateChain._resolve(null)

    const existingChain = mockClient.from()
    existingChain._resolve([{ course_id: 'c1' }])

    const addChain = mockClient.from()
    addChain._resolve(null)

    const { result } = renderHook(() => useStudents())

    let updated: boolean | undefined
    await act(async () => {
      updated = await result.current.updateStudent('s1', { first_name: 'Ana María' }, ['c1', 'c2'])
    })

    expect(updated).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('Alumno actualizado')
  })

  it('deletes a student', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: mockUser() }, error: null })

    const deleteChain = mockClient.from()
    deleteChain._resolve(null)

    const { result } = renderHook(() => useStudents())

    let deleted: boolean | undefined
    await act(async () => {
      deleted = await result.current.deleteStudent('s1')
    })

    expect(deleted).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('Alumno eliminado')
  })

  it('imports multiple students in bulk and enrolls them', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: mockUser() }, error: null })
    const newStudents = [
      { id: 's4', first_name: 'Juan', last_name: 'Doe' },
      { id: 's5', first_name: 'Jane', last_name: 'Smith' },
    ]

    // We need to handle two different 'from' calls.
    // We create fresh mock clients to get fresh chains
    const studentChain = createMockSupabaseClient().from()
    const enrollChain = createMockSupabaseClient().from()
    
    mockedCreateClient.mockReturnValue({
      ...mockClient,
      from: vi.fn()
        .mockReturnValueOnce(studentChain)
        .mockReturnValueOnce(enrollChain)
        .mockReturnValue(mockClient.from())
    } as any)

    studentChain._resolve(newStudents)
    enrollChain._resolve(null)

    const { result } = renderHook(() => useStudents())

    let imported: boolean | undefined
    await act(async () => {
      imported = await result.current.createStudentsBulk(
        [{ first_name: 'Juan', last_name: 'Doe' }, { first_name: 'Jane', last_name: 'Smith' }],
        ['c1']
      )
    })

    expect(imported).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('2 alumnos importados exitosamente')
  })

  it('shows warning toast if enrollment fails in bulk import', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: mockUser() }, error: null })
    
    const studentChain = createMockSupabaseClient().from()
    const enrollmentChain = createMockSupabaseClient().from()
    
    mockedCreateClient.mockReturnValue({
      ...mockClient,
      from: vi.fn()
        .mockReturnValueOnce(studentChain)
        .mockReturnValueOnce(enrollmentChain)
        .mockReturnValue(mockClient.from())
    } as any)

    studentChain._resolve([{ id: 's4' }])
    enrollmentChain._resolve(null, { message: 'Bulk enroll error' })

    const { result } = renderHook(() => useStudents())

    await act(async () => {
      await result.current.createStudentsBulk([{ first_name: 'Juan' }], ['c1'])
    })

    expect(toast.error).toHaveBeenCalledWith('Alumnos creados, pero hubo un error al matricularlos en algunos cursos')
  })

  it('removes course enrollments during updateStudent', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: mockUser() }, error: null })

    const updateChain = createMockSupabaseClient().from()
    const selectChain = createMockSupabaseClient().from()
    const deleteChain = createMockSupabaseClient().from()
    
    mockedCreateClient.mockReturnValue({
      ...mockClient,
      from: vi.fn()
        .mockReturnValueOnce(updateChain)
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(deleteChain)
        .mockReturnValue(mockClient.from())
    } as any)

    updateChain._resolve(null)
    selectChain._resolve([{ course_id: 'c1' }, { course_id: 'c2' }])
    deleteChain._resolve(null)

    const { result } = renderHook(() => useStudents())

    await act(async () => {
      // Removing 'c2', keeping 'c1'
      await result.current.updateStudent('s1', { first_name: 'New' }, ['c1'])
    })

    expect(deleteChain.delete).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Alumno actualizado')
  })

  it('shows error toast when createStudent database call fails', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: mockUser() }, error: null })
    const fromChain = mockClient.from()
    fromChain._resolve(null, { message: 'Database failure' })

    const { result } = renderHook(() => useStudents())

    let created: boolean | undefined
    await act(async () => {
      created = await result.current.createStudent({ first_name: 'Fail', last_name: 'User' }, [])
    })

    expect(created).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al crear alumno', expect.objectContaining({ description: 'Database failure' }))
  })

  it('shows error toast when bulk import fails', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: mockUser() }, error: null })
    const fromChain = mockClient.from()
    fromChain._resolve(null, { message: 'Bulk failure' })

    const { result } = renderHook(() => useStudents())

    let imported: boolean | undefined
    await act(async () => {
      imported = await result.current.createStudentsBulk([{ first_name: 'Fail', last_name: 'User' }], [])
    })

    expect(imported).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al importar alumnos', expect.objectContaining({ description: 'Bulk failure' }))
  })

  it('handles update error correctly', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: mockUser() }, error: null })
    const fromChain = mockClient.from()
    fromChain._resolve(null, { message: 'Update failed' })

    const { result } = renderHook(() => useStudents())

    let updated: boolean | undefined
    await act(async () => {
      updated = await result.current.updateStudent('s1', { first_name: 'New Name' }, [])
    })

    expect(updated).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al actualizar alumno', expect.objectContaining({ description: 'Update failed' }))
  })

  it('handles delete error correctly', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: mockUser() }, error: null })
    const fromChain = mockClient.from()
    fromChain._resolve(null, { message: 'Delete failed' })

    const { result } = renderHook(() => useStudents())

    let deleted: boolean | undefined
    await act(async () => {
      deleted = await result.current.deleteStudent('s1')
    })

    expect(deleted).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Error al eliminar alumno', expect.objectContaining({ description: 'Delete failed' }))
  })
})
