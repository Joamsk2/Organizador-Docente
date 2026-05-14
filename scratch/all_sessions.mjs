import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAllSessions() {
  const { data: sessions } = await supabase.from('class_sessions').select('id, date, course_id, title').limit(50)
  console.log('Found sessions:', sessions?.length)
  sessions?.forEach(s => console.log(`- Course: ${s.course_id}, Date: ${s.date}, Title: ${s.title}`))
}

checkAllSessions()
