import { google } from '@ai-sdk/google'

// Gemini 3.1 Flash-Lite — cheapest & fastest multimodal model
// Free tier: 15 RPM, 1000 RPD, 250k TPM, 1M context window
// Paid: $0.25/1M input, $1.50/1M output
export const geminiFlashLite = google('gemini-3.1-flash-lite')

// For tasks requiring more reasoning (fallback)
export const geminiFlash = google('gemini-3.1-flash')
