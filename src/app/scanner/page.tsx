// src/app/scanner/page.tsx - Enhanced scanner interface with service authentication support
'use client'

import { useState, useEffect, useRef } from 'react'
import { AuthGuard } from '@/components/AuthGuard'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { createSupabaseClient } from '@/lib/supabase'
import { useServiceAuth } from '@/lib/service-auth'
import { 
  Scan, 
  Package, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Settings,
  Wifi,
  WifiOff,
  Clock,
  User,
  MapPin
} from 'lucide-react'

interface ScannedPiece {
  id: string
  barcode: string
  piece_number: number
  current_status: string
  label: string | null
  order_number: string
  client_name: string
  glass_type: string
  width_display: string
  height_display: string
  sq_ft: number
  last_updated: string
}

interface ScanResult {
  success: boolean
  piece?: ScannedPiece
  error?: string
  timestamp: string
}

// Configuration for different scanner modes
type ScannerMode = 'manual' | 'service'

export default function ScannerPage() {
  const { profile, updateActivity } = useAuth()
  const supabase = createSupabaseClient()
  
  // Scanner mode and configuration
  const [scannerMode, setScannerMode] = useState<ScannerMode>('manual')
  const [stationId, setStationId] = useState('')
  const [stationSecret, setStationSecret] = useState('')
  
  // Service authentication (only used in service mode)
  // Use empty values when in manual mode to prevent initialization
  const serviceAuth = useServiceAuth(
    scannerMode === 'service' ? stationId : '', 
    scannerMode === 'service' ? stationSecret : ''
  )
  
  // Scanner state
  const [barcode, setBarcode] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([])
  const [currentPiece, setCurrentPiece] = useState<ScannedPiece | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [autoSubmit, setAutoSubmit] = useState(false)
  
  // UI state
  const [showConfig, setShowConfig] = useState(false)
  const barcodeInputRef = useRef<HTMLInputElement>(null)

  // Available statuses based on mode
  const availableStatuses = scannerMode === 'service' 
    ? serviceAuth.availableStatuses 
    : [
        { value: 'pending', label: 'Pending', color: 'yellow' },
        { value: 'cutting', label: 'Cutting', color: 'blue' },
        { value: 'tempering', label: 'Tempering', color: 'orange' },
        { value: 'edge_work', label: 'Edge Work', color: 'purple' },
        { value: 'quality_check', label: 'Quality Check', color: 'indigo' },
        { value: 'completed', label: 'Completed', color: 'green' },
        { value: 'defective', label: 'Defective', color: 'red' }
      ]

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

  // Auto-focus barcode input
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus()
    }
  }, [currentPiece])

  // Load saved scanner configuration
  useEffect(() => {
    const savedMode = localStorage.getItem('scanner_mode') as ScannerMode
    const savedStationId = localStorage.getItem('station_id')
    const savedAutoSubmit = localStorage.getItem('auto_submit') === 'true'
    
    if (savedMode) setScannerMode(savedMode)
    if (savedStationId) setStationId(savedStationId)
    setAutoSubmit(savedAutoSubmit)
  }, [])

  // Save scanner configuration
  const saveConfiguration = () => {
    localStorage.setItem('scanner_mode', scannerMode)
    localStorage.setItem('station_id', stationId)
    localStorage.setItem('auto_submit', autoSubmit.toString())
    setShowConfig(false)
  }

  // Find piece by barcode
  const findPiece = async (barcodeValue: string): Promise<ScannedPiece | null> => {
    try {
      if (scannerMode === 'service' && serviceAuth.isAuthenticated) {
        // Use service authentication
        const result = await serviceAuth.getPieceInfo(barcodeValue)
        if (result.success && result.data) {
          const piece = result.data
          return {
            id: piece.id,
            barcode: piece.barcode,
            piece_number: piece.piece_number,
            current_status: piece.current_status,
            label: piece.label,
            order_number: piece.order_number,
            client_name: piece.orders?.clients?.name || 'Unknown Client',
            glass_type: piece.orders?.glass_types?.type_name || 'Unknown Glass',
            width_display: `${piece.width_inches}${piece.width_fraction !== '0' ? ` ${piece.width_fraction}` : ''}"`,
            height_display: `${piece.height_inches}${piece.height_fraction !== '0' ? ` ${piece.height_fraction}` : ''}"`,
            sq_ft: piece.sq_ft,
            last_updated: piece.updated_at
          }
        }
        return null
      } else {
        // Use regular authentication
        const { data, error } = await supabase
          .from('pieces')
          .select(`
            *,
            orders:order_number (
              order_number,
              clients:client_id (name),
              glass_types:glass_type_id (type_name, color, thickness)
            )
          `)
          .eq('barcode', barcodeValue)
          .single()

        if (error || !data) return null

        return {
          id: data.id,
          barcode: data.barcode,
          piece_number: data.piece_number,
          current_status: data.current_status,
          label: data.label,
          order_number: data.order_number,
          client_name: data.orders?.clients?.name || 'Unknown Client',
          glass_type: data.orders?.glass_types?.type_name || 'Unknown Glass',
          width_display: `${data.width_inches}${data.width_fraction !== '0' ? ` ${data.width_fraction}` : ''}"`,
          height_display: `${data.height_inches}${data.height_fraction !== '0' ? ` ${data.height_fraction}` : ''}"`,
          sq_ft: data.sq_ft,
          last_updated: data.updated_at
        }
      }
    } catch (error) {
      console.error('Error finding piece:', error)
      return null
    }
  }

  // Handle barcode scan
  const handleScan = async () => {
    if (!barcode.trim()) return

    setLoading(true)
    updateActivity()

    try {
      const piece = await findPiece(barcode.trim())
      
      if (piece) {
        setCurrentPiece(piece)
        
        // Auto-submit if enabled and status is selected
        if (autoSubmit && selectedStatus) {
          await handleStatusUpdate()
        }
        
        // Add to scan history
        const scanResult: ScanResult = {
          success: true,
          piece,
          timestamp: new Date().toISOString()
        }
        setScanHistory(prev => [scanResult, ...prev.slice(0, 9)]) // Keep last 10 scans
      } else {
        const errorResult: ScanResult = {
          success: false,
          error: 'Piece not found',
          timestamp: new Date().toISOString()
        }
        setScanHistory(prev => [errorResult, ...prev.slice(0, 9)])
        setCurrentPiece(null)
      }
    } catch (error) {
      console.error('Scan error:', error)
      const errorResult: ScanResult = {
        success: false,
        error: 'System error',
        timestamp: new Date().toISOString()
      }
      setScanHistory(prev => [errorResult, ...prev.slice(0, 9)])
    } finally {
      setLoading(false)
      setBarcode('')
    }
  }

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!currentPiece || !selectedStatus) return

    setLoading(true)
    updateActivity()

    try {
      let success = false
      let error = ''

      if (scannerMode === 'service' && serviceAuth.isAuthenticated) {
        // Use service authentication
        const result = await serviceAuth.updatePieceStatus(
          currentPiece.barcode,
          selectedStatus,
          notes || undefined
        )
        success = result.success
        error = result.error || ''
      } else {
        // Use regular authentication
        const { error: updateError } = await supabase
          .from('pieces')
          .update({
            current_status: selectedStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentPiece.id)

        if (!updateError) {
          // Log status change
          await supabase
            .from('status_history')
            .insert({
              piece_id: currentPiece.id,
              old_status: currentPiece.current_status,
              new_status: selectedStatus,
              changed_by: profile?.id || 'scanner',
              notes: notes || `Updated via scanner by ${profile?.name || 'Scanner User'}`
            })
          success = true
        } else {
          error = updateError.message
        }
      }

      if (success) {
        // Update current piece status
        setCurrentPiece(prev => prev ? { ...prev, current_status: selectedStatus } : null)
        
        // Add successful update to history
        const updateResult: ScanResult = {
          success: true,
          piece: { ...currentPiece, current_status: selectedStatus },
          timestamp: new Date().toISOString()
        }
        setScanHistory(prev => [updateResult, ...prev.slice(0, 9)])
        
        // Clear form
        setSelectedStatus('')
        setNotes('')
        setCurrentPiece(null)
      } else {
        const errorResult: ScanResult = {
          success: false,
          error: error || 'Update failed',
          timestamp: new Date().toISOString()
        }
        setScanHistory(prev => [errorResult, ...prev.slice(0, 9)])
      }
    } catch (error) {
      console.error('Status update error:', error)
      const errorResult: ScanResult = {
        success: false,
        error: 'System error during update',
        timestamp: new Date().toISOString()
      }
      setScanHistory(prev => [errorResult, ...prev.slice(0, 9)])
    } finally {
      setLoading(false)
    }
  }

  // Handle barcode input key press
  const handleBarcodeKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleScan()
    }
  }

  const getStatusColor = (status: string) => {
    const statusConfig = availableStatuses.find(s => s.value === status)
    return statusConfig?.color || 'gray'
  }

  // Show service auth loading state
  if (scannerMode === 'service' && serviceAuth.loading) {
    return (
      <AuthGuard requiredRole="operator">
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <Card className="max-w-md w-full mx-4">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Connecting to scanning station...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </Layout>
      </AuthGuard>
    )
  }

  // Show service auth error
  if (scannerMode === 'service' && serviceAuth.error) {
    return (
      <AuthGuard requiredRole="operator">
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <Card className="max-w-md w-full mx-4">
              <CardHeader>
                <CardTitle className="flex items-center text-red-600">
                  <AlertCircle className="h-6 w-6 mr-2" />
                  Scanner Authentication Failed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{serviceAuth.error}</p>
                <Button onClick={() => setScannerMode('manual')} className="w-full">
                  Switch to Manual Mode
                </Button>
              </CardContent>
            </Card>
          </div>
        </Layout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requiredRole="operator">
      <Layout>
        <div className="p-6 pb-20 lg:pb-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Scan className="h-8 w-8 mr-3 text-blue-600" />
                Barcode Scanner
              </h1>
              <div className="flex items-center gap-2">
                <div className={`flex items-center px-2 py-1 rounded-full text-xs ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                  {isOnline ? 'Online' : 'Offline'}
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowConfig(!showConfig)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Config
                </Button>
              </div>
            </div>

            {/* Status Bar */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                Mode: <Badge variant="outline" className="ml-1">
                  {scannerMode === 'service' ? 'Service Station' : 'Manual Scanner'}
                </Badge>
              </div>
              {scannerMode === 'service' && serviceAuth.sessionInfo && (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {serviceAuth.sessionInfo.station_name} - {serviceAuth.sessionInfo.location}
                </div>
              )}
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Configuration Panel */}
          {showConfig && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Scanner Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scanner Mode
                  </label>
                  <Select
                    value={scannerMode}
                    onChange={(e) => setScannerMode(e.target.value as ScannerMode)}
                  >
                    <option value="manual">Manual Scanner (User Authentication)</option>
                    <option value="service">Service Station (Station Authentication)</option>
                  </Select>
                </div>

                {scannerMode === 'service' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Station ID
                      </label>
                      <Input
                        value={stationId}
                        onChange={(e) => setStationId(e.target.value)}
                        placeholder="e.g., STATION_CUTTING_01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Station Secret
                      </label>
                      <Input
                        type="password"
                        value={stationSecret}
                        onChange={(e) => setStationSecret(e.target.value)}
                        placeholder="Station authentication secret"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoSubmit"
                    checked={autoSubmit}
                    onChange={(e) => setAutoSubmit(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="autoSubmit" className="text-sm text-gray-700">
                    Auto-submit status updates after scanning
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button onClick={saveConfiguration}>Save Configuration</Button>
                  <Button variant="outline" onClick={() => setShowConfig(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scanner Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Scan className="h-5 w-5 mr-2" />
                  Scan Barcode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Barcode
                  </label>
                  <div className="flex gap-2">
                    <Input
                      ref={barcodeInputRef}
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      onKeyPress={handleBarcodeKeyPress}
                      placeholder="Scan or enter barcode..."
                      className="font-mono"
                      disabled={loading}
                    />
                    <Button onClick={handleScan} disabled={loading || !barcode.trim()}>
                      {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {currentPiece && (
                  <>
                    <div className="border-t pt-4">
                      <h3 className="font-medium text-gray-900 mb-3">Piece Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Order:</span>
                          <span className="font-mono">{currentPiece.order_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Piece #:</span>
                          <span>{currentPiece.piece_number}</span>
                        </div>
                        {currentPiece.label && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Label:</span>
                            <Badge variant="outline">{currentPiece.label}</Badge>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Client:</span>
                          <span>{currentPiece.client_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Glass Type:</span>
                          <span>{currentPiece.glass_type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Dimensions:</span>
                          <span>{currentPiece.width_display} × {currentPiece.height_display}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Square Feet:</span>
                          <span>{currentPiece.sq_ft.toFixed(2)} sq ft</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Current Status:</span>
                          <Badge className={`bg-${getStatusColor(currentPiece.current_status)}-100 text-${getStatusColor(currentPiece.current_status)}-800`}>
                            {currentPiece.current_status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="font-medium text-gray-900 mb-3">Update Status</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Status
                          </label>
                          <Select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                          >
                            <option value="">Select new status...</option>
                            {availableStatuses.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </Select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes (Optional)
                          </label>
                          <Input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Additional notes..."
                          />
                        </div>

                        <Button 
                          onClick={handleStatusUpdate}
                          disabled={loading || !selectedStatus}
                          className="w-full"
                        >
                          {loading ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Update Status
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Scan History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Recent Scans
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scanHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Scan className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No scans yet</p>
                    <p className="text-sm">Scan a barcode to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {scanHistory.map((scan, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          scan.success 
                            ? 'border-green-200 bg-green-50' 
                            : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {scan.success && scan.piece ? (
                              <>
                                <div className="flex items-center gap-2 mb-1">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="font-mono text-sm">{scan.piece.barcode}</span>
                                  {scan.piece.label && (
                                    <Badge variant="outline" className="text-xs">
                                      {scan.piece.label}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {scan.piece.order_number} - Piece #{scan.piece.piece_number}
                                </div>
                                <div className="text-xs text-gray-600">
                                  Status: <span className="font-medium">{scan.piece.current_status.replace('_', ' ')}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 mb-1">
                                  <AlertCircle className="h-4 w-4 text-red-600" />
                                  <span className="text-red-700 font-medium">Scan Failed</span>
                                </div>
                                <div className="text-xs text-red-600">
                                  {scan.error}
                                </div>
                              </>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(scan.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Status Actions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {availableStatuses.map((status) => (
                  <Button
                    key={status.value}
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStatus(status.value)}
                    className={`${
                      selectedStatus === status.value 
                        ? `bg-${status.color}-100 border-${status.color}-300 text-${status.color}-800` 
                        : ''
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full bg-${status.color}-500 mr-2`}></div>
                    {status.label}
                  </Button>
                ))}
              </div>
              {currentPiece && selectedStatus && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm">
                    <strong>Ready to update:</strong> {currentPiece.barcode} → {availableStatuses.find(s => s.value === selectedStatus)?.label}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Station Info */}
          {scannerMode === 'service' && serviceAuth.sessionInfo && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Station Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Station:</span>
                    <div className="font-medium">{serviceAuth.sessionInfo.station_name}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Location:</span>
                    <div className="font-medium">{serviceAuth.sessionInfo.location}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Session Expires:</span>
                    <div className="font-medium">
                      {new Date(serviceAuth.sessionInfo.expires_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <strong>Permissions:</strong> {serviceAuth.sessionInfo.permissions.join(', ')}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </Layout>
    </AuthGuard>
  )
}