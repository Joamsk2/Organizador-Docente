'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Clock, FileSpreadsheet, KanbanSquare, Library } from 'lucide-react'

export function CourseTabs({ courseId }: { courseId: string }) {
    const pathname = usePathname()

    const tabs = [
        { name: 'Dashboard', href: `/cursos/${courseId}`, icon: LayoutDashboard, exact: true },
        { name: 'Clase de Hoy', href: `/cursos/${courseId}/clase`, icon: Clock },
        { name: 'Calificaciones', href: `/cursos/${courseId}/calificaciones`, icon: FileSpreadsheet },
        { name: 'Trabajos', href: `/cursos/${courseId}/trabajos`, icon: KanbanSquare },
        { name: 'Bitácora', href: `/cursos/${courseId}/bitacora`, icon: Clock },
        { name: 'Planificación', href: `/cursos/${courseId}/planificacion`, icon: Library },
        { name: 'Alumnos', href: `/cursos/${courseId}/alumnos`, icon: Users },
    ]

    return (
        <div className="border-b border-border overflow-x-auto custom-scrollbar">
            <nav className="flex gap-6 min-w-max pb-px" aria-label="Tabs">
                {tabs.map((tab) => {
                    const isActive = tab.exact
                        ? pathname === tab.href
                        : pathname.startsWith(tab.href)

                    const Icon = tab.icon

                    return (
                        <Link
                            key={tab.name}
                            href={tab.href}
                            prefetch={true}
                            className={`flex items-center gap-2 py-3 border-b-2 font-medium text-sm transition-colors ${isActive
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
                                }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-primary-500' : 'text-text-muted'}`} />
                            {tab.name}
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
