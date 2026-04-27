import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'

vi.mock('@/lib/ai/gemini', () => ({
  geminiFlash: {},
}))

vi.mock('ai', () => ({
  generateText: vi.fn(),
}))

import { generateText } from 'ai'

const mockedGenerateText = vi.mocked(generateText)

describe('POST /api/ai/generate-plan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when title is missing', async () => {
    const req = new Request('http://localhost/api/ai/generate-plan', {
      method: 'POST',
      body: JSON.stringify({ type: 'clase' }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toBe('Falta el título de la planificación')
  })

  it('generates a plan and sanitizes markdown code blocks', async () => {
    mockedGenerateText.mockResolvedValue({
      text: '```html\n<h1>Tema</h1>\n```',
    } as any)

    const req = new Request('http://localhost/api/ai/generate-plan', {
      method: 'POST',
      body: JSON.stringify({ title: 'Revolución de Mayo', type: 'clase' }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.html).toBe('<h1>Tema</h1>')
  })

  it('returns 500 when generateText throws', async () => {
    mockedGenerateText.mockRejectedValue(new Error('Gemini error'))

    const req = new Request('http://localhost/api/ai/generate-plan', {
      method: 'POST',
      body: JSON.stringify({ title: 'Tema', type: 'clase' }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(500)

    const json = await res.json()
    expect(json.error).toBe('Gemini error')
  })
})
