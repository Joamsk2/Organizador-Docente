'use client'

import { useTheme } from 'next-themes'
import { Bell, Search, Sun, Moon, Menu, LogOut, HelpCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { useState, useEffect, useRef } from 'react'
import { useTeacher } from '@/hooks/use-teacher'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GlobalSearch } from './global-search'

interface TopbarProps {
    onMobileMenuToggle: () => void
}

export function Topbar({ onMobileMenuToggle }: TopbarProps) {
    const { theme, setTheme } = useTheme()
    const router = useRouter()
    const { teacher, fetchTeacher, updatePreferences } = useTeacher()
    const [mounted, setMounted] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const notificationRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setMounted(true)
        fetchTeacher()

        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [fetchTeacher])

    const notifications: any[] = []


    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        toast.success('Sesión cerrada')
        router.push('/login')
        router.refresh()
    }
    return (
        <header className="sticky top-0 z-30 h-16 bg-surface/80 backdrop-blur-md flex items-center gap-4 px-4 lg:px-6 shadow-sm shadow-black/5">
            {/* Mobile menu button */}
            <button
                onClick={onMobileMenuToggle}
                className="lg:hidden p-2 rounded-lg text-text-secondary hover:bg-surface-hover transition-colors"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Search */}
            <GlobalSearch />

            <div className="flex items-center gap-1 ml-auto">
                {/* Help / Restart Tour */}
                <button 
                    onClick={async () => {
                        await updatePreferences({ has_seen_tutorial: false })
                        router.refresh() // Refrescar para disparar el tour de nuevo sin recarga total
                    }}
                    className="p-2 rounded-lg text-text-secondary hover:bg-surface-hover transition-colors"
                    title="Ver tutorial de nuevo"
                >
                    <HelpCircle className="w-5 h-5" />
                </button>

                {/* Notifications */}
                <div className="relative" ref={notificationRef}>
                    <button
                        id="tour-notifications"
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={cn(
                            "relative p-2 rounded-lg transition-colors",
                            showNotifications ? "bg-primary-50 text-primary-600" : "text-text-secondary hover:bg-surface-hover"
                        )}
                    >
                        <Bell className="w-5 h-5" />
                        {notifications.length > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-surface" />
                        )}
                    </button>

                    <AnimatePresence>
                        {showNotifications && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
                            >
                                <div className="p-4 border-b border-border bg-surface-secondary/50">
                                    <h3 className="font-black text-text-primary">Notificaciones</h3>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto">
                                    {notifications.length > 0 ? (
                                        notifications.map((n) => (
                                            <div key={n.id} className="p-4 border-b border-border last:border-0 hover:bg-surface-secondary transition-colors cursor-pointer">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="text-sm font-bold text-text-primary">{n.title}</p>
                                                    <span className="text-[10px] text-text-muted font-medium">{n.time}</span>
                                                </div>
                                                <p className="text-xs text-text-secondary leading-relaxed">{n.message}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center">
                                            <Bell className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-20" />
                                            <p className="text-sm text-text-secondary font-medium">No tienes notificaciones</p>
                                            <p className="text-xs text-text-muted mt-1">Te avisaremos cuando haya novedades.</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 bg-surface-secondary/30 text-center">
                                    <button className="text-xs font-bold text-primary-600 hover:underline">Marcar todas como leídas</button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

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
