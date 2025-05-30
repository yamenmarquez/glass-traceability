// src/app/dashboard/page.tsx
'use client'

import { AuthGuard } from '@/components/AuthGuard'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { 
  Package, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Users,
  BarChart3
} from 'lucide-react'

export default function DashboardPage() {
  const { profile } = useAuth()

  return (
    <AuthGuard>
      <Layout>
        <div className="p-6 pb-20 lg:pb-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {profile?.name}
            </h1>
            <p className="text-gray-600 mt-2">
              Here's an overview of your glass manufacturing operations
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
                <p className="text-xs text-muted-foreground">
                  +2 from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">
                  4 in cutting, 4 in tempering
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">
                  +6 from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Urgent Orders</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">
                  Requires immediate attention
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Order #GLS-2025-001</p>
                      <p className="text-sm text-gray-600">ABC Construction</p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      In Progress
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Order #GLS-2025-002</p>
                      <p className="text-sm text-gray-600">XYZ Windows</p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Completed
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Order #GLS-2025-003</p>
                      <p className="text-sm text-gray-600">ABC Construction</p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Urgent
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <Package className="h-8 w-8 text-blue-600 mb-2" />
                    <p className="font-medium">New Order</p>
                    <p className="text-sm text-gray-600">Create new glass order</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <BarChart3 className="h-8 w-8 text-green-600 mb-2" />
                    <p className="font-medium">Scanner</p>
                    <p className="text-sm text-gray-600">Update piece status</p>
                  </div>
                  {profile?.role === 'admin' && (
                    <>
                      <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <Users className="h-8 w-8 text-purple-600 mb-2" />
                        <p className="font-medium">User Management</p>
                        <p className="text-sm text-gray-600">Manage system users</p>
                      </div>
                      <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <BarChart3 className="h-8 w-8 text-orange-600 mb-2" />
                        <p className="font-medium">Reports</p>
                        <p className="text-sm text-gray-600">View analytics</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  )
}