import { createClient } from '@/lib/supabase/client'

export async function uploadFile(
    bucket: 'assignments' | 'submissions',
    path: string,
    file: File
) {
    const supabase = createClient()
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
        })

    if (error) throw error
    return data
}

export function getFileUrl(
    bucket: 'assignments' | 'submissions',
    path: string
) {
    const supabase = createClient()
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
}

export async function getSignedUrl(
    bucket: 'assignments' | 'submissions',
    path: string,
    expiresIn: number = 3600
) {
    const supabase = createClient()
    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn)

    if (error) throw error
    return data.signedUrl
}

export async function deleteFile(
    bucket: 'assignments' | 'submissions',
    paths: string[]
) {
    const supabase = createClient()
    const { error } = await supabase.storage.from(bucket).remove(paths)
    if (error) throw error
}
