'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, CalendarDays, BookOpen, Clock, ChevronRight, ChevronDown } from 'lucide-react'
import { useClassSessions, type ClassSessionWithDetails } from '@/hooks/use-class-sessions'
import { cn } from '@/lib/utils'

export default function BitacoraPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: courseId } = use(params)
    const { sessions, loading, fetchSessions, createSession } = useClassSessions(courseId)

    useEffect(() => {
        fetchSessions()
    }, [fetchSessions])

    const handleCreateSession = async () => {
        const title = prompt('Título o tema general de la clase:')
        if (title) {
            const today = new Date().toISOString().split('T')[0]
            await createSession({
                date: today,
                title,
                teacher_notes: '',
                instructions: ''
            })
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-text-secondary">Cargando bitácora...</div>
    }

    // Group sessions by Month Year
    const groupedSessions = sessions.reduce((acc, session) => {
        const date = new Date(session.date + 'T12:00:00')
        const monthYear = date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
        const label = monthYear.charAt(0).toUpperCase() + monthYear.slice(1)
        
        if (!acc[label]) {
            acc[label] = []
        }
        acc[label].push(session)
        return acc
    }, {} as Record<string, ClassSessionWithDetails[]>)

    const months = Object.keys(groupedSessions)

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-text-primary">Bitácora de Clases</h2>
                    <p className="text-text-secondary mt-1">Registro cronológico de las sesiones dictadas</p>
                </div>
                
                <button
                    onClick={handleCreateSession}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-600/25"
                >
                    <Plus className="w-5 h-5" />
                    Registrar Clase
                </button>
            </div>

            {/* Timeline Grouped by Month */}
            <div className="space-y-6">
                {months.length === 0 ? (
                    <div className="p-12 text-center bg-surface border border-dashed border-border rounded-3xl text-text-muted italic">
                        No hay clases registradas aún. Haz clic en "Registrar Clase" para comenzar.
                    </div>
                ) : (
                    months.map((month, index) => (
                        <MonthSection 
                            key={month}
                            monthYear={month}
                            sessions={groupedSessions[month]}
                            courseId={courseId}
                            defaultExpanded={index === 0} // Expand only the most recent month
                        />
                    ))
                )}
            </div>
        </div>
    )
}

function MonthSection({ 
    monthYear, 
    sessions, 
    courseId, 
    defaultExpanded 
}: { 
    monthYear: string, 
    sessions: ClassSessionWithDetails[], 
    courseId: string,
    defaultExpanded: boolean
}) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded)

    return (
        <div className="space-y-4">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 bg-surface hover:bg-surface-hover rounded-2xl transition-all border border-border shadow-sm group"
            >
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-text-primary">{monthYear}</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-600 dark:bg-primary-950/30 dark:text-primary-400 text-xs font-black">
                        {sessions.length} {sessions.length === 1 ? 'CLASE' : 'CLASES'}
                    </span>
                </div>
                <div className={cn(
                    "p-1.5 rounded-lg bg-surface-secondary text-text-muted transition-all",
                    isExpanded ? "rotate-180 bg-primary-500 text-white" : "group-hover:text-primary-500"
                )}>
                    <ChevronDown className="w-4 h-4" />
                </div>
            </button>

            {isExpanded && (
                <div className="relative border-l-2 border-border ml-4 sm:ml-6 space-y-8 pb-4 animate-slide-down">
                    {sessions.map((session) => (
                        <div key={session.id} className="relative pl-8 sm:pl-10 group">
                            {/* Timeline Node */}
                            <div className="absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 border-background bg-primary-500 shadow-sm group-hover:scale-125 transition-transform" />
                            
                            {/* Card */}
                            <Link href={`/cursos/${courseId}/bitacora/${session.id}`} className="block">
                                <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-primary-500/30 transition-all">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 text-sm text-text-secondary mb-1">
                                                <CalendarDays className="w-4 h-4" />
                                                <time>{new Date(session.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</time>
                                            </div>
                                            <h3 className="text-xl font-bold text-text-primary group-hover:text-primary-600 transition-colors">
                                                {session.topic || session.title || 'Clase sin tema'}
                                            </h3>
                                        </div>
                                        <div className="flex items-center text-text-muted group-hover:text-primary-500 transition-colors bg-surface-hover rounded-full p-2">
                                            <ChevronRight className="w-5 h-5" />
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {session.topics && session.topics.length > 0 ? (
                                            session.topics.map(t => (
                                                <span key={t.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-primary-50 text-primary-700 border border-primary-100">
                                                    <BookOpen className="w-3.5 h-3.5" />
                                                    {t.title}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-sm text-text-muted italic">Sin temas vinculados</span>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-6 text-sm text-text-secondary">
                                        <div className="flex items-center gap-1.5">
                                            <BookOpen className="w-4 h-4" />
                                            <span>{session.materials?.length || 0} Materiales</span>
                                        </div>
                                        {session.general_notes && (
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4" />
                                                <span className="truncate max-w-[200px]">Con notas</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
