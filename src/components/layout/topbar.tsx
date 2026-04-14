'use client'

import { useTheme } from 'next-themes'
import { Bell, Search, Sun, Moon, Menu, LogOut, HelpCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { useState, useEffect } from 'react'
import { useTeacher } from '@/hooks/use-teacher'

interface TopbarProps {
    onMobileMenuToggle: () => void
}

export function Topbar({ onMobileMenuToggle }: TopbarProps) {
    const { theme, setTheme } = useTheme()
    const router = useRouter()
    const { updatePreferences } = useTeacher()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        toast.success('Sesión cerrada')
        router.push('/login')
        router.refresh()
    }
    return (
        <header className="sticky top-0 z-30 h-16 bg-surface border-b border-border flex items-center gap-4 px-4 lg:px-6">
            {/* Mobile menu button */}
            <button
                onClick={onMobileMenuToggle}
                className="lg:hidden p-2 rounded-lg text-text-secondary hover:bg-surface-hover transition-colors"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Search */}
            <div id="tour-search" className="flex-1 max-w-md relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                    type="text"
                    placeholder="Buscar cursos, alumnos, TPs..."
                    className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
            </div>

            <div className="flex items-center gap-1 ml-auto">
                {/* Help / Restart Tour */}
                <button 
                    onClick={() => {
                        updatePreferences({ has_seen_tutorial: false })
                        window.location.reload() // Recargar para disparar el tour de nuevo
                    }}
                    className="p-2 rounded-lg text-text-secondary hover:bg-surface-hover transition-colors"
                    title="Ver tutorial de nuevo"
                >
                    <HelpCircle className="w-5 h-5" />
                </button>

                {/* Notifications */}
                <button id="tour-notifications" className="relative p-2 rounded-lg text-text-secondary hover:bg-surface-hover transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                </button>

                {/* Theme toggle */}
                <button
                    id="tour-theme"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="p-2 rounded-lg text-text-secondary hover:bg-surface-hover transition-colors"
                >
                    {mounted ? (
                        theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />
                    ) : (
                        <div className="w-5 h-5" /> // Placeholder to prevent layout shift
                    )}
                </button>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg text-text-secondary hover:bg-surface-hover hover:text-red-500 transition-colors"
                    title="Cerrar sesión"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </header>
    )
}
