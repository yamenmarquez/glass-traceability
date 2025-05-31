// src/hooks/useAuth.ts - Fixed version to prevent auth loops
'use client'

import { useEffect, useState, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { createSupabaseClient } from '@/lib/supabase'

export interface Profile {
  id: string
  email: string
  name: string
  role: 'admin' | 'operator' | 'viewer'
  active: boolean
  created_at: string
  updated_at: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  
  const supabase = createSupabaseClient()

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }
      
      return profileData
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }, [supabase])

  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          if (isMounted) {
            setUser(null)
            setProfile(null)
            setLoading(false)
            setInitialized(true)
          }
          return
        }

        if (isMounted) {
          setUser(session?.user ?? null)
          
          if (session?.user) {
            const profileData = await fetchProfile(session.user.id)
            if (isMounted) {
              setProfile(profileData)
            }
          } else {
            setProfile(null)
          }
          
          setLoading(false)
          setInitialized(true)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (isMounted) {
          setUser(null)
          setProfile(null)
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)
        
        if (!isMounted) return

        setUser(session?.user ?? null)
        
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id)
          if (isMounted) {
            setProfile(profileData)
          }
        } else {
          setProfile(null)
        }
        
        if (isMounted) {
          setLoading(false)
          setInitialized(true)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      setLoading(false)
    }
    
    return { data, error }
  }

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    })
    return { data, error }
  }

  const signOut = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setProfile(null)
    }
    setLoading(false)
    return { error }
  }

  return {
    user,
    profile,
    loading: loading || !initialized,
    signIn,
    signUp,
    signOut,
  }
}