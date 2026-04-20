import { google } from '@ai-sdk/google'

// Gemini 2.5 Flash — Modern, fast and efficient model
// Default for all AI tasks in the application
export const geminiFlashLite = google('gemini-2.5-flash')

// Recommended for synthesis and planning tasks
export const geminiFlash = google('gemini-2.5-flash')

