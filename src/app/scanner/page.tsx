// Quick fix: Create placeholder pages to prevent 404 errors
// src/app/scanner/page.tsx
'use client'

import { AuthGuard } from '@/components/AuthGuard'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ScannerPage() {
  return (
    <AuthGuard requiredRole="operator">
      <Layout>
        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Barcode Scanner</h1>
          <Card>
            <CardHeader>
              <CardTitle>Scanner Interface</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Scanner interface coming in Phase 2...</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </AuthGuard>
  )
}