'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { WeeklyAttendance } from '@/types/course-dashboard'

interface AttendanceTrendChartProps {
    data: WeeklyAttendance[]
}

export function AttendanceTrendChart({ data }: AttendanceTrendChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="text-base font-bold text-text-primary mb-4">Evolución Asistencia</h3>
                <div className="h-[200px] flex items-center justify-center text-text-secondary text-sm">
                    Sin datos de asistencia suficientes
                </div>
            </div>
        )
    }

    return (
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
            <h3 className="text-base sm:text-lg font-bold text-text-primary mb-4">Evolución Asistencia</h3>
            <div className="h-[200px] sm:h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                            dataKey="week"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            dy={5}
                        />
                        <YAxis
                            domain={[0, 100]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                padding: '10px',
                                backgroundColor: '#ffffff',
                            }}
                            formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(0)}%`, 'Asistencia']}
                        />
                        <Line
                            type="monotone"
                            dataKey="percentage"
                            stroke="#10b981"
                            strokeWidth={2.5}
                            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
