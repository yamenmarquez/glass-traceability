// src/app/reports/page.tsx
'use client'

import { AuthGuard } from '@/components/AuthGuard'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ReportsPage() {
  return (
    <AuthGuard>
      <Layout>
        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Reports</h1>
          <Card>
            <CardHeader>
              <CardTitle>Analytics & Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Reports and analytics coming in Phase 2...</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </AuthGuard>
  )
}