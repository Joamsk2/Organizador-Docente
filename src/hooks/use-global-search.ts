import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export type SearchResult = {
    id: string
    type: 'school' | 'course' | 'student'
    title: string
    subtitle: string
    href: string
}

export function useGlobalSearch(query: string) {
    const [results, setResults] = useState<SearchResult[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!query || query.length < 2) {
            setResults([])
            return
        }

        const timer = setTimeout(async () => {
            setLoading(true)
            const supabase = createClient()
            
            try {
                // Search Schools
                const { data: schools } = await supabase
                    .from('schools')
                    .select('id, name, address')
                    .ilike('name', `%${query}%`)
                    .limit(3)

                // Search Courses
                const { data: courses } = await supabase
                    .from('courses')
                    .select('id, name, year, division')
                    .ilike('name', `%${query}%`)
                    .limit(5)

                // Search Students
                const { data: students } = await supabase
                    .from('students')
                    .select('id, first_name, last_name')
                    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
                    .limit(5)

                const formattedResults: SearchResult[] = [
                    ...(schools?.map(s => ({
                        id: s.id,
                        type: 'school' as const,
                        title: s.name,
                        subtitle: s.address || 'Escuela',
                        href: '/escuelas'
                    })) || []),
                    ...(courses?.map(c => ({
                        id: c.id,
                        type: 'course' as const,
                        title: c.name,
                        subtitle: `${c.year}${c.division ? ` ${c.division}` : ''}`,
                        href: `/cursos/${c.id}`
                    })) || []),
                    ...(students?.map(s => ({
                        id: s.id,
                        type: 'student' as const,
                        title: `${s.first_name} ${s.last_name}`,
                        subtitle: 'Alumno',
                        href: `/dashboard` // Default for now, ideally find a course they are in
                    })) || [])
                ]

                setResults(formattedResults)
            } catch (error) {
                console.error('Search error:', error)
            } finally {
                setLoading(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [query])

    return { results, loading }
}
