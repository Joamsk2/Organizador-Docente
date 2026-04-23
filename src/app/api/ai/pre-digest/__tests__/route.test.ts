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

describe('POST /api/ai/pre-digest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as any)

    const req = new Request('http://localhost/api/ai/pre-digest', {
      method: 'POST',
      body: JSON.stringify({ assignment_id: 'a1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)

    const json = await res.json()
    expect(json.error).toBe('No autorizado')
  })

  it('returns 400 when assignment_id is missing', async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
    } as any)

    const req = new Request('http://localhost/api/ai/pre-digest', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toBe('assignment_id es requerido')
  })

  it('returns 404 when no reference materials are found', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    })

    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
      from: mockFrom,
    } as any)

    const req = new Request('http://localhost/api/ai/pre-digest', {
      method: 'POST',
      body: JSON.stringify({ assignment_id: 'a1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(404)

    const json = await res.json()
    expect(json.error).toContain('No se encontraron materiales de referencia')
  })

  it('generates digest and updates reading material', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ error: null })
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'assignment_reference_materials') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'mat1',
                  material_type: 'reading_material',
                  title: 'Texto de lectura',
                  content_text: 'Contenido del texto',
                  file_url: null,
                },
                {
                  id: 'mat2',
                  material_type: 'instructions',
                  title: 'Consignas',
                  content_text: 'Responder las preguntas',
                  file_url: null,
                },
              ],
              error: null,
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
        digest: 'Resumen condensado del material de lectura con conceptos clave.',
        key_topics: ['Revolución de Mayo', 'Independencia', 'Patriotismo'],
      },
    } as any)

    const req = new Request('http://localhost/api/ai/pre-digest', {
      method: 'POST',
      body: JSON.stringify({ assignment_id: 'a1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.digest).toContain('Resumen condensado')
    expect(json.key_topics).toEqual(['Revolución de Mayo', 'Independencia', 'Patriotismo'])
    expect(mockUpdate).toHaveBeenCalledWith('id', 'mat1')
  })

  it('generates digest without updating if no reading material found', async () => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'assignment_reference_materials') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'mat2',
                  material_type: 'instructions',
                  title: 'Consignas',
                  content_text: 'Responder las preguntas',
                  file_url: null,
                },
              ],
              error: null,
            }),
          }),
          update: vi.fn(),
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
        digest: 'Resumen de consignas.',
        key_topics: ['Consignas'],
      },
    } as any)

    const req = new Request('http://localhost/api/ai/pre-digest', {
      method: 'POST',
      body: JSON.stringify({ assignment_id: 'a1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.digest).toBe('Resumen de consignas.')
  })

  it('returns 500 when generateObject throws', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'mat1',
              material_type: 'reading_material',
              title: 'Texto',
              content_text: 'Contenido',
            },
          ],
          error: null,
        }),
      }),
    })

    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
      from: mockFrom,
    } as any)

    mockedGenerateObject.mockRejectedValue(new Error('AI processing error'))

    const req = new Request('http://localhost/api/ai/pre-digest', {
      method: 'POST',
      body: JSON.stringify({ assignment_id: 'a1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(500)

    const json = await res.json()
    expect(json.error).toBe('Error al procesar los materiales')
  })
})
