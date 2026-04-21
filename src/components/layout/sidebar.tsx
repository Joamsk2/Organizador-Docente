'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard, Building2, Users, ClipboardList,
    BarChart3, FileText, Settings, GraduationCap, X, CalendarCheck
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'

const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Mi Agenda', href: '/agenda', icon: CalendarCheck },
    { label: 'Escuelas', href: '/escuelas', icon: Building2 },
]

interface SidebarProps {
    userName?: string
    userEmail?: string
    mobileOpen?: boolean
    onMobileClose?: () => void
}

export function Sidebar({ userName = 'Docente', userEmail = '', mobileOpen, onMobileClose }: SidebarProps) {
    const pathname = usePathname()

    const sidebarContent = (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div id="tour-logo" className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
                <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-bold text-lg tracking-tight">{APP_NAME}</span>
                {onMobileClose && (
                    <button onClick={onMobileClose} className="ml-auto lg:hidden text-sidebar-text hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav id="tour-nav" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onMobileClose}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                                isActive
                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                            )}
                        >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            <span>{item.label}</span>
                        </Link>
                    )
                })}
            </nav>

            {/* User */}
            <div className="px-3 py-4 border-t border-white/10">
                <Link
                    href="/configuracion"
                    id="tour-settings"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                >
                    <Settings className="w-5 h-5" />
                    <span className="text-sm">Configuración</span>
                </Link>
                <div className="flex items-center gap-3 px-3 py-3 mt-1">
                    <div className="w-9 h-9 bg-primary-600/30 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary-300">{getInitials(userName)}</span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{userName}</p>
                        <p className="text-xs text-slate-400 truncate">{userEmail}</p>
                    </div>
                </div>
            </div>
        </div>
    )

    return (
        <>
            {/* Desktop sidebar */}
            <aside className="hidden lg:flex lg:w-[260px] lg:flex-col lg:fixed lg:inset-y-0 bg-sidebar z-40">
                {sidebarContent}
            </aside>

            {/* Mobile sidebar overlay */}
            {mobileOpen && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onMobileClose} />
                    <aside className="fixed inset-y-0 left-0 w-[280px] bg-sidebar z-50 lg:hidden animate-slide-in-left">
                        {sidebarContent}
                    </aside>
                </>
            )}
        </>
    )
}
