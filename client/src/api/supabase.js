import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = import.meta.env.VITE_USE_MOCK_API === 'false' && url && key
  ? createClient(url, key) : null
