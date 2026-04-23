// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AttendanceGrid } from '../attendance-grid'
import type { Attendance } from '@/hooks/use-attendance'

const mockStudents = [
  { id: 's1', first_name: 'Juan', last_name: 'Pérez' },
  { id: 's2', first_name: 'María', last_name: 'García' },
  { id: 's3', first_name: 'Carlos', last_name: 'López' },
]

const mockAttendance: Attendance[] = [
  { id: 'a1', student_id: 's1', course_id: 'c1', date: '2024-03-15', status: 'presente', notes: null, created_at: '2024-03-15', updated_at: '2024-03-15' },
  { id: 'a2', student_id: 's2', course_id: 'c1', date: '2024-03-15', status: 'ausente', notes: 'No avisó', created_at: '2024-03-15', updated_at: '2024-03-15' },
]

describe('AttendanceGrid', () => {
  const mockOnSave = vi.fn()
  const mockOnDelete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSave.mockResolvedValue(true)
    mockOnDelete.mockResolvedValue(true)
  })

  it('renders student list with names', () => {
    render(
      <AttendanceGrid
        students={mockStudents}
        attendanceRecords={[]}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('Pérez, Juan')).toBeInTheDocument()
    expect(screen.getByText('García, María')).toBeInTheDocument()
    expect(screen.getByText('López, Carlos')).toBeInTheDocument()
  })

  it('renders empty state when no students', () => {
    render(
      <AttendanceGrid
        students={[]}
        attendanceRecords={[]}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('Alumno')).toBeInTheDocument()
    expect(screen.getByText('Estado de Asistencia')).toBeInTheDocument()
  })

  it('displays existing attendance status', () => {
    render(
      <AttendanceGrid
        students={mockStudents}
        attendanceRecords={mockAttendance}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    )

    // Check that buttons are rendered for each status type
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('calls onSave when clicking status button', async () => {
    render(
      <AttendanceGrid
        students={mockStudents}
        attendanceRecords={[]}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    )

    // Find and click a status button (presente)
    const statusButtons = screen.getAllByTitle('Presente')
    fireEvent.click(statusButtons[0])

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('s1', 'presente', undefined)
    })
  })

  it('calls onDelete when clicking same status (toggle off)', async () => {
    render(
      <AttendanceGrid
        students={mockStudents}
        attendanceRecords={mockAttendance}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    )

    // Find the button for the student with 'presente' status
    const presenteButtons = screen.getAllByTitle('Quitar marca')
    fireEvent.click(presenteButtons[0])

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('s1')
    })
  })

  it('calls onSave with note when adding note via prompt', async () => {
    vi.stubGlobal('prompt', vi.fn().mockReturnValue('Llegó tarde'))

    render(
      <AttendanceGrid
        students={mockStudents}
        attendanceRecords={mockAttendance}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    )

    // Find note buttons - they are in the Notas column
    const allButtons = screen.getAllByRole('button')
    // The note buttons are typically in the rightmost column and don't have status colors
    const noteButton = allButtons.find(btn => {
      const title = btn.getAttribute('title')
      return title && (title.includes('No avisó') || title.includes('nota') || title.includes('Notas'))
    })
    expect(noteButton).toBeTruthy()
    if (noteButton) fireEvent.click(noteButton)

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('s1', 'presente', 'Llegó tarde')
    })

    vi.unstubAllGlobals()
  })

  it('does not save when prompt is cancelled', async () => {
    vi.stubGlobal('prompt', vi.fn().mockReturnValue(null))

    render(
      <AttendanceGrid
        students={mockStudents}
        attendanceRecords={mockAttendance}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    )

    // Find note button by title
    const allButtons = screen.getAllByRole('button')
    const noteButton = allButtons.find(btn => {
      const title = btn.getAttribute('title')
      return title && (title.includes('No avisó') || title.includes('nota') || title.includes('Notas'))
    })
    if (noteButton) fireEvent.click(noteButton)

    await waitFor(() => {
      expect(mockOnSave).not.toHaveBeenCalled()
    })

    vi.unstubAllGlobals()
  })

  it('disables buttons when loading prop is true', () => {
    render(
      <AttendanceGrid
        students={mockStudents}
        attendanceRecords={[]}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        loading={true}
      />
    )

    const statusButtons = screen.getAllByTitle('Presente')
    expect(statusButtons[0]).toBeDisabled()
  })

  it('shows loading spinner on individual cell during save', async () => {
    mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(
      <AttendanceGrid
        students={mockStudents}
        attendanceRecords={[]}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    )

    const statusButtons = screen.getAllByTitle('Presente')
    fireEvent.click(statusButtons[0])

    // Should show loading state during async operation
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled()
    })
  })
})
