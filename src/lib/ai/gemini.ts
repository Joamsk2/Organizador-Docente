import { google } from '@ai-sdk/google'

// Gemini 2.0 Flash-Lite (Using 1.5-flash stable fallback)
export const geminiFlashLite = google('gemini-1.5-flash')

// Recommended for synthesis and planning tasks
export const geminiFlash = google('gemini-1.5-flash')
