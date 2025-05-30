// src/lib/supabase-server.ts - CREATE NEW FILE
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from './supabase'

// This file can only be imported in Server Components
export function getSupabaseServer() {
  const cookieStore = cookies()
  return createSupabaseServerClient(cookieStore)
}