import { google } from '@ai-sdk/google'

// Gemini 2.5 Flash-Lite Preview (User requested)
// Note: Temporarily using 1.5-flash as the requested 2.5 model is throwing 500 errors in the current environment.
export const geminiFlashLite = google('gemini-1.5-flash')

// Recommended for synthesis and planning tasks
export const geminiFlash = google('gemini-1.5-flash')
