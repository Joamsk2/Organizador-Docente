'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { createClient } from '@/lib/supabase/client'

import { PageTransition } from '@/components/layout/page-transition'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [mobileNavOpen, setMobileNavOpen] = useState(false)
    const [userName, setUserName] = useState('Docente')
    const [userEmail, setUserEmail] = useState('')

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            const user = session?.user
            if (user) {
                setUserEmail(user.email || '')
                // Fetch teacher profile
                const { data: teacher } = await supabase
                    .from('teachers')
                    .select('full_name')
                    .eq('id', user.id)
                    .single()
                if (teacher) setUserName(teacher.full_name)
            }
        }
        fetchUser()
    }, [])

    return (
        <div className="min-h-screen bg-surface-secondary">
            <Sidebar
                userName={userName}
                userEmail={userEmail}
                mobileOpen={mobileNavOpen}
                onMobileClose={() => setMobileNavOpen(false)}
            />

            <div className="lg:pl-[260px] flex flex-col h-screen overflow-hidden">
                <Topbar onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
                <main className="flex-1 flex flex-col min-h-0 p-4 lg:p-6">
                    <PageTransition>
                        {children}
                    </PageTransition>
                </main>
            </div>
        </div>
    )
}
