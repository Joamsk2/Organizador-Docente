import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function listStudents() {
  const courseId = '5d2881af-8ed4-4f5d-8bb0-077478a7d165'
  const { data: enrollments } = await supabase.from('enrollments').select('students(*)').eq('course_id', courseId)
  console.log('Students in course:', enrollments?.length)
  enrollments?.forEach(e => {
    const s = e.students
    console.log(`- ID: ${s.id}, Name: ${s.last_name}, ${s.first_name}`)
  })
}

listStudents()
