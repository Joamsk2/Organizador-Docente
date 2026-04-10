'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ChartData {
    name: string
    [key: string]: any
}

interface MetricsChartProps {
    data: ChartData[]
    title: string
    dataKey: string
    color: string
}

export function MetricsChart({ data, title, dataKey, color }: MetricsChartProps) {
    return (
        <Card className="col-span-1 md:col-span-2 lg:col-span-3 border-border/50 shadow-sm rounded-2xl">
            <CardHeader className="pb-3 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/50 rounded-t-2xl">
                <CardTitle className="text-lg font-semibold text-text-primary">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                        />
                        <Tooltip
                            cursor={{ fill: '#f1f5f9' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '12px' }}
                            labelStyle={{ color: '#0f172a', fontWeight: 'bold', marginBottom: '4px' }}
                        />
                        <Bar
                            dataKey={dataKey}
                            fill={color}
                            radius={[6, 6, 0, 0]}
                            maxBarSize={40}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
