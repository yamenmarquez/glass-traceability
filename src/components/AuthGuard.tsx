// src/components/AuthGuard.tsx - Enhanced version with better error handling and refresh capabilities
'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { EmergencyAuthReset } from '@/components/EmergencyAuthReset'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'operator' | 'viewer'
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { user, profile, loading, isRefreshing, refreshSession } = useAuth()
  const router = useRouter()
  const [shouldRender, setShouldRender] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [showRetry, setShowRetry] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  const [showEmergencyReset, setShowEmergencyReset] = useState(false)

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (showRetry) {
        handleRetry()
      }
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [showRetry])

  // Add loading timeout to prevent infinite loading
  useEffect(() => {
    if (loading || isRefreshing) {
      const timeout = setTimeout(() => {
        console.log('Loading timeout reached - showing retry option')
        setLoadingTimeout(true)
      }, 15000) // 15 seconds timeout

      // Emergency timeout for infinite loops
      const emergencyTimeout = setTimeout(() => {
        console.log('Emergency timeout reached - likely auth loop')
        setShowEmergencyReset(true)
      }, 30000) // 30 seconds emergency timeout

      return () => {
        clearTimeout(timeout)
        clearTimeout(emergencyTimeout)
      }
    } else {
      setLoadingTimeout(false)
    }
  }, [loading, isRefreshing])

  useEffect(() => {
    if (loading || isRefreshing) return

    // User is not authenticated
    if (!user) {
      // Show retry option if we've been trying for a while
      if (retryCount > 0) {
        setShowRetry(true)
        return
      }
      
      setRedirecting(true)
      router.push('/auth/login')
      return
    }

    // User is authenticated but profile not loaded yet
    if (!profile) {
      // If we've retried multiple times, show manual retry option
      if (retryCount >= 3) {
        setShowRetry(true)
        return
      }
      
      // Auto-retry profile loading
      setTimeout(() => {
        setRetryCount(prev => prev + 1)
      }, 2000)
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
    setShowRetry(false)
    setRetryCount(0)
  }, [user, profile, loading, isRefreshing, requiredRole, router, retryCount])

  const handleRetry = async () => {
    setShowRetry(false)
    setRetryCount(0)
    setLoadingTimeout(false)
    
    try {
      await refreshSession()
    } catch (error) {
      console.error('Manual refresh failed:', error)
      setRetryCount(prev => prev + 1)
      setTimeout(() => setShowRetry(true), 2000)
    }
  }

  const handleForceReload = () => {
    // Clear all local storage and reload
    localStorage.clear()
    sessionStorage.clear()
    window.location.reload()
  }

  const handleSignOut = () => {
    // Force a hard redirect to login
    window.location.href = '/auth/login'
  }

  // Show network connectivity warning
  if (!isOnline) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-600">
              <WifiOff className="h-6 w-6 mr-2" />
              Connection Lost
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              No internet connection detected. Please check your network and try again.
            </p>
            <div className="flex items-center justify-center text-sm text-gray-500">
              <div className="animate-pulse">Waiting for connection...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show retry interface for authentication issues
  if (showRetry) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="flex items-center text-amber-600">
              <AlertCircle className="h-6 w-6 mr-2" />
              Connection Issue
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Having trouble connecting to the system. This might be due to:
            </p>
            <ul className="text-sm text-gray-500 text-left space-y-1">
              <li>• Session timeout after inactivity</li>
              <li>• Temporary network issues</li>
              <li>• Server maintenance</li>
            </ul>
            <div className="flex flex-col gap-2 pt-4">
              <Button onClick={handleRetry} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
              <Button variant="outline" onClick={handleSignOut} className="w-full">
                Go to Login
              </Button>
            </div>
            <div className="flex items-center justify-center text-xs text-gray-400 mt-4">
              <Wifi className="h-3 w-3 mr-1" />
              Network: Connected
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading while authentication is being determined
  if (loading || !user || !profile || redirecting || isRefreshing) {
    const loadingMessage = 
      isRefreshing ? 'Refreshing session...' :
      loading ? 'Loading...' : 
      redirecting ? 'Redirecting...' : 
      'Authenticating...'

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                {isRefreshing && (
                  <RefreshCw className="h-6 w-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                )}
              </div>
              <p className="mt-4 text-gray-600">{loadingMessage}</p>
              {isRefreshing && (
                <div className="mt-2">
                  <div className="text-xs text-gray-500">
                    Updating your session for security
                  </div>
                  {loadingTimeout && (
                    <div className="mt-3 space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleForceReload}
                        className="w-full"
                      >
                        Force Reload
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSignOut}
                        className="w-full"
                      >
                        Go to Login
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {(loading && retryCount > 2) || loadingTimeout && (
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowRetry(true)}
                  >
                    Having trouble? Click here
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!shouldRender) {
    return null
  }

  // Show emergency reset if auth loop detected
  if (showEmergencyReset) {
    return <EmergencyAuthReset />
  }

  return <>{children}</>
}