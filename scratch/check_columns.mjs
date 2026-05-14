import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkColumns() {
  const { data, error } = await supabase.from('class_sessions').select('*').limit(1)
  if (error) {
    console.error('Error fetching sample:', error)
    // Try to select only some columns to find which one is missing
    const cols = ['id', 'date', 'topic', 'course_id', 'created_at']
    for (const col of cols) {
      const { error: colErr } = await supabase.from('class_sessions').select(col).limit(1)
      console.log(`Column ${col}: ${colErr ? 'MISSING' : 'OK'}`)
    }
    // Try title
    const { error: titleErr } = await supabase.from('class_sessions').select('title').limit(1)
    console.log(`Column title: ${titleErr ? 'MISSING' : 'OK'}`)
  } else {
    console.log('Sample Data Columns:', Object.keys(data[0] || {}))
  }
}

checkColumns()
