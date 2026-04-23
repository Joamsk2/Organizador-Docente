import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StudentForm } from '../student-form'

describe('StudentForm', () => {
  const mockCourses = [
    { id: 'c1', name: 'Matemática', year: '1', division: 'A', school_id: 's1', created_at: '2024-01-01', updated_at: '2024-01-01', color: null },
    { id: 'c2', name: 'Lengua', year: '2', division: 'B', school_id: 's1', created_at: '2024-01-01', updated_at: '2024-01-01', color: null },
  ] as any

  it('renders create mode with empty fields', () => {
    render(
      <StudentForm
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        availableCourses={mockCourses}
      />
    )

    expect(screen.getByText('Nuevo Alumno')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ej: Juan')).toHaveValue('')
    expect(screen.getByPlaceholderText('Ej: Pérez')).toHaveValue('')
  })

  it('renders edit mode with initial data', () => {
    render(
      <StudentForm
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        initialData={{
          first_name: 'Ana',
          last_name: 'García',
          dni: '12345678',
          email: 'ana@test.com',
          phone: '555-1234',
          notes: 'Alergia a maní',
          course_students: [{ course_id: 'c1' }],
        }}
        availableCourses={mockCourses}
      />
    )

    expect(screen.getByText('Editar Alumno')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Ana')).toBeInTheDocument()
    expect(screen.getByDisplayValue('García')).toBeInTheDocument()
    expect(screen.getByDisplayValue('12345678')).toBeInTheDocument()
    expect(screen.getByDisplayValue('ana@test.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('555-1234')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Alergia a maní')).toBeInTheDocument()
  })

  it('shows validation error when required fields are empty', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    render(
      <StudentForm
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        availableCourses={mockCourses}
      />
    )

    // Submit form without filling required fields via button click
    const submitButton = screen.getByRole('button', { name: /Crear Alumno/ })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  it('calls onSubmit with form data and selected courses', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    const onClose = vi.fn()

    render(
      <StudentForm
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
        availableCourses={mockCourses}
        defaultCourseId="c1"
      />
    )

    fireEvent.change(screen.getByPlaceholderText('Ej: Juan'), {
      target: { name: 'first_name', value: 'María' },
    })
    fireEvent.change(screen.getByPlaceholderText('Ej: Pérez'), {
      target: { name: 'last_name', value: 'Lopez' },
    })

    // Toggle course c2 on
    const c2Checkbox = screen.getByLabelText(/Lengua/)
    fireEvent.click(c2Checkbox)

    const submitButton = screen.getByRole('button', { name: /Crear Alumno/ })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: 'María',
          last_name: 'Lopez',
        }),
        expect.arrayContaining(['c1', 'c2'])
      )
    })

    expect(onClose).toHaveBeenCalled()
  })

  it('does not close modal when onSubmit returns false', async () => {
    const onSubmit = vi.fn().mockResolvedValue(false)
    const onClose = vi.fn()

    render(
      <StudentForm
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
        availableCourses={mockCourses}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('Ej: Juan'), {
      target: { name: 'first_name', value: 'Juan' },
    })
    fireEvent.change(screen.getByPlaceholderText('Ej: Pérez'), {
      target: { name: 'last_name', value: 'Pérez' },
    })

    const submitButton = screen.getByRole('button', { name: /Crear Alumno/ })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })

    expect(onClose).not.toHaveBeenCalled()
  })
})
