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

function getAcademicBadge(average: number, deliveryRate: number, attendancePercentage: number) {
    if (average >= 8 && deliveryRate >= 80 && attendancePercentage >= 80) {
        return { label: 'Excelente', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/50 dark:text-emerald-400', icon: Award }
    }
    if (average < 6 || deliveryRate < 50 || attendancePercentage < 60) {
        return { label: 'En Riesgo', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:border-red-800/50 dark:text-red-400', icon: AlertTriangle }
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
    const badge = getAcademicBadge(gradesStats.average, assignmentStats.deliveryRate, attendanceStats.percentage)
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
                    period: '1er_trimestre'
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
                            <h3 className="text-3xl font-bold text-text-primary">{assignmentStats.deliveryRate}%</h3>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs text-text-muted mb-1.5">
                            <span>{assignmentStats.delivered} Entregados</span>
                            <span>{assignmentStats.totalAssigned} Asignados</span>
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

                {/* Trabajos Practicos */}
                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <FileText className="w-5 h-5 text-primary-500" />
                        <h3 className="text-lg font-bold text-text-primary">Últimas Entregas</h3>
                    </div>
                    <div className="space-y-4">
                        {assignmentStats.recentSubmissions.length > 0 ? (
                            assignmentStats.recentSubmissions.map(sub => (
                                <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary/50 border border-border">
                                    <div>
                                        <p className="font-medium text-sm text-text-primary">{sub.assignments?.title}</p>
                                        <p className="text-xs text-text-muted mt-0.5">Vencimiento: {sub.assignments?.due_date ? format(new Date(sub.assignments.due_date), "dd 'de' MMM", { locale: es }) : 'Sin fecha'}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-md text-xs font-medium border
                                        ${sub.status === 'entregado' || sub.status === 'corregido' ? 'bg-emerald-100/50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                            sub.status === 'pendiente' ? 'bg-amber-100/50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400' :
                                                'bg-surface-secondary text-text-secondary border-border'}
                                    `}>
                                        <span className="capitalize">{sub.status}</span>
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-text-muted italic text-center py-4">No hay trabajos prácticos registrados</p>
                        )}
                    </div>
                </div>

                {/* Calificaciones Recientes */}
                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <Award className="w-5 h-5 text-primary-500" />
                        <h3 className="text-lg font-bold text-text-primary">Calificaciones Recientes</h3>
                    </div>
                    <div className="space-y-4">
                        {gradesStats.recentGrades.length > 0 ? (
                            gradesStats.recentGrades.map(grade => (
                                <div key={grade.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary/50 border border-border">
                                    <div>
                                        <p className="font-medium text-sm text-text-primary">{grade.category}</p>
                                        <p className="text-xs text-text-muted mt-0.5 capitalize">{grade.period}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-lg font-bold ${Number(grade.value) >= 6 ? 'text-text-primary' : 'text-red-500 dark:text-red-400'}`}>
                                            {grade.value}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-text-muted italic text-center py-4">No hay calificaciones registradas</p>
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
                    courseName="Curso Seleccionado"
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
