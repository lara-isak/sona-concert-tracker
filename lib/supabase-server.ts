import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Server-side Supabase client with service role key
 * 
 * This client bypasses RLS and should ONLY be used in:
 * - API routes (server-side)
 * - Server components
 * - Never in client-side code
 * 
 * The service role key has full access to your database and storage.
 * Keep it secure and never expose it to the client.
 */
export function getSupabaseServer() {
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required")
  }

  // If service role key is not provided, fall back to anon key
  // This allows the code to work in development, but uploads might fail with RLS
  const key = supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!key) {
    throw new Error(
      "Either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required"
    )
  }

  return createClient<Database>(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
