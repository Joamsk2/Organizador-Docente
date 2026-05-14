'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
    LayoutDashboard, Building2,
    Settings, GraduationCap, X, CalendarCheck,
    ChevronRight, BookOpen
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'

const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Mis Escuelas', href: '/escuelas', icon: Building2 },
    { label: 'Mi Agenda', href: '/agenda', icon: CalendarCheck },
]

interface CourseShortcut {
    id: string
    name: string
    color: string | null
    year: string | null
    division: string | null
}

interface SidebarProps {
    userName?: string
    userEmail?: string
    mobileOpen?: boolean
    onMobileClose?: () => void
}

export function Sidebar({ userName = 'Docente', userEmail = '', mobileOpen, onMobileClose }: SidebarProps) {
    const pathname = usePathname()
    const [courses, setCourses] = useState<CourseShortcut[]>([])
    const [coursesExpanded, setCoursesExpanded] = useState(true)

    useEffect(() => {
        const fetchCourses = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('courses')
                .select('id, name, color, year, division')
                .order('name')
                .limit(8)
            if (data) setCourses(data)
        }
        fetchCourses()
    }, [])

    const sidebarContent = (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div id="tour-logo" className="flex items-center gap-3 px-5 py-6">
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
            <nav id="tour-nav" className="flex-1 px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar">
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

                {/* Mis Cursos section */}
                {courses.length > 0 && (
                    <div className="pt-3">
                        <button
                            onClick={() => setCoursesExpanded(prev => !prev)}
                            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-slate-400 transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <BookOpen className="w-3.5 h-3.5" />
                                Mis Cursos
                            </span>
                            <ChevronRight className={cn(
                                "w-3.5 h-3.5 transition-transform duration-200",
                                coursesExpanded && "rotate-90"
                            )} />
                        </button>

                        {coursesExpanded && (
                            <div className="mt-1 space-y-0.5">
                                {courses.map(course => {
                                    const href = `/cursos/${course.id}`
                                    const isActive = pathname.startsWith(href)
                                    return (
                                        <Link
                                            key={course.id}
                                            href={href}
                                            onClick={onMobileClose}
                                            title={`${course.name} ${course.year}${course.division ? ` ${course.division}` : ''}`}
                                            className={cn(
                                                'flex items-center gap-2.5 pl-4 pr-3 py-2 rounded-lg text-sm transition-all duration-200',
                                                isActive
                                                    ? 'bg-white/10 text-white'
                                                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                            )}
                                        >
                                            <span
                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: course.color || '#6366f1' }}
                                            />
                                            <span className="truncate text-xs font-medium">
                                                {course.name}
                                            </span>
                                            <span className="ml-auto text-[10px] text-slate-600 flex-shrink-0">
                                                {course.year}{course.division ? course.division : ''}
                                            </span>
                                        </Link>
                                    )
                                })}
                                <Link
                                    href="/escuelas"
                                    onClick={onMobileClose}
                                    className="flex items-center gap-2.5 pl-4 pr-3 py-1.5 rounded-lg text-[11px] text-slate-600 hover:text-slate-400 transition-colors"
                                >
                                    Ver todos →
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {courses.length === 0 && (
                    <div className="mt-3 mx-1">
                        <div className="rounded-lg border border-dashed border-white/10 p-3 text-center">
                            <p className="text-xs text-slate-500 font-medium">Sin cursos creados</p>
                            <Link
                                href="/escuelas"
                                onClick={onMobileClose}
                                className="text-xs text-primary-400 hover:text-primary-300 font-medium mt-1 inline-block"
                            >
                                + Crear primera escuela
                            </Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* User */}
            <div className="px-3 py-4 mt-auto border-t border-white/5">
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
            <aside className="hidden lg:flex lg:w-[260px] lg:flex-col lg:fixed lg:inset-y-0 bg-sidebar z-40 shadow-[4px_0_24px_rgba(0,0,0,0.3)]">
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
