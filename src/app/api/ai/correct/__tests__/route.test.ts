import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'

vi.mock('@/lib/ai/gemini', () => ({
  geminiFlashLite: {},
}))

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { generateObject } from 'ai'
import { createClient } from '@/lib/supabase/server'

const mockedGenerateObject = vi.mocked(generateObject)
const mockedCreateClient = vi.mocked(createClient)

describe('POST /api/ai/correct', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as any)

    const req = new Request('http://localhost/api/ai/correct', {
      method: 'POST',
      body: JSON.stringify({ assignment_id: 'a1', digest: 'content' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)

    const json = await res.json()
    expect(json.error).toBe('No autorizado')
  })

  it('returns 400 when assignment_id or digest is missing', async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
    } as any)

    const req = new Request('http://localhost/api/ai/correct', {
      method: 'POST',
      body: JSON.stringify({ assignment_id: 'a1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toContain('assignment_id y digest son requeridos')
  })

  it('returns 404 when no submissions are found', async () => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'assignment_reference_materials') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }
      }
      if (table === 'assignment_submissions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }
      }
      return {}
    })

    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
      from: mockFrom,
    } as any)

    const req = new Request('http://localhost/api/ai/correct', {
      method: 'POST',
      body: JSON.stringify({ assignment_id: 'a1', digest: 'content' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(404)

    const json = await res.json()
    expect(json.error).toContain('No hay entregas pendientes')
  })

  it('processes corrections in batches and saves to database', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'assignment_reference_materials') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ content_text: 'Criterios', title: 'Evaluación' }],
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'assignment_submissions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 's1',
                    student_id: 'stu1',
                    file_urls: [],
                    feedback: 'Respuesta 1',
                    students: { first_name: 'Juan', last_name: 'Pérez' },
                  },
                ],
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'ai_corrections') {
        return { insert: mockInsert }
      }
      return {}
    })

    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
      from: mockFrom,
    } as any)

    mockedGenerateObject.mockResolvedValue({
      object: {
        corrections: [
          {
            student_id: 'stu1',
            criteria_scores: [{ criterion_name: 'Comprensión', max_score: 10, achieved_score: 8, feedback: 'Bien' }],
            suggested_grade: 8,
            detected_errors: [],
            student_feedback: 'Buen trabajo',
            improvement_suggestions: 'Revisar conceptos',
            correction_summary: 'Corrección completada',
          },
        ],
      },
    } as any)

    const req = new Request('http://localhost/api/ai/correct', {
      method: 'POST',
      body: JSON.stringify({ assignment_id: 'a1', digest: 'content digest' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.corrected_count).toBe(1)
    expect(json.batch_calls_made).toBe(1)
    expect(mockInsert).toHaveBeenCalled()
  })

  it('returns 500 when generateObject throws', async () => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'assignment_reference_materials') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }
      }
      if (table === 'assignment_submissions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: 's1', student_id: 'stu1', feedback: 'test', students: { first_name: 'A', last_name: 'B' } }],
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
      from: mockFrom,
    } as any)

    mockedGenerateObject.mockRejectedValue(new Error('AI error'))

    const req = new Request('http://localhost/api/ai/correct', {
      method: 'POST',
      body: JSON.stringify({ assignment_id: 'a1', digest: 'content' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(500)

    const json = await res.json()
    expect(json.error).toContain('Error en la corrección automática')
  })
})
