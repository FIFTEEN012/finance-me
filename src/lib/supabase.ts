import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** Returns null when env vars are not set (cloud sync disabled) */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

export const isCloudEnabled = !!(supabaseUrl && supabaseAnonKey)
