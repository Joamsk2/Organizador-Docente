// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AssignmentForm } from '../assignment-form'

describe('AssignmentForm', () => {
  const mockOnClose = vi.fn()
  const mockOnSubmit = vi.fn()
  const courseId = 'c1'

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSubmit.mockResolvedValue(true)
  })

  it('renders create mode with empty fields', () => {
    render(
      <AssignmentForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        courseId={courseId}
      />
    )

    expect(screen.getByText('Nuevo Trabajo Práctico')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ej: TP N°1 - Revolución de Mayo')).toHaveValue('')
    expect(screen.getByPlaceholderText('Detallá lo que los alumnos deben hacer...')).toHaveValue('')
  })

  it('renders edit mode with initial data', () => {
    const initialData = {
      id: 'a1',
      title: 'TP 1 - Revolución de Mayo',
      type: 'tp',
      description: 'Investigar sobre la Revolución',
      due_date: '2024-03-20T00:00:00',
      status: 'activo',
    }

    render(
      <AssignmentForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        courseId={courseId}
        initialData={initialData}
      />
    )

    expect(screen.getByText('Editar Trabajo')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ej: TP N°1 - Revolución de Mayo')).toHaveValue('TP 1 - Revolución de Mayo')
    expect(screen.getByPlaceholderText('Detallá lo que los alumnos deben hacer...')).toHaveValue('Investigar sobre la Revolución')
    expect(screen.getByRole('combobox')).toHaveValue('tp')
  })

  it('displays all assignment types in select', () => {
    render(
      <AssignmentForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        courseId={courseId}
      />
    )

    const selects = screen.getAllByRole('combobox')
    expect(selects.length).toBeGreaterThan(0)
    
    // Check options are present
    expect(screen.getByText('Trabajo Práctico')).toBeInTheDocument()
    expect(screen.getByText('Evaluación / Examen')).toBeInTheDocument()
    expect(screen.getByText('Actividad en clase')).toBeInTheDocument()
    expect(screen.getByText('Exposición Oral')).toBeInTheDocument()
    expect(screen.getByText('Investigación')).toBeInTheDocument()
    expect(screen.getByText('Autoevaluación')).toBeInTheDocument()
  })

  it('calls onSubmit with form data', async () => {
    render(
      <AssignmentForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        courseId={courseId}
      />
    )

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('Ej: TP N°1 - Revolución de Mayo'), { 
      target: { value: 'Nuevo TP' } 
    })
    fireEvent.change(screen.getByPlaceholderText('Detallá lo que los alumnos deben hacer...'), { 
      target: { value: 'Descripción del trabajo' } 
    })
    fireEvent.change(screen.getAllByRole('combobox')[0], { 
      target: { value: 'investigacion' } 
    })
    fireEvent.change(screen.getByDisplayValue(''), { 
      target: { value: '2024-04-15' } 
    })

    // Submit
    const submitButton = screen.getByText('Crear Trabajo')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Nuevo TP',
        description: 'Descripción del trabajo',
        type: 'investigacion',
        due_date: '2024-04-15',
        course_id: courseId,
        status: 'borrador',
      }))
    })
  })

  it('preserves status when editing', async () => {
    const initialData = {
      id: 'a1',
      title: 'TP Existente',
      type: 'tp',
      description: 'Descripción',
      status: 'activo',
    }

    render(
      <AssignmentForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        courseId={courseId}
        initialData={initialData}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('Ej: TP N°1 - Revolución de Mayo'), { 
      target: { value: 'TP Actualizado' } 
    })

    const submitButton = screen.getByText('Guardar Cambios')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        title: 'TP Actualizado',
        status: 'activo',
      }))
    })
  })

  it('closes modal on successful submit', async () => {
    render(
      <AssignmentForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        courseId={courseId}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('Ej: TP N°1 - Revolución de Mayo'), { 
      target: { value: 'Nuevo TP' } 
    })

    fireEvent.click(screen.getByText('Crear Trabajo'))

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('calls onClose when cancel button is clicked', () => {
    render(
      <AssignmentForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        courseId={courseId}
      />
    )

    fireEvent.click(screen.getByText('Cancelar'))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('disables submit button while loading', async () => {
    mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)))

    render(
      <AssignmentForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        courseId={courseId}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('Ej: TP N°1 - Revolución de Mayo'), { 
      target: { value: 'Nuevo TP' } 
    })

    const submitButton = screen.getByText('Crear Trabajo')
    fireEvent.click(submitButton)

    expect(submitButton).toBeDisabled()
  })

  it('validates required title field', () => {
    render(
      <AssignmentForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        courseId={courseId}
      />
    )

    const titleInput = screen.getByPlaceholderText('Ej: TP N°1 - Revolución de Mayo')
    expect(titleInput).toHaveAttribute('required')
  })

  it('handles date format correctly for edit mode', () => {
    const initialData = {
      id: 'a1',
      title: 'TP',
      due_date: '2024-03-20T14:30:00.000Z',
    }

    render(
      <AssignmentForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        courseId={courseId}
        initialData={initialData}
      />
    )

    // Date should be split to just the date part (YYYY-MM-DD)
    const dateInput = screen.queryByDisplayValue('2024-03-20')
    expect(dateInput).toBeInTheDocument()
  })
})
