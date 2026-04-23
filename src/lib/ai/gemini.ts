import { google } from '@ai-sdk/google'

// Gemini 2.5 Flash - Best for reasoning, planning and vision (OCR)
export const geminiFlash = google('gemini-2.5-flash')

// Gemini 2.5 Flash-Lite - Optimized for speed, cost and batch processing
export const geminiFlashLite = google('gemini-2.5-flash-lite')
