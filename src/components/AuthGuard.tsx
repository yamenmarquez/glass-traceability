// src/components/AuthGuard.tsx
'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'operator' | 'viewer'
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [shouldRender, setShouldRender] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (loading) return

    // User is not authenticated
    if (!user) {
      setRedirecting(true)
      router.push('/auth/login')
      return
    }

    // User is authenticated but profile not loaded yet
    if (!profile) {
      return
    }

    // Check role requirements
    if (requiredRole) {
      const roleHierarchy = { viewer: 1, operator: 2, admin: 3 }
      const userLevel = roleHierarchy[profile.role]
      const requiredLevel = roleHierarchy[requiredRole]

      if (userLevel < requiredLevel) {
        setRedirecting(true)
        router.push('/dashboard')
        return
      }
    }

    // Check if user is active
    if (!profile.active) {
      setRedirecting(true)
      router.push('/auth/login')
      return
    }

    // All checks passed
    setShouldRender(true)
  }, [user, profile, loading, requiredRole, router])

  // Show loading while authentication is being determined
  if (loading || !user || !profile || redirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {loading ? 'Loading...' : redirecting ? 'Redirecting...' : 'Authenticating...'}
          </p>
        </div>
      </div>
    )
  }

  if (!shouldRender) {
    return null
  }

  return <>{children}</>
}