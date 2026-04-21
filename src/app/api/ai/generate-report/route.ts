import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { studentReportSchema } from '@/lib/ai/schemas'
import { REPORT_PROMPT } from '@/lib/ai/prompts'
import { createClient } from '@/lib/supabase/server'

// Max Vercel Function Duration (Seconds)
export const maxDuration = 60

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { student_id, course_id, period } = await request.json()

        if (!student_id || !course_id) {
            return NextResponse.json(
                { error: 'student_id y course_id son requeridos' },
                { status: 400 }
            )
        }

        // Fetch student info
        const { data: student } = await supabase
            .from('students')
            .select('first_name, last_name')
            .eq('id', student_id)
            .single()

        // Fetch grades
        const { data: grades } = await supabase
            .from('grades')
            .select('value, category, period, observations')
            .eq('student_id', student_id)
            .eq('course_id', course_id)

        // Fetch attendance (including daily notes)
        const { data: attendance } = await supabase
            .from('attendance')
            .select('status, date, notes')
            .eq('student_id', student_id)
            .eq('course_id', course_id)

        // Fetch AI correction summaries
        const { data: corrections } = await supabase
            .from('ai_corrections')
            .select(`
        correction_summary,
        suggested_grade,
        teacher_override_grade,
        created_at,
        assignment_submissions!inner(
          assignments!inner(title)
        )
      `)
            .eq('assignment_submissions.student_id', student_id)

        // Fetch student observations
        const { data: observations } = await supabase
            .from('student_observations')
            .select('content, date, teachers(full_name)')
            .eq('student_id', student_id)
            .eq('course_id', course_id)
            .order('date', { ascending: false })


        // Calculate metrics (SQL-free, using fetched data)
        const gradeValues = grades?.map(g => g.value) || []
        const averageGrade = gradeValues.length
            ? gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length
            : 0

        const totalAttendance = attendance?.length || 0
        const presentCount = attendance?.filter(a => a.status === 'presente').length || 0
        const attendanceRate = totalAttendance > 0
            ? Math.round((presentCount / totalAttendance) * 100)
            : 0

        // Build correction history summaries
        const correctionSummaries = corrections?.map(c => {
            const sub = (Array.isArray(c.assignment_submissions) ? c.assignment_submissions[0] : c.assignment_submissions) as any;
            const assignmentTitle = sub?.assignments?.title || 'Evaluación';
            return `- ${assignmentTitle}: Nota ${c.teacher_override_grade || c.suggested_grade}. ${c.correction_summary || ''}`;
        }).join('\n') || 'Sin correcciones registradas.';

        const observationsText = observations?.length
            ? observations.map(o => `- [${o.date}] ${o.teachers?.full_name || 'Docente'}: ${o.content}`).join('\n')
            : 'Sin observaciones registradas.'

        // Build daily performance notes (from attendance)
        const dailyNotesText = attendance?.filter(a => a.notes && a.notes.trim())?.length
            ? attendance
                .filter(a => a.notes && a.notes.trim())
                .map(a => `- [${a.date}]: ${a.notes}`)
                .join('\n')
            : 'Sin notas de participación diaria.'

        // Build compact prompt (only ~150 tokens per student)
        const studentData = `
Alumno: ${student?.first_name} ${student?.last_name}
Promedio: ${averageGrade.toFixed(1)}
Asistencia: ${attendanceRate}%
Cantidad de evaluaciones: ${gradeValues.length}
Período: ${period || 'General'}

Observaciones del docente (Pedagógicas):
${observationsText}

Registro de participación y desempeño diario (Clase a clase):
${dailyNotesText}

Historial de correcciones:
${correctionSummaries}
`.trim()

        const { object } = await generateObject({
            model: google('gemini-2.0-flash-exp'),
            schema: studentReportSchema,
            system: REPORT_PROMPT,
            prompt: studentData,
            maxRetries: 3,
        })

        // Save/update the performance snapshot
        const snapshotData = {
            student_id,
            course_id,
            period: period || '1er_trimestre',
            average_grade: averageGrade,
            attendance_rate: attendanceRate,
            assignments_completed: gradeValues.length,
            assignments_total: gradeValues.length, // Will be updated when we track total
            strengths: object.key_strengths,
            weaknesses: object.key_areas_for_improvement,
            ai_summary: object.narrative_summary,
            risk_level: object.overall_trend === 'declining' ? 'high' :
                object.overall_trend === 'stable' ? 'medium' : 'low',
            corrections_history: corrections?.map(c => {
                const sub = (Array.isArray(c.assignment_submissions) ? c.assignment_submissions[0] : c.assignment_submissions) as any;
                return {
                    assignment_title: sub?.assignments?.title || 'Evaluación',
                    date: c.created_at,
                    summary: c.correction_summary || '',
                    grade: c.teacher_override_grade || c.suggested_grade || 0,
                }
            }) || [],
        }

        // Upsert: update if exists, insert if not
        const { data: existing } = await supabase
            .from('student_performance_snapshots')
            .select('id')
            .eq('student_id', student_id)
            .eq('course_id', course_id)
            .eq('period', snapshotData.period)
            .single()

        if (existing) {
            await supabase
                .from('student_performance_snapshots')
                .update(snapshotData)
                .eq('id', existing.id)
        } else {
            await supabase
                .from('student_performance_snapshots')
                .insert(snapshotData)
        }

        return NextResponse.json({
            success: true,
            report: object,
            metrics: {
                average_grade: averageGrade,
                attendance_rate: attendanceRate,
                evaluations_count: gradeValues.length,
            },
        })

    } catch (error) {
        console.error('Report generation error:', error)
        return NextResponse.json(
            { error: 'Error al generar el informe' },
            { status: 500 }
        )
    }
}
