'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock, Users, ChevronDown, CheckCircle2, Loader2, MessageSquare, AlertCircle, Calendar as CalendarIcon, Cloud, CloudOff, Check, X, FileCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useCurriculum } from '@/hooks/use-curriculum'
import { GRADE_PERIOD_LABELS } from '@/lib/constants'
import type { Database } from '@/lib/types/database'

type GradePeriod = Database['public']['Enums']['grade_period']

interface Student {
    id: string
    first_name: string
    last_name: string
}

interface ClassSession {
    id: string
    course_id: string
    date: string
    topic: string | null
    activities: string | null
    general_notes: string | null
    next_class_topic: string | null
    next_class_reminders: string | null
}

export function ActiveClassView({ 
    courseId, 
    students,
    initialDate 
}: { 
    courseId: string, 
    students: Student[],
    initialDate?: string
}) {
    const [session, setSession] = useState<Partial<ClassSession>>({
        topic: null,
        activities: null,
        general_notes: null,
        next_class_topic: null,
        next_class_reminders: null
    })
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedTopics, setSelectedTopics] = useState<string[]>([])
    const [selectedPeriod, setSelectedPeriod] = useState<GradePeriod>('1er_trimestre')
    const { modules, fetchCurriculum } = useCurriculum(courseId)

    const [selectedDate, setSelectedDate] = useState<string>(() => {
        if (initialDate) return initialDate
        const d = new Date()
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    })

    // Student records state: Map of student_id -> record
    const [records, setRecords] = useState<Record<string, { attendance: string, performance: string, notes: string }>>({})
    const isFirstLoad = useRef(true)

    useEffect(() => {
        const initialRecords: Record<string, any> = {}
        students.forEach(s => {
            initialRecords[s.id] = { attendance: 'presente', performance: '', notes: '' }
        })
        setRecords(initialRecords)
        
        loadSessionForDate(selectedDate)
        fetchCurriculum(true) // Fetch topics in background
    }, [courseId, selectedDate, fetchCurriculum])

    const loadSessionForDate = async (dateStr: string) => {
        setLoading(true)
        isFirstLoad.current = true
        const supabase = createClient()

        const { data: sessionData } = await supabase
            .from('class_sessions')
            .select('*')
            .eq('course_id', courseId)
            .eq('date', dateStr)
            .single()

        if (sessionData) {
            setSessionId(sessionData.id)
            setSession(sessionData)

            const { data: recordsData } = await supabase
                .from('student_daily_records')
                .select('*')
                .eq('session_id', sessionData.id)

            const { data: topicsData } = await supabase
                .from('class_session_topics')
                .select('topic_id')
                .eq('class_session_id', sessionData.id)

            if (topicsData) {
                setSelectedTopics(topicsData.map(t => t.topic_id))
            } else {
                setSelectedTopics([])
            }

            if (recordsData && recordsData.length > 0) {
                const loadedRecords: Record<string, any> = { ...records }
                recordsData.forEach(r => {
                    loadedRecords[r.student_id] = {
                        ...loadedRecords[r.student_id],
                        performance: r.performance_score || '',
                        notes: r.quick_notes || ''
                    }
                })
                
                const { data: attendanceData } = await supabase
                    .from('attendance')
                    .select('*')
                    .eq('course_id', courseId)
                    .eq('date', dateStr)
                    
                if (attendanceData) {
                    attendanceData.forEach(a => {
                        if (loadedRecords[a.student_id]) {
                            loadedRecords[a.student_id].attendance = a.status
                        }
                    })
                }
                
                setRecords(loadedRecords)
            }
        } else {
            setSessionId(null)
            setSession({
                topic: '',
                activities: '',
                general_notes: '',
                next_class_topic: '',
                next_class_reminders: ''
            })
            setSelectedTopics([])

            const { data: attendanceData } = await supabase
                .from('attendance')
                .select('*')
                .eq('course_id', courseId)
                .eq('date', dateStr)
                
            if (attendanceData && attendanceData.length > 0) {
                const loadedRecords: Record<string, any> = { ...records }
                attendanceData.forEach(a => {
                    if (loadedRecords[a.student_id]) {
                        loadedRecords[a.student_id].attendance = a.status
                    }
                })
                setRecords(loadedRecords)
            }
        }
        setLoading(false)
        setTimeout(() => { isFirstLoad.current = false }, 500)
    }

    // Auto-save logic
    useEffect(() => {
        if (loading || isFirstLoad.current) return

        setSaveState('saving')
        const timer = setTimeout(() => {
            handleSave()
        }, 1500)

        return () => clearTimeout(timer)
    }, [session, records, selectedTopics])

    const handleSave = async () => {
        const supabase = createClient()
        
        try {
            let currentSessionId = sessionId

            if (currentSessionId) {
                await supabase.from('class_sessions').update(session).eq('id', currentSessionId)
            } else {
                const { data: newSession, error } = await supabase.from('class_sessions').insert({
                    course_id: courseId,
                    date: selectedDate,
                    ...session
                }).select().single()
                
                if (error) throw error
                currentSessionId = newSession.id
                setSessionId(currentSessionId)
            }

            const recordsToUpsert = Object.entries(records).map(([studentId, data]) => ({
                session_id: currentSessionId,
                student_id: studentId,
                performance_score: (data.performance || null) as any,
                quick_notes: data.notes
            }))
            
            await supabase.from('student_daily_records').upsert(recordsToUpsert, { onConflict: 'session_id,student_id' })
            
            const attendanceToUpsert = Object.entries(records).map(([studentId, data]) => ({
                course_id: courseId,
                student_id: studentId,
                date: selectedDate,
                status: data.attendance as any
            }))
            
            await supabase.from('attendance').delete().eq('course_id', courseId).eq('date', selectedDate)
            await supabase.from('attendance').insert(attendanceToUpsert)

            await supabase.from('class_session_topics').delete().eq('class_session_id', currentSessionId)
            if (selectedTopics.length > 0) {
                const topicsToInsert = selectedTopics.map(tId => ({
                    class_session_id: currentSessionId,
                    topic_id: tId
                }))
                await supabase.from('class_session_topics').insert(topicsToInsert)
                
                // Mark these topics as completed in curriculum
                await supabase
                    .from('curriculum_topics')
                    .update({ status: 'completed' })
                    .in('id', selectedTopics)
            }

            // Sync grades
            const PERFORMANCE_TO_GRADE: Record<string, number> = {
                'excelente': 10,
                'bien': 8,
                'regular': 7,
                'mal': 4
            }

            const gradesToUpsert = Object.entries(records)
                .filter(([_, data]) => data.performance)
                .map(([studentId, data]) => {
                    // Extract directly from string to avoid timezone issues
                    const [, month, day] = selectedDate.split('-')
                    const formattedDate = `${day}/${month}`
                    return {
                        course_id: courseId,
                        student_id: studentId,
                        period: selectedPeriod,
                        category: `Desempeño ${formattedDate}`,
                        value: PERFORMANCE_TO_GRADE[data.performance] || 8,
                        is_qualitative: true,
                        observations: `Clase ${selectedDate}${data.notes ? ` - ${data.notes}` : ''}`
                    }
                })

            // Always delete existing grades for this class date before inserting new ones
            const [, m, d] = selectedDate.split('-')
            const formattedDateDelete = `${d}/${m}`
            await supabase.from('grades')
                .delete()
                .eq('course_id', courseId)
                .eq('period', selectedPeriod)
                .eq('category', `Desempeño ${formattedDateDelete}`)

            if (gradesToUpsert.length > 0) {
                await supabase.from('grades').insert(gradesToUpsert)
            }

            setSaveState('saved')
            setLastSaved(new Date())
            setTimeout(() => {
                if (saveState === 'saved') setSaveState('idle')
            }, 3000)
        } catch (error) {
            console.error(error)
            setSaveState('error')
        }
    }

    const updateRecord = (studentId: string, field: string, value: string) => {
        setRecords(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], [field]: value }
        }))
    }

    // Auto-resize textarea handler
    const handleTextareaInput = (e: any) => {
        if (!e.target) return
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    }

    if (loading) return <div className="animate-pulse h-96 bg-surface-secondary/50 rounded-3xl" />

    const filteredStudents = students.filter(s => 
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6 pb-20 max-w-4xl mx-auto">
            {/* Top Bar: Date, Period & Autosave */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-10 py-4 -mx-4 px-4 sm:mx-0 sm:px-0 gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="pl-9 pr-3 py-1.5 bg-surface text-primary-600 dark:text-primary-400 font-bold border border-primary-500/20 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-sm cursor-pointer outline-none w-full sm:w-auto"
                        />
                    </div>
                    
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value as GradePeriod)}
                        className="py-1.5 px-3 bg-surface text-text-primary border border-border rounded-lg text-sm appearance-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-sm w-full sm:w-auto"
                    >
                        {Object.entries(GRADE_PERIOD_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
                    {saveState === 'saving' && (
                        <span className="flex items-center gap-1.5 text-primary-500">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Guardando...
                        </span>
                    )}
                    {saveState === 'saved' && lastSaved && (
                        <span className="flex items-center gap-1.5 text-emerald-500">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Guardado {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                    {saveState === 'error' && (
                        <span className="flex items-center gap-1.5 text-rose-500">
                            <CloudOff className="w-3.5 h-3.5" />
                            Error al guardar
                        </span>
                    )}
                    {saveState === 'idle' && lastSaved && (
                        <span className="flex items-center gap-1.5">
                            <Cloud className="w-3.5 h-3.5" />
                            Actualizado
                        </span>
                    )}
                </div>
            </div>

            {/* Inline Title & Activities */}
            <div className="bg-surface rounded-[2rem] border border-border p-6 shadow-sm flex flex-col gap-4">
                <input 
                    type="text" 
                    value={session.topic || ''}
                    onChange={(e) => setSession({...session, topic: e.target.value})}
                    placeholder="Escribe el tema de hoy..."
                    className="w-full bg-transparent font-black text-2xl sm:text-3xl text-text-primary placeholder:text-text-muted/30 focus:outline-none"
                />
                <textarea 
                    value={session.activities || ''}
                    onChange={(e) => {
                        setSession({...session, activities: e.target.value})
                        handleTextareaInput(e)
                    }}
                    onInput={handleTextareaInput}
                    placeholder="Consignas, actividades o notas rápidas sobre la planificación..."
                    rows={1}
                    className="w-full bg-transparent text-sm text-text-secondary placeholder:text-text-muted/50 focus:outline-none resize-none overflow-hidden min-h-[1.5rem] leading-relaxed"
                />

                <div className="pt-2 mt-2 border-t border-border/50">
                    <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Temas de Planificación Asociados</h4>
                    <div className="space-y-3">
                        <select
                            className="w-full bg-surface-secondary border border-border focus:border-primary-500 rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none transition-colors"
                            value=""
                            onChange={(e) => {
                                if (e.target.value && !selectedTopics.includes(e.target.value)) {
                                    setSelectedTopics([...selectedTopics, e.target.value])
                                }
                            }}
                        >
                            <option value="">+ Vincular un tema de la planificación...</option>
                            {modules.map(module => (
                                <optgroup key={module.id} label={module.title}>
                                    {module.topics?.map(topic => (
                                        <option 
                                            key={topic.id} 
                                            value={topic.id}
                                            disabled={selectedTopics.includes(topic.id)}
                                        >
                                            {topic.title}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        
                        {selectedTopics.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selectedTopics.map(topicId => {
                                    let topicTitle = 'Tema no encontrado'
                                    modules.forEach(m => {
                                        const t = m.topics?.find(t => t.id === topicId)
                                        if (t) topicTitle = t.title
                                    })
                                    return (
                                        <div key={topicId} className="bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2">
                                            <span className="font-medium truncate max-w-[200px]">{topicTitle}</span>
                                            <button 
                                                onClick={() => setSelectedTopics(selectedTopics.filter(id => id !== topicId))}
                                                className="hover:bg-primary-200 dark:hover:bg-primary-800 rounded-full p-0.5 transition-colors"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Students Vertical List */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                        Asistencia y Desempeño
                        <span className="bg-surface-secondary px-2 py-0.5 rounded-full text-xs">{students.length}</span>
                    </h3>
                    
                    <div className="relative w-full sm:w-64">
                        <input
                            type="text"
                            placeholder="Buscar alumno..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-surface border border-border focus:border-primary-500 rounded-full pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted/50 outline-none transition-colors"
                        />
                        <svg className="w-4 h-4 text-text-muted absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>
                
                <div className="flex flex-col gap-2">
                    {filteredStudents.map(student => {
                        const record = records[student.id] || { attendance: 'presente', performance: 'bien', notes: '' }
                        return (
                            <StudentRow 
                                key={student.id}
                                student={student}
                                courseId={courseId}
                                record={record}
                                updateRecord={updateRecord}
                            />
                        )
                    })}
                    {filteredStudents.length === 0 && (
                        <div className="py-8 text-center text-text-muted text-sm border border-dashed border-border rounded-2xl">
                            No se encontraron alumnos con ese nombre.
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Section: Cierre */}
            <div className="bg-surface rounded-3xl border border-border p-5 shadow-sm space-y-4 mt-8">
                <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">Cierre y Próxima Clase</h3>
                
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-surface-secondary/50 rounded-2xl p-4 border border-border/50">
                        <input 
                            type="text" 
                            value={session.next_class_topic || ''}
                            onChange={(e) => setSession({...session, next_class_topic: e.target.value})}
                            placeholder="Tema para la próxima..."
                            className="w-full bg-transparent text-sm font-bold text-text-primary placeholder:text-text-muted focus:outline-none mb-2"
                        />
                        <textarea 
                            value={session.next_class_reminders || ''}
                            onChange={(e) => {
                                setSession({...session, next_class_reminders: e.target.value})
                                handleTextareaInput(e)
                            }}
                            onInput={handleTextareaInput}
                            placeholder="Recordatorios, tareas o materiales..."
                            rows={1}
                            className="w-full bg-transparent text-xs text-text-secondary placeholder:text-text-muted/60 focus:outline-none resize-none min-h-[1.5rem]"
                        />
                    </div>
                    
                    <div className="bg-surface-secondary/50 rounded-2xl p-4 border border-border/50">
                        <textarea 
                            value={session.general_notes || ''}
                            onChange={(e) => {
                                setSession({...session, general_notes: e.target.value})
                                handleTextareaInput(e)
                            }}
                            onInput={handleTextareaInput}
                            placeholder="Anotaciones generales (¿Cómo funcionó el grupo hoy?)..."
                            rows={2}
                            className="w-full bg-transparent text-sm text-text-secondary placeholder:text-text-muted/60 focus:outline-none resize-none min-h-[2.5rem]"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

function StudentRow({ student, courseId, record, updateRecord }: { student: Student, courseId: string, record: any, updateRecord: (id: string, field: string, value: string) => void }) {
    const [isExpanded, setIsExpanded] = useState(false)
    const hasNotesOrPerfChanged = record.notes || record.performance !== 'bien'

    return (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm transition-all hover:border-primary-500/30">
            {/* Top Row: Always visible */}
            <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                
                {/* Name */}
                <div className="flex-1 flex items-center justify-between sm:justify-start gap-2 min-w-0">
                    <Link 
                        href={`/cursos/${courseId}/alumnos/${student.id}`}
                        className="font-bold text-sm text-text-primary hover:text-primary-500 truncate transition-colors"
                        title={`${student.last_name}, ${student.first_name}`}
                    >
                        {student.last_name}, {student.first_name}
                    </Link>
                    
                    {/* Mobile Expand Button (Visible only on small screens) */}
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={cn(
                            "sm:hidden p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium",
                            isExpanded || hasNotesOrPerfChanged ? "bg-primary-500/10 text-primary-500" : "text-text-muted hover:bg-surface-secondary"
                        )}
                    >
                        {hasNotesOrPerfChanged && !isExpanded && <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mr-1" />}
                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isExpanded && "rotate-180")} />
                    </button>
                </div>

                {/* Right Actions: Segmented Control + Desktop Expand Button */}
                <div className="flex items-center gap-2 justify-between sm:justify-end">
                    
                    {/* Unified Attendance Segmented Control */}
                    <div className="flex p-1 bg-surface-secondary rounded-xl border border-border/50">
                        {[
                            {id: 'presente', Icon: Check, color: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300'},
                            {id: 'tardanza', Icon: Clock, color: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300'},
                            {id: 'ausente', Icon: X, color: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-300'},
                            {id: 'justificado', Icon: FileCheck, color: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300'}
                        ].map(status => {
                            const isActive = record.attendance === status.id
                            const IconComponent = status.Icon
                            return (
                                <button
                                    key={status.id}
                                    onClick={() => updateRecord(student.id, 'attendance', status.id)}
                                    className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                        isActive
                                            ? `${status.color} text-white shadow-sm`
                                            : `text-text-muted hover:bg-white/10`
                                    )}
                                    title={status.id}
                                >
                                    <IconComponent className="w-4 h-4" />
                                </button>
                            )
                        })}
                    </div>

                    {/* Desktop Expand Button */}
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={cn(
                            "hidden sm:flex p-2 rounded-xl transition-colors items-center justify-center border border-transparent",
                            isExpanded || hasNotesOrPerfChanged ? "bg-primary-500/10 text-primary-500 border-primary-500/20" : "text-text-muted hover:bg-surface-secondary"
                        )}
                        title="Evaluación y notas"
                    >
                        {hasNotesOrPerfChanged && !isExpanded && <span className="absolute w-2 h-2 rounded-full bg-primary-500 -top-0.5 -right-0.5" />}
                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isExpanded && "rotate-180")} />
                    </button>
                </div>
            </div>

            {/* Accordion: Performance & Notes */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-surface-secondary/30 border-t border-border/50"
                    >
                        <div className="p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                            
                            {/* Performance Evaluator */}
                            <div className="flex items-center gap-1 bg-surface rounded-xl p-1 border border-border/50">
                                {[
                                    {val: 'excelente', icon: '⭐'}, 
                                    {val: 'bien', icon: '😊'}, 
                                    {val: 'regular', icon: '😐'}, 
                                    {val: 'mal', icon: '☹️'}
                                ].map(perf => (
                                    <button
                                        key={perf.val}
                                        onClick={() => {
                                            if (record.performance === perf.val) {
                                                updateRecord(student.id, 'performance', '')
                                            } else {
                                                updateRecord(student.id, 'performance', perf.val)
                                            }
                                        }}
                                        className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all",
                                            record.performance === perf.val 
                                                ? "bg-surface-secondary scale-110 shadow-sm" 
                                                : "grayscale opacity-40 hover:grayscale-0 hover:opacity-100"
                                        )}
                                        title={perf.val}
                                    >
                                        {perf.icon}
                                    </button>
                                ))}
                            </div>

                            {/* Quick Note Input */}
                            <div className="flex-1 w-full relative">
                                <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/50" />
                                <input 
                                    type="text"
                                    value={record.notes || ''}
                                    onChange={(e) => updateRecord(student.id, 'notes', e.target.value)}
                                    placeholder="Nota o comentario sobre el alumno..."
                                    className="w-full bg-surface border border-border/50 focus:border-primary-500 rounded-xl pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted/50 outline-none transition-colors"
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
