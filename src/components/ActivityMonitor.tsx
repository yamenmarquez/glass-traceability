// src/components/ActivityMonitor.tsx - Component to monitor and handle user activity
'use client'

import { useEffect, useCallback, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Clock } from 'lucide-react'

interface ActivityMonitorProps {
  children: React.ReactNode
  warningThreshold?: number // Minutes before showing warning
  sessionTimeout?: number   // Minutes before forcing refresh
}

export function ActivityMonitor({ 
  children, 
  warningThreshold = 25, 
  sessionTimeout = 30 
}: ActivityMonitorProps) {
  const { updateActivity, refreshSession, lastActivity, user } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Calculate time since last activity
  const getTimeSinceLastActivity = useCallback(() => {
    if (!lastActivity) return 0
    return Math.floor((Date.now() - lastActivity) / 1000 / 60) // Minutes
  }, [lastActivity])

  // Handle session extension
  const handleExtendSession = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refreshSession()
      updateActivity()
      setShowWarning(false)
    } catch (error) {
      console.error('Failed to extend session:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [refreshSession, updateActivity])

  // Monitor activity and show warnings
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      const minutesSinceActivity = getTimeSinceLastActivity()
      
      if (minutesSinceActivity >= warningThreshold && minutesSinceActivity < sessionTimeout) {
        setShowWarning(true)
        setTimeUntilRefresh(sessionTimeout - minutesSinceActivity)
      } else if (minutesSinceActivity >= sessionTimeout) {
        // Auto-refresh session when timeout is reached
        console.log('Session timeout reached, auto-refreshing...')
        handleExtendSession()
      } else {
        setShowWarning(false)
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [user, warningThreshold, sessionTimeout, getTimeSinceLastActivity, handleExtendSession])

  // Activity warning overlay
  if (showWarning) {
    return (
      <div className="relative">
        {children}
        
        {/* Warning Overlay */}
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="flex items-center text-amber-600">
                <AlertTriangle className="h-6 w-6 mr-2" />
                Session Warning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <p className="text-gray-700 mb-2">
                  Your session will expire due to inactivity.
                </p>
                <p className="text-sm text-gray-600">
                  Time remaining: <strong>{timeUntilRefresh} minutes</strong>
                </p>
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={handleExtendSession}
                  disabled={isRefreshing}
                  className="w-full"
                >
                  {isRefreshing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Extending Session...
                    </>
                  ) : (
                    'Continue Working'
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => setShowWarning(false)}
                  className="w-full"
                >
                  Dismiss (will show again in 1 minute)
                </Button>
              </div>
              
              <div className="text-xs text-gray-500 text-center">
                Move your mouse or click anywhere to stay active
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return <>{children}</>
}