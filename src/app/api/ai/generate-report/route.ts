import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { geminiFlash } from '@/lib/ai/gemini'
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

        const isAnnual = period === 'anual'

        // Fetch grades
        let gradesQuery = supabase
            .from('grades')
            .select('value, category, period, observations')
            .eq('student_id', student_id)
            .eq('course_id', course_id)
        
        if (!isAnnual && period) {
            gradesQuery = gradesQuery.eq('period', period)
        }
        const { data: grades } = await gradesQuery

        // Fetch attendance (including daily notes)
        // Attendance doesn't have period, so we fetch all for now
        // TODO: In the future, filter attendance by date range if period is specific
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
                    assignments!inner(id, title, course_id, period)
                )
            `)
            .eq('assignment_submissions.student_id', student_id)
            .eq('assignment_submissions.assignments.course_id', course_id)

        // Filter corrections by period if not annual
        const filteredCorrections = (!isAnnual && period) 
            ? (corrections || []).filter(c => (c.assignment_submissions as any).assignments.period === period)
            : (corrections || [])

        // Fetch student observations
        const { data: observations } = await supabase
            .from('student_observations')
            .select('content, date, teachers(full_name)')
            .eq('student_id', student_id)
            .eq('course_id', course_id)
            .order('date', { ascending: false })

        // Fetch all categories in the course to calculate total practical assignments
        let allCourseGradesQuery = supabase
            .from('grades')
            .select('category')
            .eq('course_id', course_id)
        
        if (!isAnnual && period) {
            allCourseGradesQuery = allCourseGradesQuery.eq('period', period)
        }
        const { data: allCourseGrades } = await allCourseGradesQuery
        
        let assignmentsCountQuery = supabase
            .from('assignments')
            .select('id', { count: 'exact', head: true })
            .eq('course_id', course_id)
        
        if (!isAnnual && period) {
            assignmentsCountQuery = assignmentsCountQuery.eq('period', period)
        }
        const { count: assignmentsCount } = await assignmentsCountQuery

        const isPerformanceCategory = (cat: string) => cat.startsWith('Desempeño ')

        // Separate grades into practical works vs daily performance
        const practicalGrades = (grades || []).filter(g => !isPerformanceCategory(g.category))
        const performanceGrades = (grades || []).filter(g => isPerformanceCategory(g.category))

        // Practical works metrics
        const practicalValues = practicalGrades.map(g => g.value)
        const practicalAverage = practicalValues.length
            ? practicalValues.reduce((a, b) => a + b, 0) / practicalValues.length
            : 0

        // Daily performance concept average
        const performanceValues = performanceGrades.map(g => g.value)
        const conceptAverage = performanceValues.length
            ? performanceValues.reduce((a, b) => a + b, 0) / performanceValues.length
            : null

        // Attendance
        const totalAttendance = attendance?.length || 0
        const lateCount = attendance?.filter(a => a.status === 'tardanza').length || 0
        const presentCount = attendance?.filter(a => a.status === 'presente' || a.status === 'tardanza').length || 0
        const attendanceRate = totalAttendance > 0
            ? Math.round((presentCount / totalAttendance) * 100)
            : 0
        const actualPresentCount = attendance?.filter(a => a.status === 'presente').length || 0

        // Delivery rate: only practical works, grade 4 = not submitted
        const practicalCategories = Array.from(new Set(
            (allCourseGrades || []).map(g => g.category).filter(cat => !isPerformanceCategory(cat))
        ))
        const totalAssignments = practicalCategories.length + (assignmentsCount || 0)
        
        // Count how many practical categories this student has a grade > 4 in
        const deliveredCount = practicalCategories.filter(cat => {
            const grade = practicalGrades.find(g => g.category === cat)
            return grade && grade.value > 4
        }).length + (filteredCorrections?.length || 0) // Corrections count as delivered assignments

        const deliveryRate = totalAssignments > 0
            ? Math.round((deliveredCount / totalAssignments) * 100)
            : 0

        // Build correction history summaries
        const correctionSummaries = filteredCorrections?.map(c => {
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

        // Build structured prompt with clear separation
        const studentData = `
Alumno: ${student?.first_name} ${student?.last_name}
Período: ${isAnnual ? 'Informe Anual (todos los períodos)' : period || 'General'}

ESCALA DE CALIFICACIÓN:
- 4 = Nota mínima / Trabajo no presentado
- 7 = Nota mínima para aprobar
- 10 = Nota máxima / Excelente

═══ TRABAJOS PRÁCTICOS ═══
Promedio de Trabajos Prácticos: ${practicalAverage.toFixed(1)}
Tasa de entrega: ${deliveryRate}% (${deliveredCount} de ${totalAssignments} entregados)
${practicalGrades.length > 0
    ? practicalGrades.map(g => `- ${g.category}: ${g.value}${g.value <= 4 ? ' [NO PRESENTADO]' : ''}${g.observations ? ` (${g.observations})` : ''}`).join('\n')
    : 'Sin trabajos prácticos calificados aún.'}

═══ CONCEPTO DE DESEMPEÑO DIARIO ═══
${conceptAverage !== null
    ? `Promedio de Concepto: ${conceptAverage.toFixed(1)}\nCantidad de clases evaluadas: ${performanceValues.length}`
    : 'Sin registro de desempeño diario aún.'}

═══ ASISTENCIA ═══
 Porcentaje de Asistencia: ${attendanceRate}%
Clases registradas: ${totalAttendance} (Presentes: ${actualPresentCount}, Tardanzas: ${lateCount})

═══ OBSERVACIONES DEL DOCENTE ═══
${observationsText}

═══ REGISTRO DE PARTICIPACIÓN DIARIA ═══
${dailyNotesText}

═══ HISTORIAL DE CORRECCIONES ═══
${correctionSummaries}
`.trim()

        const { object } = await generateObject({
            model: geminiFlash,
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
            average_grade: practicalAverage,
            attendance_rate: attendanceRate,
            assignments_completed: deliveredCount,
            assignments_total: totalAssignments,
            strengths: object.key_strengths,
            weaknesses: object.key_areas_for_improvement,
            ai_summary: object.narrative_summary,
            risk_level: object.overall_trend === 'declining' ? 'high' :
                object.overall_trend === 'stable' ? 'medium' : 'low',
            corrections_history: filteredCorrections?.map(c => {
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
                average_grade: practicalAverage,
                concept_average: conceptAverage,
                attendance_rate: attendanceRate,
                delivery_rate: deliveryRate,
                evaluations_count: practicalGrades.length,
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
