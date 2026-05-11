import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files (svg, png, jpg, etc.)
         * - manifest.json, sitemap.xml, robots.txt, etc.
         */
        '/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff|woff2|ttf|otf|mp4|webm|wav|mp3|m4a|aac|oga)$).*)',
    ],
}
