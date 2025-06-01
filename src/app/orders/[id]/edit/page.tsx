// src/app/orders/[id]/edit/page.tsx - Edit Order Form
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AuthGuard } from '@/components/AuthGuard'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { createSupabaseClient } from '@/lib/supabase'
import { ArrowLeft, Save, Trash2, Plus } from 'lucide-react'
import Link from 'next/link'

interface Client {
  id: string
  name: string
  contact_person: string | null
  email: string | null
  phone: string | null
}

interface GlassType {
  id: string
  type_name: string
  description: string | null
  thickness: number | null
  color: string | null
}

interface OrderData {
  id: string
  order_number: string
  client_id: string
  client_po: string | null
  glass_type_id: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  remarks: string | null
}

interface Piece {
  id: string
  piece_number: number
  width_inches: number
  width_fraction: string
  height_inches: number
  height_fraction: string
  holes_count: number
  remarks: string | null
  barcode: string
}

const fractionOptions = [
  { value: '0', label: '0' },
  { value: '1/8', label: '1/8' },
  { value: '1/4', label: '1/4' },
  { value: '3/8', label: '3/8' },
  { value: '1/2', label: '1/2' },
  { value: '5/8', label: '5/8' },
  { value: '3/4', label: '3/4' },
  { value: '7/8', label: '7/8' },
]

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export default function EditOrderPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const orderId = params.id as string

  // Form state
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [clientId, setClientId] = useState('')
  const [clientPo, setClientPo] = useState('')
  const [glassTypeId, setGlassTypeId] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [remarks, setRemarks] = useState('')
  const [pieces, setPieces] = useState<Piece[]>([])

  // Data state
  const [clients, setClients] = useState<Client[]>([])
  const [glassTypes, setGlassTypes] = useState<GlassType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load order data and related info
  useEffect(() => {
    const loadOrderData = async () => {
      try {
        setLoading(true)

        // Load order details
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()

        if (orderError) throw orderError
        if (!order) throw new Error('Order not found')

        // Load pieces
        const { data: piecesData, error: piecesError } = await supabase
          .from('pieces')
          .select('*')
          .eq('order_number', order.order_number)
          .order('piece_number')

        if (piecesError) throw piecesError

        // Load clients and glass types
        const [clientsResponse, glassTypesResponse] = await Promise.all([
          supabase.from('clients').select('*').eq('active', true).order('name'),
          supabase.from('glass_types').select('*').eq('active', true).order('type_name')
        ])

        if (clientsResponse.error) throw clientsResponse.error
        if (glassTypesResponse.error) throw glassTypesResponse.error

        // Set form data
        setOrderData(order)
        setClientId(order.client_id)
        setClientPo(order.client_po || '')
        setGlassTypeId(order.glass_type_id)
        setPriority(order.priority)
        setRemarks(order.remarks || '')
        setPieces(piecesData || [])
        setClients(clientsResponse.data || [])
        setGlassTypes(glassTypesResponse.data || [])

      } catch (error: any) {
        console.error('Error loading order data:', error)
        setError(error.message || 'Failed to load order data')
      } finally {
        setLoading(false)
      }
    }

    if (orderId) {
      loadOrderData()
    }
  }, [orderId, supabase])

  // Calculate square footage for a piece
  const calculateSquareFeet = (piece: Piece) => {
    const widthDecimal = piece.width_inches + (piece.width_fraction === '0' ? 0 : 
      piece.width_fraction === '1/8' ? 0.125 :
      piece.width_fraction === '1/4' ? 0.25 :
      piece.width_fraction === '3/8' ? 0.375 :
      piece.width_fraction === '1/2' ? 0.5 :
      piece.width_fraction === '5/8' ? 0.625 :
      piece.width_fraction === '3/4' ? 0.75 :
      piece.width_fraction === '7/8' ? 0.875 : 0)

    const heightDecimal = piece.height_inches + (piece.height_fraction === '0' ? 0 : 
      piece.height_fraction === '1/8' ? 0.125 :
      piece.height_fraction === '1/4' ? 0.25 :
      piece.height_fraction === '3/8' ? 0.375 :
      piece.height_fraction === '1/2' ? 0.5 :
      piece.height_fraction === '5/8' ? 0.625 :
      piece.height_fraction === '3/4' ? 0.75 :
      piece.height_fraction === '7/8' ? 0.875 : 0)

    return (widthDecimal * heightDecimal) / 144
  }

  // Update piece
  const updatePiece = (index: number, field: keyof Piece, value: string | number) => {
    const newPieces = [...pieces]
    newPieces[index] = { ...newPieces[index], [field]: value }
    setPieces(newPieces)
  }

  // Add new piece
  const addPiece = () => {
    if (!orderData) return
    
    const newPieceNumber = pieces.length + 1
    const newBarcode = `${orderData.order_number}-P${String(newPieceNumber).padStart(3, '0')}`
    
    setPieces([...pieces, {
      id: '', // New piece, will get ID on save
      piece_number: newPieceNumber,
      width_inches: 0,
      width_fraction: '0',
      height_inches: 0,
      height_fraction: '0',
      holes_count: 0,
      remarks: '',
      barcode: newBarcode
    }])
  }

  // Remove piece
  const removePiece = async (index: number) => {
    const piece = pieces[index]
    
    // If piece has an ID, delete from database
    if (piece.id) {
      try {
        const { error } = await supabase
          .from('pieces')
          .delete()
          .eq('id', piece.id)

        if (error) throw error
      } catch (error: any) {
        console.error('Error deleting piece:', error)
        setError('Failed to delete piece')
        return
      }
    }

    // Remove from local state and renumber
    const newPieces = pieces.filter((_, i) => i !== index)
    const renumberedPieces = newPieces.map((piece, i) => ({
      ...piece,
      piece_number: i + 1,
      barcode: `${orderData?.order_number}-P${String(i + 1).padStart(3, '0')}`
    }))
    setPieces(renumberedPieces)
  }

  // Save order changes
  const handleSave = async () => {
    if (!orderData) return
    
    setSaving(true)
    setError('')

    try {
      // Validation
      if (!clientId || !glassTypeId) {
        throw new Error('Please select a client and glass type')
      }

      // Update order
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          client_id: clientId,
          client_po: clientPo || null,
          glass_type_id: glassTypeId,
          priority,
          remarks: remarks || null,
          total_pieces: pieces.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (orderError) throw orderError

      // Update/create pieces
      for (const piece of pieces) {
        const pieceData = {
          order_number: orderData.order_number,
          piece_number: piece.piece_number,
          width_inches: piece.width_inches,
          width_fraction: piece.width_fraction,
          height_inches: piece.height_inches,
          height_fraction: piece.height_fraction,
          holes_count: piece.holes_count,
          barcode: piece.barcode,
          remarks: piece.remarks || null,
          updated_at: new Date().toISOString()
        }

        if (piece.id) {
          // Update existing piece
          const { error } = await supabase
            .from('pieces')
            .update(pieceData)
            .eq('id', piece.id)

          if (error) throw error
        } else {
          // Create new piece
          const { error } = await supabase
            .from('pieces')
            .insert({
              ...pieceData,
              current_status: 'pending'
            })

          if (error) throw error
        }
      }

      // Success! Redirect back to order details
      router.push(`/orders/${orderId}`)

    } catch (error: any) {
      console.error('Error saving order:', error)
      setError(error.message || 'Failed to save order')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AuthGuard requiredRole="operator">
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading order...</p>
            </div>
          </div>
        </Layout>
      </AuthGuard>
    )
  }

  if (error && !orderData) {
    return (
      <AuthGuard requiredRole="operator">
        <Layout>
          <div className="p-6">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Order</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Link href="/orders">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Orders
                </Button>
              </Link>
            </div>
          </div>
        </Layout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requiredRole="operator">
      <Layout>
        <div className="p-6 pb-20 lg:pb-6">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href={`/orders/${orderId}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Order
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">
                Edit Order {orderData?.order_number}
              </h1>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Order Details */}
            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Order Number
                    </label>
                    <Input
                      value={orderData?.order_number || ''}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client *
                    </label>
                    <Select
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      required
                    >
                      <option value="">Select a client...</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name} {client.contact_person && `(${client.contact_person})`}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client PO Number
                    </label>
                    <Input
                      value={clientPo}
                      onChange={(e) => setClientPo(e.target.value)}
                      placeholder="Client's purchase order number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Glass Type *
                    </label>
                    <Select
                      value={glassTypeId}
                      onChange={(e) => setGlassTypeId(e.target.value)}
                      required
                    >
                      <option value="">Select glass type...</option>
                      {glassTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.type_name} - {type.thickness}" {type.color}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <Select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                    >
                      {priorityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order Remarks
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Additional notes about this order..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pieces */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Pieces ({pieces.length})</CardTitle>
                  <Button type="button" onClick={addPiece} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Piece
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pieces.map((piece, index) => (
                    <div key={`${piece.id || index}`} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">
                          Piece #{piece.piece_number}
                          <span className="ml-2 text-xs text-gray-500 font-mono">
                            {piece.barcode}
                          </span>
                        </h4>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removePiece(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Width (inches)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            value={piece.width_inches || ''}
                            onChange={(e) => updatePiece(index, 'width_inches', parseInt(e.target.value) || 0)}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Width Fraction
                          </label>
                          <Select
                            value={piece.width_fraction}
                            onChange={(e) => updatePiece(index, 'width_fraction', e.target.value)}
                          >
                            {fractionOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Height (inches)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            value={piece.height_inches || ''}
                            onChange={(e) => updatePiece(index, 'height_inches', parseInt(e.target.value) || 0)}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Height Fraction
                          </label>
                          <Select
                            value={piece.height_fraction}
                            onChange={(e) => updatePiece(index, 'height_fraction', e.target.value)}
                          >
                            {fractionOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Holes
                          </label>
                          <Input
                            type="number"
                            min="0"
                            value={piece.holes_count || ''}
                            onChange={(e) => updatePiece(index, 'holes_count', parseInt(e.target.value) || 0)}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Sq. Ft.
                          </label>
                          <div className="h-10 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md flex items-center text-sm">
                            {calculateSquareFeet(piece).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Piece Remarks
                        </label>
                        <Input
                          value={piece.remarks || ''}
                          onChange={(e) => updatePiece(index, 'remarks', e.target.value)}
                          placeholder="Notes about this piece..."
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {pieces.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm font-medium text-blue-900">
                      Total Square Footage: {pieces.reduce((total, piece) => total + calculateSquareFeet(piece), 0).toFixed(2)} sq ft
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Save Actions */}
            <div className="flex gap-4">
              <Button onClick={handleSave} disabled={saving} className="min-w-32">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Link href={`/orders/${orderId}`}>
                <Button variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  )
}