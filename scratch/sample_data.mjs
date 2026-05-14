import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAll() {
  const { data: att } = await supabase.from('attendance').select('student_id, course_id, status').limit(10)
  console.log('Sample Attendance:', att)

  const { data: grd } = await supabase.from('grades').select('student_id, value').limit(10)
  console.log('Sample Grades:', grd)
}

checkAll()
