// src/app/orders/[id]/page.tsx - Order Details with Pieces (Updated with label field)
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AuthGuard } from '@/components/AuthGuard'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createSupabaseClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { 
  ArrowLeft, 
  Package, 
  User, 
  Calendar, 
  BarChart3,
  Edit,
  QrCode,
  Printer
} from 'lucide-react'
import Link from 'next/link'

interface OrderWithDetails {
  id: string
  order_number: string
  client_id: string
  client_po: string | null
  barcode: string | null
  glass_type_id: string
  total_pieces: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  remarks: string | null
  created_at: string
  updated_at: string
  // Joined data
  clients: {
    name: string
    contact_person: string | null
    email: string | null
    phone: string | null
    address: string | null
  }
  glass_types: {
    type_name: string
    description: string | null
    thickness: number | null
    color: string | null
  }
}

interface Piece {
  id: string
  order_number: string
  piece_number: number
  width_inches: number
  width_fraction: string
  height_inches: number
  height_fraction: string
  sq_ft: number
  holes_count: number
  barcode: string
  current_status: string
  label: string | null
  remarks: string | null
  location: string | null
  created_at: string
  updated_at: string
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
}

export default function OrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const supabase = createSupabaseClient()

  const [order, setOrder] = useState<OrderWithDetails | null>(null)
  const [pieces, setPieces] = useState<Piece[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const orderId = params.id as string

  // Load order and pieces
  useEffect(() => {
    const loadOrderDetails = async () => {
      try {
        setLoading(true)

        // Load order details
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select(`
            *,
            clients:client_id (name, contact_person, email, phone, address),
            glass_types:glass_type_id (type_name, description, thickness, color)
          `)
          .eq('id', orderId)
          .single()

        if (orderError) throw orderError
        if (!orderData) throw new Error('Order not found')

        setOrder(orderData)

        // Load pieces for this order
        const { data: piecesData, error: piecesError } = await supabase
          .from('pieces')
          .select('*')
          .eq('order_number', orderData.order_number)
          .order('piece_number')

        if (piecesError) throw piecesError

        setPieces(piecesData || [])
      } catch (error: any) {
        console.error('Error loading order details:', error)
        setError(error.message || 'Failed to load order details')
      } finally {
        setLoading(false)
      }
    }

    if (orderId) {
      loadOrderDetails()
    }
  }, [orderId, supabase])

  // Calculate totals
  const totalSquareFeet = pieces.reduce((total, piece) => total + piece.sq_ft, 0)
  const piecesByStatus = pieces.reduce((acc, piece) => {
    acc[piece.current_status] = (acc[piece.current_status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Generate QR code data (for barcode)
  const generateQRCodeData = (barcode: string) => {
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50">
        <rect width="200" height="50" fill="white"/>
        <text x="100" y="30" text-anchor="middle" font-family="monospace" font-size="12" fill="black">
          ${barcode}
        </text>
      </svg>
    `)}`
  }

  if (loading) {
    return (
      <AuthGuard>
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading order details...</p>
            </div>
          </div>
        </Layout>
      </AuthGuard>
    )
  }

  if (error || !order) {
    return (
      <AuthGuard>
        <Layout>
          <div className="p-6">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h2>
              <p className="text-gray-600 mb-4">{error || 'The requested order could not be found.'}</p>
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
    <AuthGuard>
      <Layout>
        <div className="p-6 pb-20 lg:pb-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/orders">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Orders
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">{order.order_number}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <Badge className={statusColors[order.status]}>
                    {order.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Badge className={priorityColors[order.priority]} variant="outline">
                    {order.priority.toUpperCase()} PRIORITY
                  </Badge>
                </div>
              </div>
              {(profile?.role === 'admin' || profile?.role === 'operator') && (
                <Link href={`/orders/${order.id}/edit`}>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Order
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Order Number</label>
                      <div className="text-lg font-mono">{order.order_number}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Client PO</label>
                      <div>{order.client_po || 'Not specified'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Created</label>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {new Date(order.created_at).toLocaleDateString()} at{' '}
                        {new Date(order.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Last Updated</label>
                      <div>{new Date(order.updated_at).toLocaleDateString()}</div>
                    </div>
                  </div>

                  {order.barcode && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Order Barcode</label>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="font-mono text-sm bg-gray-100 px-3 py-2 rounded">
                          {order.barcode}
                        </div>
                        <Button variant="outline" size="sm">
                          <QrCode className="h-4 w-4 mr-2" />
                          Show QR
                        </Button>
                        <Button variant="outline" size="sm">
                          <Printer className="h-4 w-4 mr-2" />
                          Print
                        </Button>
                      </div>
                    </div>
                  )}

                  {order.remarks && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Remarks</label>
                      <div className="bg-gray-50 p-3 rounded-md text-sm">{order.remarks}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Client Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Client Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="font-semibold text-lg">{order.clients.name}</div>
                      {order.clients.contact_person && (
                        <div className="text-gray-600">Contact: {order.clients.contact_person}</div>
                      )}
                    </div>
                    {order.clients.email && (
                      <div className="text-sm">
                        <span className="font-medium">Email:</span> {order.clients.email}
                      </div>
                    )}
                    {order.clients.phone && (
                      <div className="text-sm">
                        <span className="font-medium">Phone:</span> {order.clients.phone}
                      </div>
                    )}
                    {order.clients.address && (
                      <div className="text-sm">
                        <span className="font-medium">Address:</span> {order.clients.address}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Glass Type */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Glass Specification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="font-semibold text-lg">{order.glass_types.type_name}</div>
                    {order.glass_types.description && (
                      <div className="text-gray-600">{order.glass_types.description}</div>
                    )}
                    <div className="flex gap-4 text-sm">
                      {order.glass_types.thickness && (
                        <span><strong>Thickness:</strong> {order.glass_types.thickness}"</span>
                      )}
                      {order.glass_types.color && (
                        <span><strong>Color:</strong> {order.glass_types.color}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary & Stats */}
            <div className="space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{order.total_pieces}</div>
                    <div className="text-sm text-gray-600">Total Pieces</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{totalSquareFeet.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">Square Feet</div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Pieces by Status:</div>
                    {Object.entries(piecesByStatus).map(([status, count]) => (
                      <div key={status} className="flex justify-between text-sm">
                        <span className="capitalize">{status.replace('_', ' ')}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Pieces List - UPDATED WITH LABEL FIELD */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Pieces ({pieces.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {pieces.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No pieces found for this order.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Piece #</th>
                        <th className="text-left py-3 px-2">Label/Mark</th>
                        <th className="text-left py-3 px-2">Dimensions</th>
                        <th className="text-left py-3 px-2">Sq Ft</th>
                        <th className="text-left py-3 px-2">Holes</th>
                        <th className="text-left py-3 px-2">Status</th>
                        <th className="text-left py-3 px-2">Barcode</th>
                        <th className="text-left py-3 px-2">Remarks</th>
                        <th className="text-left py-3 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pieces.map((piece) => (
                        <tr key={piece.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2 font-medium">#{piece.piece_number}</td>
                          <td className="py-3 px-2">
                            {piece.label ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {piece.label}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">No label</span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <div className="font-mono text-sm">
                              {piece.width_inches}{piece.width_fraction !== '0' && ` ${piece.width_fraction}`}" × {' '}
                              {piece.height_inches}{piece.height_fraction !== '0' && ` ${piece.height_fraction}`}"
                            </div>
                          </td>
                          <td className="py-3 px-2 font-medium">{piece.sq_ft.toFixed(2)}</td>
                          <td className="py-3 px-2">{piece.holes_count}</td>
                          <td className="py-3 px-2">
                            <Badge variant="outline" className="text-xs">
                              {piece.current_status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                              {piece.barcode}
                            </code>
                          </td>
                          <td className="py-3 px-2 max-w-32">
                            {piece.remarks ? (
                              <span className="text-xs text-gray-600 truncate block" title={piece.remarks}>
                                {piece.remarks}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex gap-1">
                              <Button variant="outline" size="sm" title="Show QR Code">
                                <QrCode className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm" title="Print Label">
                                <Printer className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    </AuthGuard>
  )
}