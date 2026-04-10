/**
 * Client-side image compression utility.
 * Compresses and resizes images before uploading to minimize API costs.
 * 
 * Strategy: Resize to max 1024px wide, compress to WebP/JPEG 75% quality.
 * This reduces a typical 4MB phone photo to ~180KB without losing text legibility.
 */

const MAX_WIDTH = 1024
const MAX_HEIGHT = 1024
const QUALITY = 0.75

export interface CompressedImage {
    blob: Blob
    base64: string
    originalSize: number
    compressedSize: number
    compressionRatio: number
}

/**
 * Compresses an image file for AI processing.
 * Must be called client-side (uses canvas).
 */
export async function compressImageForAI(file: File): Promise<CompressedImage> {
    const originalSize = file.size

    return new Promise((resolve, reject) => {
        const img = new Image()
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        img.onload = () => {
            // Calculate new dimensions maintaining aspect ratio
            let { width, height } = img

            if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height)
                width = Math.round(width * ratio)
                height = Math.round(height * ratio)
            }

            canvas.width = width
            canvas.height = height

            if (!ctx) {
                reject(new Error('Failed to get canvas context'))
                return
            }

            // Draw with white background (for transparency)
            ctx.fillStyle = '#FFFFFF'
            ctx.fillRect(0, 0, width, height)
            ctx.drawImage(img, 0, 0, width, height)

            // Try WebP first, fallback to JPEG
            const mimeType = canvas.toDataURL('image/webp').startsWith('data:image/webp')
                ? 'image/webp'
                : 'image/jpeg'

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Failed to compress image'))
                        return
                    }

                    // Convert to base64 for API
                    const reader = new FileReader()
                    reader.onloadend = () => {
                        const base64 = (reader.result as string).split(',')[1]
                        resolve({
                            blob,
                            base64,
                            originalSize,
                            compressedSize: blob.size,
                            compressionRatio: Math.round((1 - blob.size / originalSize) * 100),
                        })
                    }
                    reader.readAsDataURL(blob)
                },
                mimeType,
                QUALITY
            )
        }

        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = URL.createObjectURL(file)
    })
}

/**
 * Compresses multiple images in parallel.
 */
export async function compressImagesForAI(files: File[]): Promise<CompressedImage[]> {
    return Promise.all(files.map(compressImageForAI))
}
