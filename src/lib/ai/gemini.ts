import { google } from '@ai-sdk/google'

// Gemini 1.5 Flash — Stable, fast and efficient model
// Default for all AI tasks in the application
export const geminiFlashLite = google('gemini-1.5-flash')

// Recommended for synthesis and planning tasks
export const geminiFlash = google('gemini-1.5-flash')

