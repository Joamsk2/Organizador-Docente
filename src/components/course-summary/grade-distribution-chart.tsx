'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { GradeDistribution } from '@/types/course-dashboard'

interface GradeDistributionChartProps {
    data: GradeDistribution[]
}

export function GradeDistributionChart({ data }: GradeDistributionChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="text-base font-bold text-text-primary mb-4">Distribución Notas</h3>
                <div className="h-[200px] flex items-center justify-center text-text-secondary text-sm">
                    Sin calificaciones registradas
                </div>
            </div>
        )
    }

    return (
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
            <h3 className="text-base sm:text-lg font-bold text-text-primary mb-4">Distribución Notas</h3>
            <div className="h-[200px] sm:h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                            dataKey="range"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            dy={5}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            allowDecimals={false}
                        />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                padding: '10px',
                                backgroundColor: '#ffffff',
                            }}
                            formatter={(value: number | undefined) => [value ?? 0, 'Alumnos']}
                        />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
