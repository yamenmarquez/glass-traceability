// src/components/EmergencyAuthReset.tsx - Emergency component to break auth loops
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export function EmergencyAuthReset() {
  const [countdown, setCountdown] = useState(10)
  const [isResetting, setIsResetting] = useState(false)

  useEffect(() => {
    // Start countdown
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Auto-reset when countdown reaches 0
          handleEmergencyReset()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleEmergencyReset = async () => {
    setIsResetting(true)
    
    try {
      console.log('🚨 Emergency auth reset initiated')
      
      // Clear all browser storage
      localStorage.clear()
      sessionStorage.clear()
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases()
        for (const db of databases) {
          if (db.name?.includes('supabase')) {
            console.log('Clearing Supabase IndexedDB:', db.name)
            indexedDB.deleteDatabase(db.name)
          }
        }
      }
      
      // Clear cookies
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
      })
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Force redirect
      window.location.href = '/auth/login'
      
    } catch (error) {
      console.error('Emergency reset failed:', error)
      // Fallback: hard reload
      window.location.reload()
    }
  }

  const handleManualReset = () => {
    setCountdown(0)
    handleEmergencyReset()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <Card className="max-w-md w-full mx-4">
        <CardHeader>
          <CardTitle className="flex items-center text-amber-600">
            <AlertTriangle className="h-6 w-6 mr-2" />
            Authentication Loop Detected
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-gray-700 mb-4">
              The system has detected an authentication loop. This usually happens when 
              cached authentication data becomes corrupted.
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-amber-800">
                <strong>Auto-reset in {countdown} seconds</strong>
              </p>
              <p className="text-xs text-amber-600 mt-1">
                This will clear all cached data and redirect to login
              </p>
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={handleManualReset}
                disabled={isResetting}
                className="w-full"
                variant="destructive"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Now'
                )}
              </Button>
              
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full"
                disabled={isResetting}
              >
                Try Page Reload Instead
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}