// src/app/orders/new/page.tsx - Complete updated file with label field and natural dimension input
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthGuard } from '@/components/AuthGuard'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DimensionInput } from '@/components/ui/dimension-input'
import { createSupabaseClient } from '@/lib/supabase'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
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

interface Piece {
  piece_number: number
  width_inches: number
  width_fraction: string
  height_inches: number
  height_fraction: string
  holes_count: number
  label: string
  remarks: string
}

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

// Enhanced fraction to decimal conversion
const fractionToDecimal = (fraction: string): number => {
  const fractionMap: Record<string, number> = {
    '0': 0,
    '1/16': 0.0625,
    '1/8': 0.125,
    '3/16': 0.1875,
    '1/4': 0.25,
    '5/16': 0.3125,
    '3/8': 0.375,
    '7/16': 0.4375,
    '1/2': 0.5,
    '9/16': 0.5625,
    '5/8': 0.625,
    '11/16': 0.6875,
    '3/4': 0.75,
    '13/16': 0.8125,
    '7/8': 0.875,
    '15/16': 0.9375
  }
  return fractionMap[fraction] || 0
}

export default function NewOrderPage() {
  const router = useRouter()
  const supabase = createSupabaseClient()

  // Form state
  const [clientId, setClientId] = useState('')
  const [clientPo, setClientPo] = useState('')
  const [glassTypeId, setGlassTypeId] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [remarks, setRemarks] = useState('')
  const [pieces, setPieces] = useState<Piece[]>([
    {
      piece_number: 1,
      width_inches: 0,
      width_fraction: '0',
      height_inches: 0,
      height_fraction: '0',
      holes_count: 0,
      label: '',
      remarks: ''
    }
  ])

  // Data state
  const [clients, setClients] = useState<Client[]>([])
  const [glassTypes, setGlassTypes] = useState<GlassType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load clients and glass types
  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientsResponse, glassTypesResponse] = await Promise.all([
          supabase.from('clients').select('*').eq('active', true).order('name'),
          supabase.from('glass_types').select('*').eq('active', true).order('type_name')
        ])

        if (clientsResponse.error) throw clientsResponse.error
        if (glassTypesResponse.error) throw glassTypesResponse.error

        setClients(clientsResponse.data || [])
        setGlassTypes(glassTypesResponse.data || [])
      } catch (error) {
        console.error('Error loading data:', error)
        setError('Failed to load clients and glass types')
      }
    }

    loadData()
  }, [supabase])

  // Generate order number
  const generateOrderNumber = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const time = String(now.getTime()).slice(-6)
    return `GLS-${year}${month}${day}-${time}`
  }

  // Generate barcode for pieces
  const generatePieceBarcode = (orderNumber: string, pieceNumber: number) => {
    return `${orderNumber}-P${String(pieceNumber).padStart(3, '0')}`
  }

  // Calculate square footage for a piece
  const calculateSquareFeet = (piece: Piece) => {
    const widthDecimal = piece.width_inches + fractionToDecimal(piece.width_fraction)
    const heightDecimal = piece.height_inches + fractionToDecimal(piece.height_fraction)
    return (widthDecimal * heightDecimal) / 144
  }

  // Add new piece
  const addPiece = () => {
    const newPieceNumber = pieces.length + 1
    setPieces([...pieces, {
      piece_number: newPieceNumber,
      width_inches: 0,
      width_fraction: '0',
      height_inches: 0,
      height_fraction: '0',
      holes_count: 0,
      label: '',
      remarks: ''
    }])
  }

  // Remove piece
  const removePiece = (index: number) => {
    if (pieces.length > 1) {
      const newPieces = pieces.filter((_, i) => i !== index)
      const renumberedPieces = newPieces.map((piece, i) => ({
        ...piece,
        piece_number: i + 1
      }))
      setPieces(renumberedPieces)
    }
  }

  // Update piece
  const updatePiece = (index: number, field: keyof Piece, value: string | number) => {
    const newPieces = [...pieces]
    newPieces[index] = { ...newPieces[index], [field]: value }
    setPieces(newPieces)
  }

  // Update piece dimensions
  const updatePieceDimension = (index: number, field: 'width' | 'height', dimension: { inches: number; fraction: string }) => {
    const newPieces = [...pieces]
    if (field === 'width') {
      newPieces[index] = { 
        ...newPieces[index], 
        width_inches: dimension.inches,
        width_fraction: dimension.fraction
      }
    } else {
      newPieces[index] = { 
        ...newPieces[index], 
        height_inches: dimension.inches,
        height_fraction: dimension.fraction
      }
    }
    setPieces(newPieces)
  }

  // Submit order
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validation
      if (!clientId || !glassTypeId) {
        throw new Error('Please select a client and glass type')
      }

      if (pieces.some(piece => piece.width_inches <= 0 || piece.height_inches <= 0)) {
        throw new Error('All pieces must have valid dimensions')
      }

      const orderNumber = generateOrderNumber()

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          client_id: clientId,
          client_po: clientPo || null,
          glass_type_id: glassTypeId,
          total_pieces: pieces.length,
          priority,
          status: 'pending',
          remarks: remarks || null,
          barcode: orderNumber
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create pieces
      const piecesData = pieces.map(piece => ({
        order_number: orderNumber,
        piece_number: piece.piece_number,
        width_inches: piece.width_inches,
        width_fraction: piece.width_fraction,
        height_inches: piece.height_inches,
        height_fraction: piece.height_fraction,
        holes_count: piece.holes_count,
        label: piece.label || null,
        barcode: generatePieceBarcode(orderNumber, piece.piece_number),
        current_status: 'pending',
        remarks: piece.remarks || null
      }))

      const { error: piecesError } = await supabase
        .from('pieces')
        .insert(piecesData)

      if (piecesError) throw piecesError

      // Success! Redirect to orders list
      router.push('/orders')
    } catch (error: any) {
      console.error('Error creating order:', error)
      setError(error.message || 'Failed to create order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthGuard requiredRole="operator">
      <Layout>
        <div className="p-6 pb-20 lg:pb-6">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/orders">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Orders
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Create New Order</h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            {/* Order Details */}
            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">Piece #{piece.piece_number}</h4>
                        {pieces.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removePiece(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <DimensionInput
                          label="Width"
                          value={{ inches: piece.width_inches, fraction: piece.width_fraction }}
                          onChange={(value) => updatePieceDimension(index, 'width', value)}
                          placeholder="e.g., 80 1/16"
                        />

                        <DimensionInput
                          label="Height"
                          value={{ inches: piece.height_inches, fraction: piece.height_fraction }}
                          onChange={(value) => updatePieceDimension(index, 'height', value)}
                          placeholder="e.g., 60 3/4"
                        />

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Holes
                          </label>
                          <Input
                            type="number"
                            min="0"
                            value={piece.holes_count || ''}
                            onChange={(e) => updatePiece(index, 'holes_count', parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Label/Mark
                          </label>
                          <Input
                            value={piece.label}
                            onChange={(e) => updatePiece(index, 'label', e.target.value)}
                            placeholder="e.g., A1, B2, Window-1"
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            Installation identifier
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sq. Ft.
                          </label>
                          <div className="h-10 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md flex items-center text-sm font-medium">
                            {calculateSquareFeet(piece).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Piece Remarks
                        </label>
                        <Input
                          value={piece.remarks}
                          onChange={(e) => updatePiece(index, 'remarks', e.target.value)}
                          placeholder="Notes about this piece..."
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">
                    Total Square Footage: {pieces.reduce((total, piece) => total + calculateSquareFeet(piece), 0).toFixed(2)} sq ft
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="min-w-32">
                {loading ? 'Creating...' : 'Create Order'}
              </Button>
              <Link href="/orders">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </Layout>
    </AuthGuard>
  )
}