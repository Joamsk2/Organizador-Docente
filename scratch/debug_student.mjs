import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugStudent() {
  const studentId = 'd262d7d5-3f0a-46ae-949f-641de10418a3'
  const courseId = '5d2881af-8ed4-4f5d-8bb0-077478a7d165'

  const { data: student } = await supabase.from('students').select('*').eq('id', studentId).single()
  console.log('Student Info:', student)

  const { data: enrollment } = await supabase.from('enrollments').select('*').eq('student_id', studentId).eq('course_id', courseId).single()
  console.log('Enrollment:', enrollment)

  const { data: allAttendance } = await supabase.from('attendance').select('*').eq('student_id', studentId)
  console.log('All Attendance (any course):', allAttendance?.length)
  if (allAttendance) allAttendance.forEach(a => console.log(`  - Course: ${a.course_id}, Date: ${a.date}, Status: ${a.status}`))

  const { data: allGrades } = await supabase.from('grades').select('*').eq('student_id', studentId)
  console.log('All Grades (any course):', allGrades?.length)
  if (allGrades) allGrades.forEach(g => console.log(`  - Course: ${g.course_id}, Category: ${g.category}, Value: ${g.value}`))
}

debugStudent()
