// src/components/AuthGuard.tsx
'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'operator' | 'viewer'
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login')
        return
      }

      if (requiredRole && profile) {
        const roleHierarchy = { viewer: 1, operator: 2, admin: 3 }
        const userLevel = roleHierarchy[profile.role]
        const requiredLevel = roleHierarchy[requiredRole]

        if (userLevel < requiredLevel) {
          router.push('/dashboard')
          return
        }
      }
    }
  }, [user, profile, loading, requiredRole, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || (requiredRole && profile && !profile.active)) {
    return null
  }

  return <>{children}</>
}