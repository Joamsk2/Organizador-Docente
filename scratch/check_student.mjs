import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStudentRisk(studentId, courseId) {
  console.log(`Checking student ${studentId} in course ${courseId}`)
  
  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', studentId)
    .eq('course_id', courseId)

  const { data: grades } = await supabase
    .from('grades')
    .select('*')
    .eq('student_id', studentId)
    .eq('course_id', courseId)

  const { data: submissions } = await supabase
    .from('assignment_submissions')
    .select('*, assignments(course_id)')
    .eq('student_id', studentId)

  const { count: totalAssignments } = await supabase
    .from('assignments')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId)

  console.log('Attendance:', attendance?.length, 'records')
  if (attendance && attendance.length > 0) {
    const presents = attendance.filter(a => ['presente', 'tardanza'].includes(a.status)).length
    console.log(`- Presents: ${presents}, Total: ${attendance.length}, Rate: ${(presents/attendance.length*100).toFixed(1)}%`)
  }

  console.log('Grades:', grades?.length, 'records')
  if (grades && grades.length > 0) {
    const avg = grades.reduce((acc, g) => acc + g.value, 0) / grades.length
    console.log(`- Average: ${avg.toFixed(1)}`)
    grades.forEach(g => console.log(`  - ${g.category}: ${g.value}`))
  }

  const courseSubmissions = submissions?.filter(s => s.assignments?.course_id === courseId) || []
  console.log('Assignments:', totalAssignments, 'total for course')
  console.log(`- Delivered: ${courseSubmissions.length}, Rate: ${(totalAssignments > 0 ? (courseSubmissions.length / totalAssignments * 100) : 100).toFixed(1)}%`)
}

checkStudentRisk('d262d7d5-3f0a-46ae-949f-641de10418a3', '5d2881af-8ed4-4f5d-8bb0-077478a7d165')
