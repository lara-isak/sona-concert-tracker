import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = []
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL")
  if (!supabaseAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  throw new Error(
    `Missing Supabase environment variables: ${missing.join(", ")}. ` +
    `Please check your .env.local file and restart the dev server.`
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

