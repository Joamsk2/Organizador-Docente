import React from 'react'
import { StudentProfileData } from '@/hooks/use-student-profile'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Observation {
    id: string;
    date: string;
    content: string;
    teachers?: { full_name: string } | null;
}

interface Props {
    profile: StudentProfileData;
    observations: string;
    persistentObservations?: Observation[];
    aiSynthesis?: string;
    courseName?: string;
}

export const StudentReportPrintable = React.forwardRef<HTMLDivElement, Props>(
    ({ profile, observations, persistentObservations = [], aiSynthesis = '', courseName = 'Curso Actual' }, ref) => {
        const { student, attendanceStats, gradesStats, assignmentStats } = profile

        // A4 Paper Size at 96 DPI: 794px x 1123px
        // ALL STYLES MUST BE INLINE for html2canvas compatibility (no Tailwind classes)
        return (
            <div
                ref={ref}
                style={{
                    width: '794px',
                    minHeight: '1123px',
                    backgroundColor: '#ffffff',
                    position: 'absolute',
                    left: '-9999px',
                    top: '0',
                    fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
                    color: '#111827',
                    fontSize: '13px',
                    lineHeight: '1.5',
                }}
            >
                <div style={{ padding: '40px 48px', display: 'flex', flexDirection: 'column', minHeight: '1123px' }}>

                    {/* ── Header ── */}
                    <div style={{ borderBottom: '3px solid #3730a3', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#312e81', margin: '0 0 6px 0' }}>Informe de Seguimiento</h1>
                            <p style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0 }}>{courseName}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 2px 0' }}>Fecha de emisión</p>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', margin: 0 }}>{format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}</p>
                        </div>
                    </div>

                    {/* ── Student Info Box ── */}
                    <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px 20px', marginBottom: '24px' }}>
                        <p style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 4px 0' }}>Alumno</p>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: '0 0 2px 0' }}>{student?.last_name}, {student?.first_name}</h2>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>DNI: {student?.dni || 'No registrado'}</p>
                    </div>

                    {/* ── Stats Grid (2 columns) ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>

                        {/* Attendance */}
                        <div>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '6px', marginBottom: '10px' }}>Control de Asistencia</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#4b5563' }}>Porcentaje de Presentismo</span>
                                    <span style={{ fontWeight: 700, color: attendanceStats.percentage >= 80 ? '#059669' : '#ef4444' }}>{attendanceStats.percentage}%</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span style={{ color: '#6b7280' }}>Clases Registradas</span>
                                    <span style={{ fontWeight: 500, color: '#374151' }}>{attendanceStats.total}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span style={{ color: '#6b7280' }}>Inasistencias</span>
                                    <span style={{ fontWeight: 500, color: '#374151' }}>{attendanceStats.absent}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span style={{ color: '#6b7280' }}>Tardanzas / Retiros</span>
                                    <span style={{ fontWeight: 500, color: '#374151' }}>{attendanceStats.late}</span>
                                </div>
                            </div>
                        </div>

                        {/* Assignments */}
                        <div>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '6px', marginBottom: '10px' }}>Obligaciones Prácticas</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#4b5563' }}>Ratio de Cumplimiento</span>
                                    <span style={{ fontWeight: 700, color: assignmentStats.deliveryRate >= 80 ? '#059669' : '#ef4444' }}>{assignmentStats.deliveryRate}%</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span style={{ color: '#6b7280' }}>Trabajos Asignados</span>
                                    <span style={{ fontWeight: 500, color: '#374151' }}>{assignmentStats.totalAssigned}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span style={{ color: '#6b7280' }}>Trabajos Entregados</span>
                                    <span style={{ fontWeight: 500, color: '#374151' }}>{assignmentStats.delivered}</span>
                                </div>
                            </div>
                            {assignmentStats.totalAssigned > assignmentStats.delivered && (
                                <div style={{ marginTop: '10px', padding: '8px 10px', backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '6px' }}>
                                    <p style={{ fontSize: '11px', color: '#92400e', fontWeight: 500, margin: 0 }}>
                                        Atención: El alumno adeuda {assignmentStats.totalAssigned - assignmentStats.delivered} trabajos prácticos.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── AI Synthesis ── */}
                    {aiSynthesis && (
                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '6px', marginBottom: '10px' }}>Síntesis Cualitativa</h3>
                            <div style={{ padding: '12px 14px', backgroundColor: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: '8px' }}>
                                <p style={{ fontSize: '12px', lineHeight: '1.7', color: '#374151', margin: 0, whiteSpace: 'pre-wrap' }}>{aiSynthesis}</p>
                            </div>
                        </div>
                    )}

                    {/* ── Grades Table ── */}
                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '6px', marginBottom: '10px' }}>Desempeño Académico</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                            <span style={{ color: '#6b7280', fontSize: '13px' }}>Promedio General Acumulado:</span>
                            <span style={{ fontSize: '18px', fontWeight: 700, color: '#4338ca' }}>{gradesStats.average} / 10</span>
                        </div>

                        {gradesStats.recentGrades.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '2px solid #d1d5db', fontWeight: 600, color: '#6b7280', fontSize: '11px' }}>Categoría / Instancia</th>
                                        <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '2px solid #d1d5db', fontWeight: 600, color: '#6b7280', fontSize: '11px' }}>Periodo</th>
                                        <th style={{ textAlign: 'right', padding: '8px 6px', borderBottom: '2px solid #d1d5db', fontWeight: 600, color: '#6b7280', fontSize: '11px' }}>Calificación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gradesStats.recentGrades.slice(0, 8).map(g => (
                                        <tr key={g.id}>
                                            <td style={{ padding: '7px 6px', borderBottom: '1px solid #f3f4f6', color: '#374151', fontWeight: 500 }}>{g.category}</td>
                                            <td style={{ padding: '7px 6px', borderBottom: '1px solid #f3f4f6', color: '#6b7280', textTransform: 'capitalize' }}>{g.period}</td>
                                            <td style={{ padding: '7px 6px', borderBottom: '1px solid #f3f4f6', color: '#111827', fontWeight: 700, textAlign: 'right' }}>{g.value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>No hay calificaciones registradas aún en este ciclo.</p>
                        )}
                    </div>

                    {/* ── Persistent Observations (from DB) ── */}
                    {persistentObservations.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '6px', marginBottom: '10px' }}>Registro de Observaciones</h3>
                            {persistentObservations.slice(0, 5).map((obs) => (
                                <div key={obs.id} style={{ padding: '8px 10px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#6b7280' }}>
                                            {format(new Date(obs.date), "dd 'de' MMMM, yyyy", { locale: es })}
                                        </span>
                                        {obs.teachers?.full_name && (
                                            <span style={{ fontSize: '10px', color: '#9ca3af' }}>{obs.teachers.full_name}</span>
                                        )}
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#374151', margin: 0 }}>{obs.content}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Manual Observations (from export modal) ── */}
                    {observations && (
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '6px', marginBottom: '10px' }}>Observaciones Pedagógicas Adicionales</h3>
                            <div style={{ padding: '10px 14px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                <p style={{ fontSize: '12px', lineHeight: '1.7', color: '#374151', margin: 0, whiteSpace: 'pre-wrap' }}>{observations}</p>
                            </div>
                        </div>
                    )}

                    {/* ── Spacer → Signatures ── */}
                    <div style={{ flexGrow: 1, minHeight: '40px' }} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', paddingTop: '20px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ borderBottom: '1px solid #9ca3af', marginBottom: '8px', height: '1px' }} />
                            <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, margin: 0 }}>Firma del Docente / Preceptor</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ borderBottom: '1px solid #9ca3af', marginBottom: '8px', height: '1px' }} />
                            <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, margin: 0 }}>Firma del Padre / Tutor</p>
                        </div>
                    </div>

                </div>
            </div>
        )
    }
)

StudentReportPrintable.displayName = 'StudentReportPrintable'
