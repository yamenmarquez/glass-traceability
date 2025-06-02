// src/lib/service-auth.ts - Service authentication adapted for your existing schema (CLIENT-SIDE SAFE)
import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'

export interface ServiceSession {
  id: string
  station_id: string
  station_name: string
  location: string
  permissions: string[]
  created_at: string
  expires_at: string
  active: boolean
}

export interface WorkStation {
  id: string
  station_name: string
  location: string | null
  station_secret: string | null
  permissions: string[]
  active: boolean
  order_sequence: number
}

export class ServiceAuthClient {
  private supabase = createSupabaseClient() // Use regular client, not admin
  private sessionToken: string | null = null
  private sessionData: ServiceSession | null = null
  private refreshTimer: NodeJS.Timeout | null = null

  constructor(private stationId: string, private stationSecret: string) {}

  // Initialize service session for scanning station
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      // For service authentication, we'll need to create an API endpoint
      // that uses the admin client server-side. For now, we'll use a workaround
      // with RPC function that can validate station credentials
      
      const { data, error } = await this.supabase
        .rpc('authenticate_scanner_station', {
          station_id_param: this.stationId,
          station_secret_param: this.stationSecret
        })

      if (error) {
        console.error('Station authentication error:', error)
        return { success: false, error: 'Invalid station credentials or authentication failed' }
      }

      if (!data || !data.success) {
        return { success: false, error: data?.error || 'Authentication failed' }
      }

      // Create service session using the authenticated data
      const sessionExpiry = new Date()
      sessionExpiry.setHours(sessionExpiry.getHours() + 12) // 12 hour sessions

      const { data: sessionData, error: sessionError } = await this.supabase
        .from('service_sessions')
        .insert({
          station_id: this.stationId,
          station_name: data.station_name,
          location: data.location || data.station_name,
          permissions: data.permissions || ['scan', 'update_status'],
          expires_at: sessionExpiry.toISOString(),
          active: true
        })
        .select()
        .single()

      if (sessionError) {
        return { success: false, error: 'Failed to create service session' }
      }

      this.sessionData = sessionData
      this.sessionToken = `service_${sessionData.id}`
      
      // Set up automatic session refresh
      this.setupSessionRefresh()

      return { success: true }
    } catch (error) {
      console.error('Service auth initialization failed:', error)
      return { success: false, error: 'Authentication failed' }
    }
  }

  // Set up automatic session refresh (every 10 hours)
  private setupSessionRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }

    // Refresh session 2 hours before expiry
    const refreshTime = 10 * 60 * 60 * 1000 // 10 hours in milliseconds
    
    this.refreshTimer = setTimeout(async () => {
      await this.refreshSession()
    }, refreshTime)
  }

  // Refresh the service session
  private async refreshSession(): Promise<void> {
    if (!this.sessionData) return

    try {
      const sessionExpiry = new Date()
      sessionExpiry.setHours(sessionExpiry.getHours() + 12)

      const { error } = await this.supabase
        .from('service_sessions')
        .update({
          expires_at: sessionExpiry.toISOString(),
          last_activity: new Date().toISOString()
        })
        .eq('id', this.sessionData.id)

      if (!error) {
        console.log('Service session refreshed successfully')
        this.setupSessionRefresh() // Schedule next refresh
      } else {
        console.error('Failed to refresh service session:', error)
        // Try to re-initialize
        await this.initialize()
      }
    } catch (error) {
      console.error('Service session refresh error:', error)
    }
  }

  // Update piece status using your existing schema
  async updatePieceStatus(
    barcode: string, 
    newStatus: string, 
    notes?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.isValidSession()) {
      const initResult = await this.initialize()
      if (!initResult.success) {
        return { success: false, error: initResult.error }
      }
    }

    try {
      // Use the database function to update piece status
      const { data, error } = await this.supabase
        .rpc('update_piece_status_via_scanner', {
          piece_barcode: barcode,
          new_status: newStatus,
          station_id_param: this.sessionData?.station_id,
          employee_name: `Scanner: ${this.sessionData?.station_name}`,
          notes: notes || `Updated to ${newStatus} via scanner`
        })

      if (error) {
        return { success: false, error: error.message }
      }

      // Parse the JSON result from the function
      const result = typeof data === 'string' ? JSON.parse(data) : data

      if (!result.success) {
        return { success: false, error: result.error }
      }

      // Update last activity
      if (this.sessionData) {
        await this.supabase
          .from('service_sessions')
          .update({ last_activity: new Date().toISOString() })
          .eq('id', this.sessionData.id)
      }

      return { success: true, data: result.piece }
    } catch (error) {
      console.error('Update piece status error:', error)
      return { success: false, error: 'System error occurred' }
    }
  }

  // Get piece information by barcode (adapted for your schema)
  async getPieceInfo(barcode: string): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.isValidSession()) {
      const initResult = await this.initialize()
      if (!initResult.success) {
        return { success: false, error: initResult.error }
      }
    }

    try {
      const { data: piece, error } = await this.supabase
        .from('pieces')
        .select(`
          *,
          orders:order_number (
            id,
            order_number,
            client_id,
            clients:client_id (name),
            glass_types:glass_type_id (type_name, color, thickness)
          )
        `)
        .eq('barcode', barcode)
        .single()

      if (error || !piece) {
        return { success: false, error: 'Piece not found' }
      }

      return { success: true, data: piece }
    } catch (error) {
      console.error('Get piece info error:', error)
      return { success: false, error: 'System error occurred' }
    }
  }

  // Get available work stations
  async getWorkStations(): Promise<{ success: boolean; data?: WorkStation[]; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('work_stations')
        .select('*')
        .eq('active', true)
        .order('order_sequence')

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Get work stations error:', error)
      return { success: false, error: 'System error occurred' }
    }
  }

  // Check if current session is valid
  private isValidSession(): boolean {
    if (!this.sessionData || !this.sessionToken) {
      return false
    }

    const now = new Date()
    const expiresAt = new Date(this.sessionData.expires_at)
    
    return now < expiresAt && this.sessionData.active
  }

  // Get current session info
  getSessionInfo(): ServiceSession | null {
    return this.sessionData
  }

  // Cleanup on logout/shutdown
  async cleanup(): Promise<void> {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }

    if (this.sessionData) {
      try {
        await this.supabase
          .from('service_sessions')
          .update({ active: false })
          .eq('id', this.sessionData.id)
      } catch (error) {
        console.error('Error during cleanup:', error)
      }
    }

    this.sessionToken = null
    this.sessionData = null
  }

  // Get available status options for scanning stations
  static getAvailableStatuses(): Array<{ value: string; label: string; color: string }> {
    return [
      { value: 'pending', label: 'Pending', color: 'yellow' },
      { value: 'cutting', label: 'Cutting', color: 'blue' },
      { value: 'tempering', label: 'Tempering', color: 'orange' },
      { value: 'edge_work', label: 'Edge Work', color: 'purple' },
      { value: 'quality_check', label: 'Quality Check', color: 'indigo' },
      { value: 'completed', label: 'Completed', color: 'green' },
      { value: 'defective', label: 'Defective', color: 'red' }
    ]
  }
}

// Hook for using service authentication in React components
export function useServiceAuth(stationId: string, stationSecret: string) {
  const [client, setClient] = useState<ServiceAuthClient | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false) // Start as false, only load when needed
  const [error, setError] = useState<string | null>(null)

  // Only create client when we have valid credentials
  useEffect(() => {
    if (stationId && stationSecret) {
      const newClient = new ServiceAuthClient(stationId, stationSecret)
      setClient(newClient)
    } else {
      setClient(null)
      setIsAuthenticated(false)
      setLoading(false)
      setError(null)
    }
  }, [stationId, stationSecret])

  useEffect(() => {
    if (!client) return

    const initialize = async () => {
      setLoading(true)
      setError(null)
      
      const result = await client.initialize()
      
      if (result.success) {
        setIsAuthenticated(true)
        setError(null)
      } else {
        setIsAuthenticated(false)
        setError(result.error || 'Authentication failed')
      }
      
      setLoading(false)
    }

    initialize()

    return () => {
      if (client) {
        client.cleanup()
      }
    }
  }, [client])

  const updatePieceStatus = async (barcode: string, status: string, notes?: string) => {
    if (!client) return { success: false, error: 'No client available' }
    return await client.updatePieceStatus(barcode, status, notes)
  }

  const getPieceInfo = async (barcode: string) => {
    if (!client) return { success: false, error: 'No client available' }
    return await client.getPieceInfo(barcode)
  }

  const getWorkStations = async () => {
    if (!client) return { success: false, error: 'No client available' }
    return await client.getWorkStations()
  }

  return {
    isAuthenticated,
    loading,
    error,
    updatePieceStatus,
    getPieceInfo,
    getWorkStations,
    sessionInfo: client?.getSessionInfo() || null,
    availableStatuses: ServiceAuthClient.getAvailableStatuses()
  }
}