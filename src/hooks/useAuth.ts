// src/hooks/useAuth.ts - FINAL VERSION with SIGNED_IN loop fix
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
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

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  session: Session | null
  isRefreshing: boolean
  lastActivity: number
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    session: null,
    isRefreshing: false,
    lastActivity: Date.now()
  })
  
  const [initialized, setInitialized] = useState(false)
  const supabase = createSupabaseClient()
  const refreshTimeoutRef = useRef<NodeJS.Timeout>()
  const activityTimeoutRef = useRef<NodeJS.Timeout>()
  const retryCountRef = useRef(0)
  const maxRetries = 3

  // Track how long we've been in loading state - FIXED PLACEMENT
  const loadingStartRef = useRef<number | null>(null)
  const [authLoopDetected, setAuthLoopDetected] = useState(false)
  
  // Track processed events to prevent duplicates
  const processedEventsRef = useRef<Set<string>>(new Set())

  // Detect authentication loops
  useEffect(() => {
    if (authState.loading && !authLoopDetected) {
      if (!loadingStartRef.current) {
        loadingStartRef.current = Date.now()
      } else {
        const loadingTime = Date.now() - loadingStartRef.current
        // If we've been loading for more than 10 seconds, likely an auth loop
        if (loadingTime > 10000) {
          console.error('Authentication loop detected - clearing all auth state')
          setAuthLoopDetected(true)
          
          // Force clear everything
          localStorage.clear()
          sessionStorage.clear()
          
          // Clear Supabase session
          supabase.auth.signOut({ scope: 'local' }).then(() => {
            // Hard redirect to login
            window.location.href = '/auth/login'
          })
        }
      }
    } else if (!authState.loading) {
      loadingStartRef.current = null
    }
  }, [authState.loading, authLoopDetected, supabase.auth])

  // Track user activity
  const updateLastActivity = useCallback(() => {
    setAuthState(prev => ({ ...prev, lastActivity: Date.now() }))
    
    // Clear existing timeout
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current)
    }
    
    // Set new timeout for 30 minutes of inactivity
    activityTimeoutRef.current = setTimeout(() => {
      console.log('Extended inactivity detected, refreshing session...')
      refreshSession()
    }, 30 * 60 * 1000) // 30 minutes
  }, [])

  // Enhanced session refresh with retry logic
  const refreshSession = useCallback(async (forceRefresh = false) => {
    if (authState.isRefreshing && !forceRefresh) {
      console.log('Session refresh already in progress')
      return { data: null, error: null }
    }

    console.log('Refreshing session...', { retryCount: retryCountRef.current })
    
    setAuthState(prev => ({ ...prev, isRefreshing: true }))

    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Session refresh failed:', error)
        
        // Handle specific error cases
        if (error.message?.includes('refresh_token_not_found') || 
            error.message?.includes('Invalid Refresh Token')) {
          console.log('Refresh token not found - user needs to sign in again')
          // Don't retry for missing refresh tokens, just clear the session
          setAuthState(prev => ({
            ...prev,
            user: null,
            profile: null,
            session: null,
            isRefreshing: false
          }))
          retryCountRef.current = 0
          return { data: null, error }
        }
        
        retryCountRef.current++
        
        if (retryCountRef.current < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, retryCountRef.current) * 1000
          console.log(`Retrying session refresh in ${delay}ms...`)
          
          setTimeout(() => refreshSession(true), delay)
          return { data: null, error }
        } else {
          // Max retries reached, sign out user
          console.error('Max refresh retries reached, signing out user')
          await signOut()
          retryCountRef.current = 0
          return { data: null, error }
        }
      }

      // Success - reset retry counter
      retryCountRef.current = 0
      console.log('Session refreshed successfully')
      return { data, error: null }
      
    } catch (error) {
      console.error('Unexpected error during session refresh:', error)
      
      // Handle missing refresh token errors
      if (error instanceof Error && 
          (error.message?.includes('refresh_token_not_found') || 
           error.message?.includes('Invalid Refresh Token'))) {
        console.log('Caught refresh token error - clearing session')
        setAuthState(prev => ({
          ...prev,
          user: null,
          profile: null,
          session: null,
          isRefreshing: false
        }))
        retryCountRef.current = 0
        return { data: null, error: error as any }
      }
      
      retryCountRef.current++
      
      if (retryCountRef.current < maxRetries) {
        const delay = Math.pow(2, retryCountRef.current) * 1000
        setTimeout(() => refreshSession(true), delay)
      } else {
        await signOut()
        retryCountRef.current = 0
      }
      
      return { data: null, error: error as any }
    } finally {
      setAuthState(prev => ({ ...prev, isRefreshing: false }))
    }
  }, [authState.isRefreshing, supabase.auth])

  // Fetch user profile with retry logic
  const fetchProfile = useCallback(async (userId: string, retryCount = 0): Promise<Profile | null> => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Error fetching profile:', error)
        
        // If it's a session error, try to refresh
        if (error.message?.includes('JWT') || error.message?.includes('session') || error.code === 'PGRST301') {
          if (retryCount < 2) {
            console.log('Session issue detected, refreshing and retrying profile fetch...')
            const refreshResult = await refreshSession(true)
            if (refreshResult.data) {
              return fetchProfile(userId, retryCount + 1)
            }
          }
        }
        
        return null
      }
      
      return profileData
    } catch (error) {
      console.error('Unexpected error fetching profile:', error)
      return null
    }
  }, [supabase, refreshSession])

  // Set up automatic token refresh
  const setupTokenRefresh = useCallback((session: Session) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    if (!session?.expires_at) return

    // Calculate time until token expires (refresh 5 minutes before expiry)
    const expiresAt = session.expires_at * 1000 // Convert to milliseconds
    const refreshAt = expiresAt - (5 * 60 * 1000) // 5 minutes before expiry
    const timeUntilRefresh = refreshAt - Date.now()

    // Only set up refresh if we have reasonable time left (more than 1 minute)
    if (timeUntilRefresh > 60000) { // 1 minute minimum
      console.log(`Token will be refreshed in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`)
      
      refreshTimeoutRef.current = setTimeout(() => {
        console.log('Automatic token refresh triggered')
        refreshSession()
      }, timeUntilRefresh)
    } else if (timeUntilRefresh > 0) {
      // Token expires soon but not immediately - wait a bit then refresh
      console.log(`Token expires in ${Math.round(timeUntilRefresh / 1000)} seconds - setting short refresh timer`)
      refreshTimeoutRef.current = setTimeout(() => {
        console.log('Short-term token refresh triggered')
        refreshSession()
      }, Math.max(timeUntilRefresh - 10000, 5000)) // Refresh 10 seconds before expiry, minimum 5 seconds
    } else {
      // Token is already expired - let Supabase handle it naturally
      console.log('Token already expired - letting Supabase handle refresh naturally')
    }
  }, [refreshSession])

  // Initialize authentication
  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          
          // Handle refresh token errors gracefully during initialization
          if (error.message?.includes('refresh_token_not_found') || 
              error.message?.includes('Invalid Refresh Token')) {
            console.log('No valid refresh token found - starting fresh session')
          }
          
          if (isMounted) {
            setAuthState(prev => ({
              ...prev,
              user: null,
              profile: null,
              session: null,
              loading: false
            }))
            setInitialized(true)
          }
          return
        }

        if (isMounted) {
          const user = session?.user ?? null
          setAuthState(prev => ({
            ...prev,
            user,
            session
          }))
          
          if (session?.user) {
            // Set up automatic token refresh
            setupTokenRefresh(session)
            
            // Fetch profile
            const profileData = await fetchProfile(session.user.id)
            if (isMounted) {
              setAuthState(prev => ({
                ...prev,
                profile: profileData,
                loading: false
              }))
            }
          } else {
            if (isMounted) {
              setAuthState(prev => ({
                ...prev,
                profile: null,
                loading: false
              }))
            }
          }
          
          if (isMounted) {
            setInitialized(true)
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        
        // Handle initialization errors gracefully
        if (error instanceof Error && 
            (error.message?.includes('refresh_token_not_found') || 
             error.message?.includes('Invalid Refresh Token'))) {
          console.log('Refresh token error during initialization - continuing without session')
        }
        
        if (isMounted) {
          setAuthState(prev => ({
            ...prev,
            user: null,
            profile: null,
            session: null,
            loading: false
          }))
          setInitialized(true)
        }
      }
    }

    initializeAuth()

    // Set up auth state change listener with duplicate prevention
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)
        
        if (!isMounted) return

        // Create unique event key to prevent duplicates
        const eventKey = `${event}-${session?.user?.id || 'null'}-${session?.expires_at || 'null'}`
        
        // Check if we've already processed this exact event
        if (processedEventsRef.current.has(eventKey)) {
          console.log('Duplicate auth event detected - ignoring:', eventKey)
          return
        }
        
        // Mark this event as processed
        processedEventsRef.current.add(eventKey)
        
        // Clean up old processed events (keep last 10)
        if (processedEventsRef.current.size > 10) {
          const eventsArray = Array.from(processedEventsRef.current)
          processedEventsRef.current = new Set(eventsArray.slice(-5))
        }

        // Handle sign out events
        if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
          console.log('User signed out or token refresh failed')
          setAuthState(prev => ({
            ...prev,
            user: null,
            profile: null,
            session: null,
            isRefreshing: false
          }))
          
          // Clear timeouts when session ends
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current)
          }
          if (activityTimeoutRef.current) {
            clearTimeout(activityTimeoutRef.current)
          }
          
          if (isMounted) {
            setInitialized(true)
          }
          return
        }

        // Handle token refresh - don't reload profile if it's the same user
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('Token refreshed successfully for user:', session.user.id)
          
          // Only update session and setup refresh, don't reload profile unless user changed
          setAuthState(prev => {
            // If it's the same user, just update the session
            if (prev.user?.id === session.user.id) {
              return {
                ...prev,
                session,
                isRefreshing: false,
                loading: false // Ensure loading is false
              }
            }
            // Different user, update everything
            return {
              ...prev,
              user: session.user,
              session,
              isRefreshing: false,
              loading: false
            }
          })
          
          // Set up automatic token refresh for refreshed session
          setupTokenRefresh(session)
          
          // Only fetch profile if user changed
          if (authState.user?.id !== session.user.id) {
            const profileData = await fetchProfile(session.user.id)
            if (isMounted) {
              setAuthState(prev => ({
                ...prev,
                profile: profileData,
                loading: false
              }))
            }
          }
          
          if (isMounted) {
            setInitialized(true)
          }
          return
        }

        // Handle SIGNED_IN events - CRITICAL FIX FOR LOOP
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in:', session.user.id)
          
          // Check if this is actually a new sign-in or just a duplicate event
          if (authState.user?.id === session.user.id && authState.profile && authState.session) {
            console.log('Duplicate SIGNED_IN event for same authenticated user - ignoring')
            // Just update the session and ensure loading is false
            setAuthState(prev => ({
              ...prev,
              session,
              loading: false,
              isRefreshing: false
            }))
            setupTokenRefresh(session)
            if (isMounted) {
              setInitialized(true)
            }
            return
          }
          
          // This is a genuine new sign-in
          updateLastActivity()

          setAuthState(prev => ({
            ...prev,
            user: session.user,
            session,
            isRefreshing: false
          }))
          
          // Set up automatic token refresh for new session
          setupTokenRefresh(session)
          
          // Fetch profile for signed in user
          const profileData = await fetchProfile(session.user.id)
          if (isMounted) {
            setAuthState(prev => ({
              ...prev,
              profile: profileData,
              loading: false
            }))
          }
          
          if (isMounted) {
            setInitialized(true)
          }
          return
        }

        // Handle any other auth events
        console.log('Other auth event:', event)
        updateLastActivity()

        const user = session?.user ?? null
        setAuthState(prev => ({
          ...prev,
          user,
          session,
          isRefreshing: false
        }))
        
        if (session?.user) {
          setupTokenRefresh(session)
          const profileData = await fetchProfile(session.user.id)
          if (isMounted) {
            setAuthState(prev => ({
              ...prev,
              profile: profileData,
              loading: false
            }))
          }
        } else {
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current)
          }
          if (activityTimeoutRef.current) {
            clearTimeout(activityTimeoutRef.current)
          }
          
          if (isMounted) {
            setAuthState(prev => ({
              ...prev,
              profile: null,
              loading: false
            }))
          }
        }
        
        if (isMounted) {
          setInitialized(true)
        }
      }
    )

    // Set up activity tracking
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    const throttledUpdateActivity = throttle(updateLastActivity, 60000) // Update at most once per minute

    events.forEach(event => {
      document.addEventListener(event, throttledUpdateActivity, true)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
      
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
      }
      
      events.forEach(event => {
        document.removeEventListener(event, throttledUpdateActivity, true)
      })
    }
  }, [supabase, setupTokenRefresh, fetchProfile, updateLastActivity])

  const signIn = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true }))
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        setAuthState(prev => ({ ...prev, loading: false }))
        return { data, error }
      }

      // Update activity on successful sign in
      updateLastActivity()
      
      return { data, error }
    } catch (error) {
      setAuthState(prev => ({ ...prev, loading: false }))
      return { data: null, error: error as any }
    }
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
    setAuthState(prev => ({ ...prev, loading: true }))
    
    // Clear timeouts
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current)
    }
    
    const { error } = await supabase.auth.signOut()
    
    if (!error) {
      setAuthState({
        user: null,
        profile: null,
        session: null,
        loading: false,
        isRefreshing: false,
        lastActivity: Date.now()
      })
    } else {
      setAuthState(prev => ({ ...prev, loading: false }))
    }
    
    return { error }
  }

  // Manual refresh function for components to use
  const manualRefresh = useCallback(async () => {
    return await refreshSession(true)
  }, [refreshSession])

  return {
    user: authState.user,
    profile: authState.profile,
    session: authState.session,
    loading: authState.loading || !initialized,
    isRefreshing: authState.isRefreshing,
    lastActivity: authState.lastActivity,
    signIn,
    signUp,
    signOut,
    refreshSession: manualRefresh,
    updateActivity: updateLastActivity,
  }
}

// Utility function to throttle activity updates
function throttle<T extends (...args: any[]) => any>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout | null = null
  let lastExecTime = 0
  
  return ((...args: any[]) => {
    const currentTime = Date.now()
    
    if (currentTime - lastExecTime > delay) {
      func(...args)
      lastExecTime = currentTime
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        func(...args)
        lastExecTime = Date.now()
        timeoutId = null
      }, delay - (currentTime - lastExecTime))
    }
  }) as T
}