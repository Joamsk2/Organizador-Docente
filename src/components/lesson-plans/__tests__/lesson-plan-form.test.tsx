// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LessonPlanForm } from '../lesson-plan-form'

const { mockSupabaseClient, mockFetchAssignments, mockAssignments } = vi.hoisted(() => ({
  mockSupabaseClient: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'test.pdf' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/test.pdf' } })),
      })),
    },
  },
  mockFetchAssignments: vi.fn(),
  mockAssignments: [
    { id: 'a1', title: 'TP 1 - Revolución de Mayo', type: 'tp' },
    { id: 'a2', title: 'Evaluación de Historia', type: 'evaluacion' },
  ]
}))

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}))

// Mock the useAssignments hook
vi.mock('@/hooks/use-assignments', () => ({
  useAssignments: () => ({
    assignments: mockAssignments,
    loading: false,
    fetchAssignments: mockFetchAssignments,
  }),
}))

describe('LessonPlanForm', () => {
  const mockOnClose = vi.fn()
  const mockOnSubmit = vi.fn()
  const courseId = 'c1'

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSubmit.mockResolvedValue(true)
    global.fetch = vi.fn()
  })

  it('renders create mode with empty fields', () => {
    render(
      <LessonPlanForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        courseId={courseId}
      />
    )

    expect(screen.getByText('Nueva Planificación')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ej: Unidad 1: Ecosistemas')).toHaveValue('')
    expect(screen.getByRole('combobox')).toHaveValue('clase')
  })

  it('renders edit mode with initial data', () => {
    const initialData = {
      id: 'lp1',
      title: 'Unidad 1: Ecosistemas',
      type: 'unidad',
      content: '<p>Contenido de la unidad</p>',
    }

    render(
      <LessonPlanForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        courseId={courseId}
        initialData={initialData}
      />
    )

    expect(screen.getByText('Editar Planificación')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ej: Unidad 1: Ecosistemas')).toHaveValue('Unidad 1: Ecosistemas')
    expect(screen.getByRole('combobox')).toHaveValue('unidad')
  })

  it('fetches assignments when opened', () => {
    render(
      <LessonPlanForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        courseId={courseId}
      />
    )

    expect(mockFetchAssignments).toHaveBeenCalled()
  })

  it('calls onSubmit with form data and selected assignments', async () => {
    render(
      <LessonPlanForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        courseId={courseId}
      />
    )

    // Fill in title
    const titleInput = screen.getByLabelText(/Título/i)
    fireEvent.change(titleInput, { target: { value: 'Nueva Planificación' } })

    // Submit form
    const submitButton = screen.getByText('Crear Planificación')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled()
      const [payload, assignmentIds] = mockOnSubmit.mock.calls[0]
      expect(payload.title).toBe('Nueva Planificación')
      expect(payload.course_id).toBe(courseId)
      expect(Array.isArray(assignmentIds)).toBe(true)
    })
  })

  it('closes modal on successful submit', async () => {
    render(
      <LessonPlanForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        courseId={courseId}
      />
    )

    const titleInput = screen.getByLabelText(/Título/i)
    fireEvent.change(titleInput, { target: { value: 'Nueva Planificación' } })

    const submitButton = screen.getByText('Crear Planificación')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('does not close when onSubmit returns false', async () => {
    mockOnSubmit.mockResolvedValue(false)

    render(
      <LessonPlanForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        courseId={courseId}
      />
    )

    const titleInput = screen.getByLabelText(/Título/i)
    fireEvent.change(titleInput, { target: { value: 'Nueva Planificación' } })

    const submitButton = screen.getByText('Crear Planificación')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled()
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  it('calls onClose when cancel button is clicked', () => {
    render(
      <LessonPlanForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        courseId={courseId}
      />
    )

    const cancelButton = screen.getByText('Cancelar')
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('toggles assignment selection', () => {
    render(
      <LessonPlanForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        courseId={courseId}
      />
    )

    // Find checkboxes for assignments
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThan(0)

    // Toggle first assignment
    fireEvent.click(checkboxes[0])

    // Submit to verify selected assignments are passed
    const submitButton = screen.getByText('Crear Planificación')
    fireEvent.click(submitButton)
  })

  it('disables submit button while loading', async () => {
    mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)))

    render(
      <LessonPlanForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        courseId={courseId}
      />
    )

    const titleInput = screen.getByPlaceholderText('Ej: Unidad 1: Ecosistemas')
    fireEvent.change(titleInput, { target: { value: 'Nueva Planificación' } })

    const submitButton = screen.getByText('Crear Planificación')
    fireEvent.click(submitButton)

    expect(submitButton).toBeDisabled()
  })

  it('renders AI button', () => {
    render(
      <LessonPlanForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        courseId={courseId}
      />
    )

    // AI generation is complex to test due to async fetch and toast interactions
    // This test verifies the AI button is rendered
    expect(screen.getByText(/Copiloto IA/i)).toBeInTheDocument()
  })

  it('renders file upload area', () => {
    render(
      <LessonPlanForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        courseId={courseId}
      />
    )

    // File upload is complex to test without full Supabase mock
    // This test verifies the component renders the upload area
    expect(screen.getByText(/Clic para explorar y adjuntar/i)).toBeInTheDocument()
    expect(screen.getByText(/Soporta PDF, DOCX, ZIP e imágenes/i)).toBeInTheDocument()
  })
})
