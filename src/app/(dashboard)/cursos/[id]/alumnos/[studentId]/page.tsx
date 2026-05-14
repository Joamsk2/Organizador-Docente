'use client'

import { use, useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Download, Award, AlertTriangle, AlertCircle, FileText, Calendar, CheckCircle2, Clock, MessageSquare, Plus, Trash2, Sparkles } from 'lucide-react'
import { useStudentProfile } from '@/hooks/use-student-profile'
import { useObservations } from '@/hooks/use-observations'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { StudentReportPrintable } from '@/components/students/student-report-printable'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { toast } from 'sonner'

function getAcademicBadge(average: number, deliveryRate: number, attendancePercentage: number, hasGrades: boolean, hasAttendance: boolean, hasAssignments: boolean, attendanceStatsTotal: number) {
    // Thresholds
    const MIN_GRADE = 7.0
    const MIN_DELIVERY = 60
    const MIN_ATTENDANCE = 65

    const isFailingGrades = hasGrades && average < MIN_GRADE
    const isFailingDelivery = hasAssignments && deliveryRate < MIN_DELIVERY
    const isFailingAttendance = hasAttendance && attendanceStatsTotal >= 3 && attendancePercentage < MIN_ATTENDANCE

    const reasons: string[] = []
    if (isFailingGrades) reasons.push('Promedio')
    if (isFailingDelivery) reasons.push('Entregas')
    if (isFailingAttendance) reasons.push('Asistencia')

    if (reasons.length > 0) {
        return { 
            label: `En Riesgo (${reasons.join(', ')})`, 
            color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:border-red-800/50 dark:text-red-400', 
            icon: AlertTriangle 
        }
    }
    
    if (average >= 8 && deliveryRate >= 80 && attendancePercentage >= 80) {
        return { label: 'Excelente', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/50 dark:text-emerald-400', icon: Award }
    }

    return { label: 'Regular', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800/50 dark:text-blue-400', icon: CheckCircle2 }
}

export default function StudentProfilePage({ params }: { params: Promise<{ id: string, studentId: string }> }) {
    const { id: courseId, studentId } = use(params)
    const { profile, loading, fetchProfile } = useStudentProfile(studentId, courseId)
    const { observations: persistentObservations, loading: obsLoading, fetchObservations, addObservation, deleteObservation } = useObservations(studentId, courseId)

    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    const [pdfNotes, setPdfNotes] = useState('')
    const [aiSynthesis, setAiSynthesis] = useState('')
    const [isGeneratingSynthesis, setIsGeneratingSynthesis] = useState(false)
    const [newObservation, setNewObservation] = useState('')
    const [isAddingObservation, setIsAddingObservation] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [selectedReportPeriod, setSelectedReportPeriod] = useState('1er_trimestre')
    const printRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchProfile()
        fetchObservations()
    }, [fetchProfile, fetchObservations])

    if (loading || !profile) {
        return (
            <div className="flex-1 flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
        )
    }

    const { student, attendanceStats, gradesStats, assignmentStats } = profile

    // Determine Status
    const badge = getAcademicBadge(
        gradesStats.average, 
        assignmentStats.deliveryRate, 
        attendanceStats.percentage,
        gradesStats.recentGrades.length > 0,
        attendanceStats.total > 0,
        assignmentStats.totalAssigned > 0,
        attendanceStats.total
    )
    const BadgeIcon = badge.icon

    // Chart Data
    const attendanceData = [
        { name: 'Presente', value: attendanceStats.present + attendanceStats.late, color: '#10b981' },
        { name: 'Ausente', value: attendanceStats.absent, color: '#ef4444' },
        { name: 'Justificado', value: attendanceStats.justified, color: '#f59e0b' }
    ]

    const gradesChartData = gradesStats.recentGrades
        .slice()
        .reverse()
        .map(g => ({
            name: format(new Date(g.created_at || new Date()), 'dd/MMM', { locale: es }),
            Nota: Number(g.value)
        }))

    const handleGenerateSynthesis = async () => {
        setIsGeneratingSynthesis(true)
        try {
            const res = await fetch('/api/ai/generate-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: studentId,
                    course_id: courseId,
                    period: selectedReportPeriod
                })
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Error al generar síntesis')
            }

            const data = await res.json()
            setAiSynthesis(data.report.narrative_summary)
            toast.success('Síntesis generada por IA')
        } catch (error: any) {
            console.error('Error generating AI synthesis:', error)
            toast.error(error.message || 'Error al generar la síntesis con IA')
        } finally {
            setIsGeneratingSynthesis(false)
        }
    }

    const handleGeneratePDF = async () => {
        if (!printRef.current) return

        setIsExporting(true)
        try {
            // Need a slight delay to ensure React has fully committed the observations to the DOM 
            // of the hidden component before html2canvas reads it.
            await new Promise(resolve => setTimeout(resolve, 300))

            const canvas = await html2canvas(printRef.current, {
                scale: 2, // High resolution
                useCORS: true,
                logging: false,
                width: 794,
                height: 1123,
                windowWidth: 794,
                windowHeight: 1123,
                onclone: (clonedDoc) => {
                    // html2canvas doesn't support modern color functions like 'lab' or 'oklch'.
                    // We must deep-sanitize the cloned document to avoid crashes.
                    const elements = clonedDoc.getElementsByTagName('*');
                    for (let i = 0; i < elements.length; i++) {
                        const el = elements[i] as HTMLElement;
                        const styles = window.getComputedStyle(el);

                        // If any computed color property uses lab or oklch, reset it or replace it.
                        // For the report, we mostly care about text and borders.
                        ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke'].forEach(prop => {
                            const val = styles[prop as any];
                            if (val && (val.includes('lab(') || val.includes('oklch('))) {
                                el.style[prop as any] = 'inherit'; // Fallback to parent or default
                            }
                        });
                    }
                }
            })


            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            // A4 dimensions in mm: 210 x 297
            pdf.addImage(imgData, 'PNG', 0, 0, 210, 297)
            pdf.save(`Informe_Seguimiento_${student?.last_name}_${student?.first_name}.pdf`)

            toast.success('Informe PDF generado correctamente')
            setIsExportModalOpen(false)
            setPdfNotes('')
        } catch (error) {
            console.error('Error generating PDF:', error)
            toast.error('Ocurrió un error al generar el PDF')
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pt-4 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/cursos/${courseId}/alumnos`}
                        className="p-2 hover:bg-surface-secondary rounded-lg transition-colors text-text-muted hover:text-text-primary"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-text-primary">
                                {student?.first_name} {student?.last_name}
                            </h2>
                            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${badge.color}`}>
                                <BadgeIcon className="w-3.5 h-3.5" />
                                {badge.label}
                            </span>
                        </div>
                        <p className="text-text-secondary mt-1 text-sm">
                            DNI: {student?.dni || 'No registrado'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setIsExportModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-600/25"
                >
                    <Download className="w-5 h-5" />
                    Exportar Informe PDF
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Asistencia KPI */}
                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-text-secondary mb-1">Asistencia</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-text-primary">{attendanceStats.percentage}%</h3>
                        </div>
                        <p className="text-xs text-text-muted mt-2">{attendanceStats.total} clases registradas</p>
                    </div>
                    <div className="w-20 h-20">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={attendanceData}
                                    cx="50%" cy="50%"
                                    innerRadius={25}
                                    outerRadius={35}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {attendanceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Rendimiento KPI */}
                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                    <p className="text-sm font-medium text-text-secondary mb-1">Promedio General</p>
                    <div className="flex items-baseline gap-2 mb-4">
                        <h3 className="text-3xl font-bold text-text-primary">{gradesStats.average}</h3>
                        <span className="text-sm text-text-muted">/ 10</span>
                    </div>
                    <div className="h-12 -mx-2">
                        {gradesChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={gradesChartData}>
                                    <Line type="monotone" dataKey="Nota" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-xs text-text-muted italic px-2">Sin calificaciones suficientes para graficar</p>
                        )}
                    </div>
                </div>

                {/* Tasa de Entregas KPI */}
                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-sm font-medium text-text-secondary mb-1">Tasa de Entregas</p>
                        <div className="flex items-baseline gap-2">
                            {assignmentStats.totalAssigned > 0 ? (
                                <h3 className="text-3xl font-bold text-text-primary">{assignmentStats.deliveryRate}%</h3>
                            ) : (
                                <h3 className="text-3xl font-bold text-text-muted italic">N/A</h3>
                            )}
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs text-text-muted mb-1.5">
                            {assignmentStats.totalAssigned > 0 ? (
                                <>
                                    <span>{assignmentStats.delivered} Entregados</span>
                                    <span>{assignmentStats.totalAssigned} Asignados</span>
                                </>
                            ) : (
                                <span className="italic">Sin trabajos todavía</span>
                            )}
                        </div>
                        <div className="h-2 w-full bg-surface-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary-500 rounded-full transition-all duration-1000"
                                style={{ width: `${assignmentStats.deliveryRate}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Grids Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Actividad Académica Consolidada */}
                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary-500" />
                            <h3 className="text-lg font-bold text-text-primary">Actividad Académica</h3>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profile.recentEvaluations.length > 0 ? (
                            profile.recentEvaluations.slice(0, 10).map(evalItem => (
                                <div key={evalItem.id} className="flex items-center justify-between p-4 rounded-xl bg-surface-secondary/50 border border-border hover:border-primary-200 dark:hover:border-primary-800 transition-all group">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                                evalItem.type === 'trabajo' 
                                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                            }`}>
                                                {evalItem.type}
                                            </span>
                                            {evalItem.period && (
                                                <span className="text-[10px] text-text-muted font-medium uppercase tracking-wide">
                                                    {evalItem.period}
                                                </span>
                                            )}
                                        </div>
                                        <p className="font-bold text-sm text-text-primary truncate" title={evalItem.title}>
                                            {evalItem.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {evalItem.dueDate ? (
                                                <p className="text-[10px] text-text-muted flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    Vence: {format(new Date(evalItem.dueDate), "dd 'de' MMM", { locale: es })}
                                                </p>
                                            ) : (
                                                <p className="text-[10px] text-text-muted flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(new Date(evalItem.date || new Date()), "dd 'de' MMM", { locale: es })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="text-right flex flex-col items-end gap-1.5 ml-4">
                                        {evalItem.gradeValue !== null ? (
                                            <span className={`text-xl font-black ${
                                                evalItem.gradeValue >= 7 ? 'text-emerald-600 dark:text-emerald-400' : 
                                                evalItem.gradeValue >= 4 ? 'text-amber-600 dark:text-amber-400' : 
                                                'text-red-500 dark:text-red-400'
                                            }`}>
                                                {evalItem.gradeValue <= 4 ? 'NP' : evalItem.gradeValue}
                                            </span>
                                        ) : (
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border
                                                ${evalItem.status === 'pendiente' 
                                                    ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' 
                                                    : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'}
                                            `}>
                                                {evalItem.status === 'pendiente' ? 'Pendiente' : 'No Presentado'}
                                            </span>
                                        )}
                                        {evalItem.submissionStatus && evalItem.submissionStatus !== 'entregado' && (
                                            <span className="text-[9px] text-text-muted font-medium italic">
                                                Subida: {evalItem.submissionStatus}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center bg-surface-secondary/30 rounded-2xl border border-dashed border-border">
                                <FileText className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-20" />
                                <p className="text-sm text-text-muted italic">No hay actividad académica registrada aún</p>
                            </div>
                        )}

                        {/* Concepto de Desempeño Diario - Separado para destacar */}
                        {gradesStats.conceptAverage !== null && (
                            <div className="col-span-full flex items-center justify-between p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 mt-2">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                                        <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-amber-900 dark:text-amber-300">Promedio de Desempeño Diario</p>
                                        <p className="text-[10px] text-amber-700/70 dark:text-amber-400/50 mt-0.5">Nota automática basada en la participación diaria en clase</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-2xl font-black ${gradesStats.conceptAverage >= 7 ? 'text-emerald-600 dark:text-emerald-400' : gradesStats.conceptAverage >= 4 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400'}`}>
                                        {gradesStats.conceptAverage}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Notas de Asistencia (Desempeño Diario) */}
            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm mt-6">
                <div className="flex items-center gap-2 mb-6">
                    <Calendar className="w-5 h-5 text-primary-500" />
                    <h3 className="text-lg font-bold text-text-primary">Desempeño en Clase (Diario)</h3>
                </div>
                <p className="text-xs text-text-muted mb-4 -mt-4">
                    Estas notas fueron registradas durante el pase de asistencia y se utilizan para la síntesis cualitativa.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {attendanceStats.attendanceNotes && attendanceStats.attendanceNotes.length > 0 ? (
                        attendanceStats.attendanceNotes.map((note) => (
                            <div key={note.id} className="p-4 rounded-lg bg-primary-50/30 border border-primary-100 dark:bg-primary-900/10 dark:border-primary-800/30 relative">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary-100 text-primary-700 dark:bg-primary-900/60 dark:text-primary-300">
                                        {format(new Date(note.date), "dd 'de' MMMM", { locale: es })}
                                    </span>
                                </div>
                                <p className="text-sm text-text-primary italic">"{note.notes}"</p>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-8 text-center bg-surface-secondary/30 rounded-lg border border-dashed border-border">
                            <p className="text-sm text-text-muted italic">No hay notas de desempeño diario registradas aún</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Registro de Observaciones */}
            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm mt-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary-500" />
                        <h3 className="text-lg font-bold text-text-primary">Registro de Observaciones</h3>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    {obsLoading ? (
                        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary-500" /></div>
                    ) : persistentObservations.length > 0 ? (
                        persistentObservations.map((obs: any) => (
                            <div key={obs.id} className="p-4 rounded-lg bg-surface-secondary/50 border border-border relative group transition-all hover:shadow-md">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400">
                                            {format(new Date(obs.date), "dd 'de' MMM", { locale: es })}
                                        </span>
                                        <span className="text-xs text-text-muted">{obs.teachers?.full_name}</span>
                                    </div>
                                    <button
                                        onClick={() => deleteObservation(obs.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-all"
                                        title="Eliminar observación"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-sm text-text-primary whitespace-pre-wrap">{obs.content}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-text-muted italic text-center py-6 bg-surface-secondary/30 rounded-lg border border-dashed border-border">No hay observaciones registradas aún</p>
                    )}
                </div>

                {/* Formulario Nueva Observación */}
                <div className="mt-4 pt-4 border-t border-border">
                    <textarea
                        value={newObservation}
                        onChange={(e) => setNewObservation(e.target.value)}
                        placeholder="Añadir nueva observación académica o de comportamiento (ej. Desempeño en clase, participación...)"
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[100px] resize-y mb-3 text-sm transition-shadow"
                    />
                    <div className="flex justify-end">
                        <button
                            onClick={async () => {
                                if (!newObservation.trim()) return;
                                setIsAddingObservation(true);
                                await addObservation(newObservation);
                                setNewObservation('');
                                setIsAddingObservation(false);
                            }}
                            disabled={!newObservation.trim() || isAddingObservation}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all shadow-sm"
                        >
                            {isAddingObservation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Guardar Observación
                        </button>
                    </div>
                </div>
            </div>

            {/* Hidden Printable Component — Must have explicit size for html2canvas */}
            <div style={{ position: 'fixed', left: '-10000px', top: '0', width: '794px', height: '1123px', overflow: 'visible', zIndex: -1 }}>
                <StudentReportPrintable
                    ref={printRef}
                    profile={profile}
                    observations={pdfNotes}
                    persistentObservations={persistentObservations}
                    aiSynthesis={aiSynthesis}
                    courseName={profile.courseInfo?.name || "Curso Seleccionado"}
                    teacherName={profile.teacherInfo?.full_name || "Docente"}
                />
            </div>

            {/* Export Modal */}
            {isExportModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-surface rounded-2xl border border-border w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface-secondary/50">
                            <h3 className="text-lg font-bold text-text-primary">Configurar Informe PDF</h3>
                            <button
                                onClick={() => setIsExportModalOpen(false)}
                                className="text-text-muted hover:text-text-primary transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* AI Synthesis Section */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-text-secondary">
                                        Síntesis Cualitativa (IA)
                                    </label>
                                    <button
                                        onClick={handleGenerateSynthesis}
                                        disabled={isGeneratingSynthesis || isExporting}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-all shadow-sm"
                                    >
                                        {isGeneratingSynthesis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                        {isGeneratingSynthesis ? 'Analizando...' : 'Generar con IA'}
                                    </button>
                                </div>
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="radio" 
                                            id="period-trimestre" 
                                            name="report-period" 
                                            checked={selectedReportPeriod !== 'anual'} 
                                            onChange={() => setSelectedReportPeriod('1er_trimestre')}
                                            className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                                        />
                                        <label htmlFor="period-trimestre" className="text-xs font-medium text-text-secondary">1er Trimestre</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="radio" 
                                            id="period-anual" 
                                            name="report-period" 
                                            checked={selectedReportPeriod === 'anual'} 
                                            onChange={() => setSelectedReportPeriod('anual')}
                                            className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                                        />
                                        <label htmlFor="period-anual" className="text-xs font-medium text-text-secondary">Informe Anual</label>
                                    </div>
                                </div>
                                <p className="text-xs text-text-muted mb-2">
                                    La IA analiza calificaciones, asistencia y observaciones para generar un resumen pedagógico profesional.
                                </p>
                                {aiSynthesis ? (
                                    <div className="p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 rounded-lg">
                                        <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{aiSynthesis}</p>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-surface-secondary/50 border border-dashed border-border rounded-lg text-center">
                                        <p className="text-xs text-text-muted italic">Hacé click en "Generar con IA" para obtener la síntesis automática</p>
                                    </div>
                                )}
                            </div>

                            {/* Manual Notes Section */}
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Observaciones Adicionales (Opcional)
                                </label>
                                <p className="text-xs text-text-muted mb-2">
                                    Podés agregar un comentario manual que aparecerá al final del informe.
                                </p>
                                <textarea
                                    value={pdfNotes}
                                    onChange={(e) => setPdfNotes(e.target.value)}
                                    placeholder="Ej: Juan demuestra un gran avance en razonamiento lógico, pero sugerimos reforzar la lectura comprensiva..."
                                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[80px] resize-y text-sm"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-border bg-surface-secondary/50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsExportModalOpen(false)}
                                disabled={isExporting}
                                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleGeneratePDF}
                                disabled={isExporting}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                            >
                                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                {isExporting ? 'Generando...' : 'Generar PDF'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
