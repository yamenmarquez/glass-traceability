// src/lib/supabase.ts - REPLACE COMPLETELY with updated types matching your actual schema
import { createBrowserClient } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// For client-side usage (React components)
export function createSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// For server-side usage in Server Components (takes cookies as parameter)
export function createSupabaseServerClient(cookieStore: any) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// For middleware usage
export function createSupabaseMiddlewareClient(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  return { supabase, supabaseResponse }
}

// For admin operations (server-side only)
export function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Types - UPDATED TO MATCH YOUR ACTUAL SCHEMA
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          role: 'admin' | 'operator' | 'viewer'
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          role?: 'admin' | 'operator' | 'viewer'
          active?: boolean
        }
        Update: {
          name?: string
          role?: 'admin' | 'operator' | 'viewer'
          active?: boolean
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          contact_person: string | null
          email: string | null
          phone: string | null
          address: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          active?: boolean
        }
        Update: {
          name?: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          active?: boolean
        }
      }
      glass_types: {
        Row: {
          id: string
          type_name: string
          description: string | null
          thickness: number | null
          color: string | null
          specifications: any | null // jsonb
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          type_name: string
          description?: string | null
          thickness?: number | null
          color?: string | null
          specifications?: any | null
          active?: boolean
        }
        Update: {
          type_name?: string
          description?: string | null
          thickness?: number | null
          color?: string | null
          specifications?: any | null
          active?: boolean
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          client_id: string
          client_po: string | null
          barcode: string | null
          glass_type_id: string
          total_pieces: number
          priority: 'low' | 'medium' | 'high' | 'urgent'
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          remarks: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          order_number: string
          client_id: string
          client_po?: string | null
          barcode?: string | null
          glass_type_id: string
          total_pieces?: number
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          remarks?: string | null
        }
        Update: {
          client_id?: string
          client_po?: string | null
          glass_type_id?: string
          total_pieces?: number
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          remarks?: string | null
        }
      }
      pieces: {
        Row: {
          id: string
          order_number: string
          piece_number: number
          width_inches: number
          width_fraction: string
          height_inches: number
          height_fraction: string
          holes_count: number
          barcode: string
          current_status: string
          remarks: string | null
          location: string | null
          label: string | null
          sq_ft: number
          created_at: string
          updated_at: string
        }
        Insert: {
          order_number: string
          piece_number: number
          width_inches?: number
          width_fraction?: string
          height_inches?: number
          height_fraction?: string
          holes_count?: number
          barcode: string
          current_status?: string
          remarks?: string | null
          location?: string | null
          label?: string | null
        }
        Update: {
          piece_number?: number
          width_inches?: number
          width_fraction?: string
          height_inches?: number
          height_fraction?: string
          holes_count?: number
          current_status?: string
          remarks?: string | null
          location?: string | null
          label?: string | null
        }
      }
      work_stations: {
        Row: {
          id: string
          station_name: string
          active: boolean
          order_sequence: number
          created_at: string
          updated_at: string
          // NEW COLUMNS ADDED
          station_secret: string | null
          permissions: string[] | null
          location: string | null
        }
        Insert: {
          station_name: string
          active?: boolean
          order_sequence?: number
          station_secret?: string | null
          permissions?: string[] | null
          location?: string | null
        }
        Update: {
          station_name?: string
          active?: boolean
          order_sequence?: number
          station_secret?: string | null
          permissions?: string[] | null
          location?: string | null
        }
      }
      service_sessions: {
        Row: {
          id: string
          station_id: string
          station_name: string
          location: string
          permissions: string[]
          expires_at: string
          last_activity: string
          active: boolean
          created_at: string
        }
        Insert: {
          station_id: string
          station_name: string
          location: string
          permissions?: string[]
          expires_at: string
          last_activity?: string
          active?: boolean
        }
        Update: {
          station_name?: string
          location?: string
          permissions?: string[]
          expires_at?: string
          last_activity?: string
          active?: boolean
        }
      }
      processing_history: {
        Row: {
          id: string
          barcode: string
          station_id: string | null
          service_station_id: string | null // NEW COLUMN
          processed_at: string
          employee: string
          observations: string | null
          created_at: string
        }
        Insert: {
          barcode: string
          station_id?: string | null
          service_station_id?: string | null
          processed_at?: string
          employee: string
          observations?: string | null
        }
        Update: {
          barcode?: string
          station_id?: string | null
          service_station_id?: string | null
          processed_at?: string
          employee?: string
          observations?: string | null
        }
      }
      status_config: {
        Row: {
          id: string
          status_name: string
          station_id: string | null
          color: string
          is_final: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          status_name: string
          station_id?: string | null
          color?: string
          is_final?: boolean
        }
        Update: {
          status_name?: string
          station_id?: string | null
          color?: string
          is_final?: boolean
        }
      }
    }
    Views: {
      station_status: {
        Row: {
          id: string
          station_name: string
          location: string | null
          station_active: boolean
          order_sequence: number
          session_active: boolean | null
          expires_at: string | null
          last_activity: string | null
          status: string
        }
      }
    }
    Functions: {
      update_piece_status_via_scanner: {
        Args: {
          piece_barcode: string
          new_status: string
          station_id_param: string
          employee_name?: string
          notes?: string
        }
        Returns: any // JSON response
      }
      get_station_statistics: {
        Args: {
          station_id_param?: string
        }
        Returns: Array<{
          station_id: string
          station_name: string
          total_scans: number
          scans_today: number
          last_activity: string | null
          current_status: string
        }>
      }
      cleanup_expired_sessions: {
        Args: {}
        Returns: number
      }
    }
    Enums: {
      user_role: 'admin' | 'operator' | 'viewer'
      priority_level: 'low' | 'medium' | 'high' | 'urgent'
      order_status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
      piece_status: 'pending' | 'cutting' | 'tempering' | 'edge_work' | 'quality_check' | 'completed' | 'defective'
    }
  }
}