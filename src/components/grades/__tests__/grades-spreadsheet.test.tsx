// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GradesSpreadsheet } from '../grades-spreadsheet'
import type { Database } from '@/lib/types/database'
import { toast } from 'sonner'

const mockStudents = [
  { id: 's1', first_name: 'Juan', last_name: 'Pérez', course_students: [], grades: [] },
  { id: 's2', first_name: 'María', last_name: 'García', course_students: [], grades: [] },
]

const mockGrades: Database['public']['Tables']['grades']['Row'][] = [
  { id: 'g1', student_id: 's1', course_id: 'c1', period: '1er_trimestre', category: 'Práctica', value: 8, created_at: '2024-03-15', updated_at: '2024-03-15' },
  { id: 'g2', student_id: 's1', course_id: 'c1', period: '1er_trimestre', category: 'Teórica', value: 9, created_at: '2024-03-15', updated_at: '2024-03-15' },
  { id: 'g3', student_id: 's2', course_id: 'c1', period: '1er_trimestre', category: 'Práctica', value: 6, created_at: '2024-03-15', updated_at: '2024-03-15' },
]

describe('GradesSpreadsheet', () => {
  const mockOnSaveGrade = vi.fn()
  const mockOnDeleteGrade = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSaveGrade.mockResolvedValue({})
    mockOnDeleteGrade.mockResolvedValue({})
  })

  it('renders loading state', () => {
    render(
      <GradesSpreadsheet
        courseId="c1"
        period="1er_trimestre"
        students={mockStudents}
        grades={[]}
        loading={true}
        onSaveGrade={mockOnSaveGrade}
        onDeleteGrade={mockOnDeleteGrade}
      />
    )

    expect(screen.getByText('Cargando planilla de calificaciones...')).toBeInTheDocument()
  })

  it('renders empty state when no students', () => {
    render(
      <GradesSpreadsheet
        courseId="c1"
        period="1er_trimestre"
        students={[]}
        grades={[]}
        loading={false}
        onSaveGrade={mockOnSaveGrade}
        onDeleteGrade={mockOnDeleteGrade}
      />
    )

    expect(screen.getByText('Este curso no tiene alumnos matriculados.')).toBeInTheDocument()
  })

  it('renders student names and columns from grades', async () => {
    render(
      <GradesSpreadsheet
        courseId="c1"
        period="1er_trimestre"
        students={mockStudents}
        grades={mockGrades}
        loading={false}
        onSaveGrade={mockOnSaveGrade}
        onDeleteGrade={mockOnDeleteGrade}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Pérez, Juan')).toBeInTheDocument()
      expect(screen.getByText('García, María')).toBeInTheDocument()
      expect(screen.getByText(/Práctica/i)).toBeInTheDocument()
      expect(screen.getByText(/Teórica/i)).toBeInTheDocument()
    })
  })

  it('displays existing grades in input cells', async () => {
    render(
      <GradesSpreadsheet
        courseId="c1"
        period="1er_trimestre"
        students={mockStudents}
        grades={mockGrades}
        loading={false}
        onSaveGrade={mockOnSaveGrade}
        onDeleteGrade={mockOnDeleteGrade}
      />
    )

    await waitFor(() => {
      const inputs = screen.getAllByDisplayValue('8')
      expect(inputs.length).toBeGreaterThan(0)
    })
  })

  it('saves grade on blur with valid value', async () => {
    render(
      <GradesSpreadsheet
        courseId="c1"
        period="1er_trimestre"
        students={mockStudents}
        grades={[]}
        loading={false}
        onSaveGrade={mockOnSaveGrade}
        onDeleteGrade={mockOnDeleteGrade}
        suggestedColumns={['TP 1']}
      />
    )

    const inputs = await screen.findAllByPlaceholderText('–')
    const firstInput = inputs[0]

    fireEvent.change(firstInput, { target: { value: '7.5' } })
    fireEvent.blur(firstInput)

    await waitFor(() => {
      expect(mockOnSaveGrade).toHaveBeenCalled()
    })
  })

  it('deletes grade when input is cleared', async () => {
    render(
      <GradesSpreadsheet
        courseId="c1"
        period="1er_trimestre"
        students={mockStudents}
        grades={mockGrades}
        loading={false}
        onSaveGrade={mockOnSaveGrade}
        onDeleteGrade={mockOnDeleteGrade}
      />
    )

    const inputs = await screen.findAllByDisplayValue('8')
    const firstInput = inputs[0]

    fireEvent.change(firstInput, { target: { value: '' } })
    fireEvent.blur(firstInput)

    await waitFor(() => {
      expect(mockOnDeleteGrade).toHaveBeenCalledWith('g1')
    })
  })

  it('shows error toast for invalid grade values', async () => {
    render(
      <GradesSpreadsheet
        courseId="c1"
        period="1er_trimestre"
        students={mockStudents}
        grades={[]}
        loading={false}
        onSaveGrade={mockOnSaveGrade}
        onDeleteGrade={mockOnDeleteGrade}
        suggestedColumns={['Práctica']}
      />
    )

    // Find all grade inputs by looking for the placeholder
    const inputs = screen.getAllByPlaceholderText('–')
    const firstInput = inputs[0]

    fireEvent.change(firstInput, { target: { value: '15' } })
    fireEvent.blur(firstInput)

    expect(toast.error).toHaveBeenCalledWith('La calificación debe ser un número entre 1 y 10')
    expect(mockOnSaveGrade).not.toHaveBeenCalled()
  })

  it('adds new column via form submission', async () => {
    render(
      <GradesSpreadsheet
        courseId="c1"
        period="1er_trimestre"
        students={mockStudents}
        grades={mockGrades}
        loading={false}
        onSaveGrade={mockOnSaveGrade}
        onDeleteGrade={mockOnDeleteGrade}
      />
    )

    // Click add column button
    const addButton = screen.getByText(/Columna/)
    fireEvent.click(addButton)

    // Type new column name
    const input = screen.getByPlaceholderText('Nombre...')
    fireEvent.change(input, { target: { value: 'Recuperatorio' } })

    // Submit form
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => {
      expect(screen.getByText((content) => content.toLowerCase().includes('recuperatorio'))).toBeInTheDocument()
    })
  })

  it('shows error when adding duplicate column', async () => {
    render(
      <GradesSpreadsheet
        courseId="c1"
        period="1er_trimestre"
        students={mockStudents}
        grades={mockGrades}
        loading={false}
        onSaveGrade={mockOnSaveGrade}
        onDeleteGrade={mockOnDeleteGrade}
      />
    )

    // Click add column
    const addButton = screen.getByText(/Columna/)
    fireEvent.click(addButton)

    // Try to add existing column
    const input = screen.getByPlaceholderText('Nombre...')
    fireEvent.change(input, { target: { value: 'práctica' } })

    fireEvent.submit(input.closest('form')!)

    expect(toast.error).toHaveBeenCalledWith('Ya existe una columna con ese nombre')
  })

  it('calculates and displays average correctly', async () => {
    render(
      <GradesSpreadsheet
        courseId="c1"
        period="1er_trimestre"
        students={mockStudents}
        grades={mockGrades}
        loading={false}
        onSaveGrade={mockOnSaveGrade}
        onDeleteGrade={mockOnDeleteGrade}
      />
    )

    // Juan has grades 8 and 9 = average 8.5
    await waitFor(() => {
      expect(screen.getByText('8.5')).toBeInTheDocument()
      // María has grade 6 = average 6.0
      expect(screen.getByText('6.0')).toBeInTheDocument()
    })
  })

  it('displays suggested columns when provided', () => {
    render(
      <GradesSpreadsheet
        courseId="c1"
        period="1er_trimestre"
        students={mockStudents}
        grades={[]}
        loading={false}
        onSaveGrade={mockOnSaveGrade}
        onDeleteGrade={mockOnDeleteGrade}
        suggestedColumns={['Examen', 'Trabajo Final']}
      />
    )

    expect(screen.getByText((content) => content.toLowerCase().includes('examen'))).toBeInTheDocument()
    expect(screen.getByText((content) => content.toLowerCase().includes('trabajo final'))).toBeInTheDocument()
  })
})
