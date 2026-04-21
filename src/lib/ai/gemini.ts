import { google } from '@ai-sdk/google'

// Gemini 1.5 Flash — Modern, fast and efficient model
// Note: Changed from 2.5 to 1.5 as 2.5 is not yet a valid ID in the Google SDK.
export const geminiFlashLite = google('gemini-1.5-flash')

// Recommended for synthesis and planning tasks
export const geminiFlash = google('gemini-1.5-flash')

