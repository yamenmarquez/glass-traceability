// src/components/Layout.tsx - Enhanced layout with activity monitoring
'use client'

import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ActivityMonitor } from '@/components/ActivityMonitor'
import { 
  LogOut, 
  Home, 
  Package, 
  Scan, 
  Settings, 
  Users,
  BarChart3,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut, isRefreshing, refreshSession } = useAuth()
  const pathname = usePathname()
  const [isOnline, setIsOnline] = useState(true)
  const [showRefreshButton, setShowRefreshButton] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'operator', 'viewer'] },
    { name: 'Scanner', href: '/scanner', icon: Scan, roles: ['admin', 'operator'] },
    { name: 'Orders', href: '/orders', icon: Package, roles: ['admin', 'operator', 'viewer'] },
    { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'operator', 'viewer'] },
    { name: 'Admin', href: '/admin', icon: Settings, roles: ['admin'] },
  ]

  const filteredNavigation = navigation.filter(item =>
    profile?.role && item.roles.includes(profile.role)
  )

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Show refresh button when offline or when there are connection issues
  useEffect(() => {
    if (!isOnline || isRefreshing) {
      setShowRefreshButton(true)
    } else {
      setShowRefreshButton(false)
    }
  }, [isOnline, isRefreshing])

  const handleSignOut = async () => {
    await signOut()
  }

  const handleManualRefresh = async () => {
    try {
      await refreshSession()
    } catch (error) {
      console.error('Manual refresh failed:', error)
    }
  }

  return (
    <ActivityMonitor warningThreshold={25} sessionTimeout={30}>
      <div className="min-h-screen bg-gray-50">
        {/* Network Status Banner */}
        {!isOnline && (
          <div className="bg-red-600 text-white px-4 py-2 text-center text-sm">
            <div className="flex items-center justify-center">
              <WifiOff className="h-4 w-4 mr-2" />
              No internet connection - Some features may be limited
            </div>
          </div>
        )}

        {/* Session Refresh Banner */}
        {isRefreshing && (
          <div className="bg-blue-600 text-white px-4 py-2 text-center text-sm">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Refreshing your session for security...
            </div>
          </div>
        )}

        {/* Mobile header */}
        <div className="lg:hidden bg-white shadow-sm border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Glass Traceability</h1>
              {showRefreshButton && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleManualRefresh}
                  className="ml-2"
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Connection Status */}
              <div className={`flex items-center px-2 py-1 rounded-full text-xs ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                {isOnline ? 'Online' : 'Offline'}
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0">
            <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h1 className="text-xl font-semibold text-gray-900">Glass Traceability</h1>
              </div>
              
              {/* Connection Status in Sidebar */}
              <div className="px-4 mt-2">
                <div className={`flex items-center justify-center px-3 py-2 rounded-md text-sm ${
                  isOnline 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {isOnline ? (
                    <>
                      <Wifi className="h-4 w-4 mr-2" />
                      System Online
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 mr-2" />
                      Connection Lost
                    </>
                  )}
                </div>
              </div>
              
              <div className="mt-8 flex-grow flex flex-col">
                <nav className="flex-1 px-2 space-y-1">
                  {filteredNavigation.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname.startsWith(item.href)
                    
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          isActive
                            ? 'bg-blue-50 border-r-2 border-blue-500 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                          'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors'
                        )}
                      >
                        <Icon
                          className={cn(
                            isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500',
                            'mr-3 flex-shrink-0 h-5 w-5'
                          )}
                        />
                        {item.name}
                      </Link>
                    )
                  })}
                </nav>
                
                {/* System Status & User Info */}
                <div className="flex-shrink-0 px-2 pb-4 space-y-3">
                  {/* Refresh Button */}
                  {showRefreshButton && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={handleManualRefresh}
                      disabled={isRefreshing}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Refreshing...' : 'Refresh Session'}
                    </Button>
                  )}

                  {/* Session Status */}
                  {isRefreshing && (
                    <div className="px-2 py-2 text-xs text-blue-600 bg-blue-50 rounded-md">
                      <div className="flex items-center">
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Updating session...
                      </div>
                    </div>
                  )}

                  {/* User Info */}
                  <div className="flex items-center px-2 py-2 text-sm text-gray-600 border-t">
                    <Users className="mr-3 h-5 w-5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{profile?.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {profile?.role}
                        </Badge>
                        {!isOnline && (
                          <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                            Offline
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sign Out */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:pl-64 flex flex-col flex-1">
            <main className="flex-1">
              {children}
            </main>
          </div>
        </div>

        {/* Mobile bottom navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
          <nav className="flex justify-around py-2">
            {filteredNavigation.slice(0, 4).map((item) => {
              const Icon = item.icon
              const isActive = pathname.startsWith(item.href)
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center py-2 px-3 rounded-md transition-colors',
                    isActive
                      ? 'text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs mt-1">{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </ActivityMonitor>
  )
}