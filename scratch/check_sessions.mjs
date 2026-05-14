import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSessions() {
  const courseId = '5d2881af-8ed4-4f5d-8bb0-077478a7d165'
  const { data: sessions } = await supabase.from('class_sessions').select('*').eq('course_id', courseId)
  console.log('Total sessions:', sessions?.length)
  
  const now = new Date()
  console.log('System Date:', now.toISOString())
  console.log('Current Month (0-indexed):', now.getMonth())
  console.log('Current Year:', now.getFullYear())

  sessions?.forEach(s => {
    const d = new Date(s.date + 'T12:00:00')
    console.log(`- Session Date: ${s.date}, Parsed Month: ${d.getMonth()}, Parsed Year: ${d.getFullYear()}`)
  })
}

checkSessions()
