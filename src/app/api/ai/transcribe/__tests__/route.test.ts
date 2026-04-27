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

describe('POST /api/ai/transcribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as any)

    const req = new Request('http://localhost/api/ai/transcribe', {
      method: 'POST',
      body: JSON.stringify({ image_base64: 'base64data' }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(401)

    const json = await res.json()
    expect(json.error).toBe('No autorizado')
  })

  it('returns 400 when image_base64 is missing', async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
    } as any)

    const req = new Request('http://localhost/api/ai/transcribe', {
      method: 'POST',
      body: JSON.stringify({ mime_type: 'image/jpeg' }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toBe('image_base64 es requerido')
  })

  it('transcribes image and returns structured data', async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
    } as any)

    mockedGenerateObject.mockResolvedValue({
      object: {
        transcribed_text: 'La Revolución de Mayo ocurrió en 1810.',
        has_drawings: false,
        legibility: 'clear',
      },
    } as any)

    const req = new Request('http://localhost/api/ai/transcribe', {
      method: 'POST',
      body: JSON.stringify({
        image_base64: 'iVBORw0KGgoAAAANS...',
        mime_type: 'image/webp',
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.transcription.transcribed_text).toContain('Revolución de Mayo')
    expect(json.transcription.has_drawings).toBe(false)
    expect(json.transcription.legibility).toBe('clear')
  })

  it('transcribes image with drawings', async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
    } as any)

    mockedGenerateObject.mockResolvedValue({
      object: {
        transcribed_text: 'El alumno escribió: 2+2=4 y dibujó un cuadrado.',
        has_drawings: true,
        drawings_description: 'Un cuadrado con líneas internas',
        legibility: 'partially_legible',
      },
    } as any)

    const req = new Request('http://localhost/api/ai/transcribe', {
      method: 'POST',
      body: JSON.stringify({
        image_base64: 'base64imagedata',
        mime_type: 'image/jpeg',
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.transcription.has_drawings).toBe(true)
    expect(json.transcription.drawings_description).toBe('Un cuadrado con líneas internas')
    expect(json.transcription.legibility).toBe('partially_legible')
  })

  it('uses default mime_type when not provided', async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
    } as any)

    mockedGenerateObject.mockResolvedValue({
      object: {
        transcribed_text: 'Texto transcrito',
        has_drawings: false,
        legibility: 'clear',
      },
    } as any)

    const req = new Request('http://localhost/api/ai/transcribe', {
      method: 'POST',
      body: JSON.stringify({
        image_base64: 'base64data',
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)

    // Verify that generateObject was called with image/webp default
    const callArgs = mockedGenerateObject.mock.calls[0][0]
    const content = callArgs.messages?.[0]?.content
    const imagePart = Array.isArray(content) ? content.find((c: any) => c.type === 'image') : null
    expect((imagePart as any)?.image).toContain('data:image/webp')
  })

  it('returns 500 when generateObject throws', async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
    } as any)

    mockedGenerateObject.mockRejectedValue(new Error('Vision API error'))

    const req = new Request('http://localhost/api/ai/transcribe', {
      method: 'POST',
      body: JSON.stringify({
        image_base64: 'base64data',
        mime_type: 'image/png',
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(500)

    const json = await res.json()
    expect(json.error).toBe('Error al transcribir la imagen')
  })
})
