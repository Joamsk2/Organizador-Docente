import React from 'react'
import { StudentProfileData } from '@/hooks/use-student-profile'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props {
    profile: StudentProfileData;
    observations: string;
    courseName?: string;
}

export const StudentReportPrintable = React.forwardRef<HTMLDivElement, Props>(
    ({ profile, observations, courseName = 'Curso Actual' }, ref) => {
        const { student, attendanceStats, gradesStats, assignmentStats } = profile

        // A4 Paper Size at 96 DPI: 794px x 1123px (approx)
        return (
            <div className="absolute -left-[9999px] top-0 bg-white" style={{ width: '794px', minHeight: '1123px' }} ref={ref}>
                <div className="w-full h-full p-12 flex flex-col font-sans text-gray-900 bg-white">

                    {/* Header */}
                    <div className="border-b-2 pb-6 mb-8 flex justify-between items-end" style={{ borderColor: '#3730a3' }}>
                        <div>
                            <h1 className="text-3xl font-bold mb-1" style={{ color: '#312e81' }}>Informe de Seguimiento</h1>
                            <p className="font-medium tracking-wide uppercase text-sm" style={{ color: '#4b5563' }}>{courseName}</p>
                        </div>

                        <div className="text-right">
                            <p className="text-gray-500 text-sm">Fecha de emisión</p>
                            <p className="font-semibold">{format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}</p>
                        </div>
                    </div>

                    {/* Student Info Box */}
                    <div className="rounded-lg p-6 mb-8 border flex justify-between items-center" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                        <div>
                            <p className="text-sm uppercase tracking-widest mb-1.5 font-semibold" style={{ color: '#6b7280' }}>Alumno</p>
                            <h2 className="text-2xl font-bold text-gray-900">{student?.last_name}, {student?.first_name}</h2>
                            <p className="mt-1" style={{ color: '#4b5563' }}>DNI: {student?.dni || 'No registrado'}</p>
                        </div>
                    </div>


                    <div className="grid grid-cols-2 gap-8 mb-8">
                        {/* Attendance Resumen */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4">Control de Asistencia</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Porcentaje de Presentismo</span>
                                    <span className={`font-bold ${attendanceStats.percentage >= 80 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {attendanceStats.percentage}%
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Clases Registradas</span>
                                    <span className="font-medium text-gray-800">{attendanceStats.total}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Inasistencias</span>
                                    <span className="font-medium text-gray-800">{attendanceStats.absent}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Tardanzas / Retiros</span>
                                    <span className="font-medium text-gray-800">{attendanceStats.late}</span>
                                </div>
                            </div>
                        </div>

                        {/* Assignments Resumen */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4">Obligaciones Prácticas</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Ratio de Cumplimiento</span>
                                    <span className={`font-bold ${assignmentStats.deliveryRate >= 80 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {assignmentStats.deliveryRate}%
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Trabajos Asignados</span>
                                    <span className="font-medium text-gray-800">{assignmentStats.totalAssigned}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Trabajos Entregados</span>
                                    <span className="font-medium text-gray-800">{assignmentStats.delivered}</span>
                                </div>
                            </div>
                            {assignmentStats.totalAssigned > assignmentStats.delivered && (
                                <div className="mt-4 p-3 bg-amber-50 rounded border border-amber-200">
                                    <p className="text-xs text-amber-800 font-medium">Atención: El alumno adeuda o tiene pendientes {assignmentStats.totalAssigned - assignmentStats.delivered} trabajos prácticos.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Grades Table */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold border-b pb-2 mb-4" style={{ color: '#1f2937', borderColor: '#e5e7eb' }}>Desempeño Académico</h3>
                        <div className="flex justify-between items-end mb-4">
                            <span style={{ color: '#4b5563' }}>Promedio General Acumulado:</span>
                            <span className="text-xl font-bold" style={{ color: '#4338ca' }}>{gradesStats.average} / 10</span>
                        </div>

                        {gradesStats.recentGrades.length > 0 ? (
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-100/50">
                                        <th className="py-2 mb-1 border-b border-gray-300 font-medium text-gray-500">Categoría / Instancia</th>
                                        <th className="py-2 mb-1 border-b border-gray-300 font-medium text-gray-500">Periodo</th>
                                        <th className="py-2 mb-1 border-b border-gray-300 font-medium text-gray-500 text-right">Calificación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gradesStats.recentGrades.slice(0, 8).map(g => (
                                        <tr key={g.id} className="border-b border-gray-100">
                                            <td className="py-2.5 text-gray-800 font-medium">{g.category}</td>
                                            <td className="py-2.5 text-gray-500 capitalize">{g.period}</td>
                                            <td className="py-2.5 text-right font-bold text-gray-900">{g.value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-sm text-gray-500 italic">No hay calificaciones registradas aún en este ciclo.</p>
                        )}
                    </div>

                    {/* Observaciones */}
                    {observations && (
                        <div className="mb-12">
                            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4">Observaciones Pedagógicas</h3>
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 whitespace-pre-wrap text-sm text-gray-700 leading-relaxed min-h-[100px]">
                                {observations}
                            </div>
                        </div>
                    )}

                    {/* Signatures */}
                    <div className="mt-auto pt-16 grid grid-cols-2 gap-16">
                        <div className="text-center">
                            <div className="border-b border-gray-400 w-full mb-3"></div>
                            <p className="text-sm text-gray-600 font-medium">Firma del Docente / Preceptor</p>
                        </div>
                        <div className="text-center">
                            <div className="border-b border-gray-400 w-full mb-3"></div>
                            <p className="text-sm text-gray-600 font-medium">Firma del Padre / Tutor</p>
                        </div>
                    </div>

                </div>
            </div>
        )
    }
)

StudentReportPrintable.displayName = 'StudentReportPrintable'
