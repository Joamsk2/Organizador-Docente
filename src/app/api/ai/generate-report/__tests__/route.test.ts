import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'

vi.mock('@/lib/ai/gemini', () => ({
  geminiFlash: {},
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

describe('POST /api/ai/generate-report', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as any)

    const req = new Request('http://localhost/api/ai/generate-report', {
      method: 'POST',
      body: JSON.stringify({ student_id: 's1', course_id: 'c1' }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(401)

    const json = await res.json()
    expect(json.error).toBe('No autorizado')
  })

  it('returns 400 when student_id or course_id is missing', async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
    } as any)

    const req = new Request('http://localhost/api/ai/generate-report', {
      method: 'POST',
      body: JSON.stringify({ student_id: 's1' }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toContain('student_id y course_id son requeridos')
  })

  it('generates report and saves snapshot', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockResolvedValue({ error: null })
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null })

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'students') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { first_name: 'Juan', last_name: 'Pérez' },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'grades') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ value: 8, category: 'practica', period: '1er_trimestre', observations: '' }],
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'attendance') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ status: 'presente', date: '2024-01-01', notes: '' }],
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'ai_corrections') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      }
      if (table === 'student_observations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'student_performance_snapshots') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: mockSingle,
                }),
              }),
            }),
          }),
          insert: mockInsert,
          update: mockUpdate,
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

    mockedGenerateObject.mockResolvedValue({
      object: {
        narrative_summary: 'El alumno muestra buen desempeño',
        overall_trend: 'improving',
        key_strengths: ['Participación', 'Compromiso'],
        key_areas_for_improvement: ['Organización'],
        recommendations: 'Mantener el ritmo de trabajo',
      },
    } as any)

    const req = new Request('http://localhost/api/ai/generate-report', {
      method: 'POST',
      body: JSON.stringify({
        student_id: 's1',
        course_id: 'c1',
        period: '1er_trimestre',
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.report.narrative_summary).toContain('buen desempeño')
    expect(json.metrics.average_grade).toBe(8)
    expect(json.metrics.attendance_rate).toBe(100)
    expect(mockInsert).toHaveBeenCalled()
  })

  it('updates existing snapshot if found', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ error: null })
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'snap1' },
      error: null,
    })

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'students') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { first_name: 'Ana', last_name: 'García' },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'grades' || table === 'attendance' || table === 'ai_corrections') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }
      }
      if (table === 'student_observations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'student_performance_snapshots') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: mockSingle,
                }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({ eq: mockUpdate }),
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

    mockedGenerateObject.mockResolvedValue({
      object: {
        narrative_summary: 'Informe actualizado',
        overall_trend: 'stable',
        key_strengths: [],
        key_areas_for_improvement: [],
        recommendations: '',
      },
    } as any)

    const req = new Request('http://localhost/api/ai/generate-report', {
      method: 'POST',
      body: JSON.stringify({
        student_id: 's1',
        course_id: 'c1',
        period: '1er_trimestre',
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(mockSingle).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalledWith('id', 'snap1')
  })

  it('returns 500 when generateObject throws', async () => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'students') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { first_name: 'Juan', last_name: 'Pérez' },
                error: null,
              }),
            }),
          }),
        }
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }
    })

    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
      from: mockFrom,
    } as any)

    mockedGenerateObject.mockRejectedValue(new Error('AI generation failed'))

    const req = new Request('http://localhost/api/ai/generate-report', {
      method: 'POST',
      body: JSON.stringify({ student_id: 's1', course_id: 'c1' }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(500)

    const json = await res.json()
    expect(json.error).toBe('Error al generar el informe')
  })
})
