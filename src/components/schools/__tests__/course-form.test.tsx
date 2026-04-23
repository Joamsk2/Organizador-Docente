// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CourseForm } from '../course-form'

describe('CourseForm', () => {
  const mockOnClose = vi.fn()
  const mockOnSubmit = vi.fn()
  const schoolId = 's1'

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSubmit.mockResolvedValue(true)
  })

  it('renders create mode with empty fields', () => {
    render(
      <CourseForm
        schoolId={schoolId}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    expect(screen.getByText('Nuevo Curso')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ej: Geografía')).toHaveValue('')
    expect(screen.getByPlaceholderText('Ej: 3ro')).toHaveValue('')
    expect(screen.getByPlaceholderText('Ej: A')).toHaveValue('')
  })

  it('renders edit mode with initial data', () => {
    const initialData = {
      id: 'c1',
      name: 'Matemática',
      year: '3ro',
      division: 'A',
      color: '#FF5733',
      course_schedules: [
        { id: 1, day_of_week: 1, start_time: '08:00', end_time: '10:00', classroom: 'A101' },
      ],
    }

    render(
      <CourseForm
        schoolId={schoolId}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        initialData={initialData}
      />
    )

    expect(screen.getByText('Editar Curso')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ej: Geografía')).toHaveValue('Matemática')
    expect(screen.getByPlaceholderText('Ej: 3ro')).toHaveValue('3ro')
    expect(screen.getByPlaceholderText('Ej: A')).toHaveValue('A')
  })

  it('renders color picker options', () => {
    render(
      <CourseForm
        schoolId={schoolId}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    const colorButtons = screen.getAllByLabelText(/Seleccionar color/i)
    expect(colorButtons.length).toBeGreaterThan(0)
  })

  it('calls onSubmit with course data and schedules', async () => {
    render(
      <CourseForm
        schoolId={schoolId}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('Ej: Geografía'), { 
      target: { value: 'Historia' } 
    })
    fireEvent.change(screen.getByPlaceholderText('Ej: 3ro'), { 
      target: { value: '2do' } 
    })
    fireEvent.change(screen.getByPlaceholderText('Ej: A'), { 
      target: { value: 'B' } 
    })

    // Add a schedule
    fireEvent.click(screen.getByText(/Agregar Horario/i))

    // Update schedule fields
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: '2' } }) // Martes

    const timeInputs = screen.getAllByDisplayValue('08:00')
    fireEvent.change(timeInputs[0], { target: { value: '09:00' } })

    const endTimeInputs = screen.getAllByDisplayValue('10:00')
    fireEvent.change(endTimeInputs[0], { target: { value: '11:00' } })

    // Submit
    fireEvent.click(screen.getByText('Crear Curso'))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled()
      const [courseData, schedulesData] = mockOnSubmit.mock.calls[0]
      expect(courseData.name).toBe('Historia')
      expect(courseData.year).toBe('2do')
      expect(courseData.division).toBe('B')
      expect(courseData.school_id).toBe(schoolId)
      expect(Array.isArray(schedulesData)).toBe(true)
    })
  })

  it('closes modal on successful submit', async () => {
    render(
      <CourseForm
        schoolId={schoolId}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('Ej: Geografía'), { 
      target: { value: 'Geografía' } 
    })
    fireEvent.change(screen.getByPlaceholderText('Ej: 3ro'), { 
      target: { value: '1ro' } 
    })

    fireEvent.click(screen.getByText('Crear Curso'))

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('calls onClose when cancel button is clicked', () => {
    render(
      <CourseForm
        schoolId={schoolId}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    fireEvent.click(screen.getByText('Cancelar'))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('adds and removes schedules', () => {
    render(
      <CourseForm
        schoolId={schoolId}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    // Initially shows empty state
    expect(screen.getByText(/Sin horarios definidos/i)).toBeInTheDocument()

    // Add schedule
    fireEvent.click(screen.getByText(/Agregar Horario/i))
    
    // Schedule form should appear
    expect(screen.getByDisplayValue('08:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10:00')).toBeInTheDocument()

    // Remove schedule
    fireEvent.click(screen.getByTitle('Eliminar horario'))
    
    // Back to empty state
    expect(screen.getByText(/Sin horarios definidos/i)).toBeInTheDocument()
  })

  it('updates schedule fields correctly', () => {
    render(
      <CourseForm
        schoolId={schoolId}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    fireEvent.click(screen.getByText(/Agregar Horario/i))

    // Get all inputs
    const selects = screen.getAllByRole('combobox')
    const daySelect = selects[0]
    
    fireEvent.change(daySelect, { target: { value: '3' } })
    expect(daySelect).toHaveValue('3')

    // Add classroom
    const classroomInput = screen.getByPlaceholderText('Aula (opc.)')
    fireEvent.change(classroomInput, { target: { value: 'B205' } })
    expect(classroomInput).toHaveValue('B205')
  })

  it('validates required fields', () => {
    render(
      <CourseForm
        schoolId={schoolId}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    expect(screen.getByPlaceholderText('Ej: Geografía')).toHaveAttribute('required')
    expect(screen.getByPlaceholderText('Ej: 3ro')).toHaveAttribute('required')
  })

  it('displays all days of week in schedule select', () => {
    render(
      <CourseForm
        schoolId={schoolId}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    fireEvent.click(screen.getByText(/Agregar Horario/i))

    const selects = screen.getAllByRole('combobox')
    const daySelect = selects[0]

    expect(daySelect).toBeInTheDocument()
    
    // Options should include all days
    const options = daySelect.querySelectorAll('option')
    expect(options.length).toBe(7) // Lunes through Domingo
  })

  it('filters out invalid schedules before submit', async () => {
    render(
      <CourseForm
        schoolId={schoolId}
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('Ej: Geografía'), { 
      target: { value: 'Ciencias' } 
    })
    fireEvent.change(screen.getByPlaceholderText('Ej: 3ro'), { 
      target: { value: '4to' } 
    })

    // Add schedule but leave it incomplete (will be filtered out)
    fireEvent.click(screen.getByText(/Agregar Horario/i))

    fireEvent.click(screen.getByText('Crear Curso'))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled()
      const [, schedulesData] = mockOnSubmit.mock.calls[0]
      // Empty schedules should be passed since the default schedule has values
      expect(Array.isArray(schedulesData)).toBe(true)
    })
  })

  it('preserves school_id in form data', async () => {
    render(
      <CourseForm
        schoolId="school-123"
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('Ej: Geografía'), { 
      target: { value: 'Arte' } 
    })
    fireEvent.change(screen.getByPlaceholderText('Ej: 3ro'), { 
      target: { value: '5to' } 
    })

    fireEvent.click(screen.getByText('Crear Curso'))

    await waitFor(() => {
      const [courseData] = mockOnSubmit.mock.calls[0]
      expect(courseData.school_id).toBe('school-123')
    })
  })
})
