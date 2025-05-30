'use client'

import { createSupabaseClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function TestConnection() {
  const [status, setStatus] = useState('Testing...')
  
  useEffect(() => {
    async function testConnection() {
      try {
        const supabase = createSupabaseClient()
        
        // Test basic connection
        const { data, error } = await supabase
          .from('profiles')
          .select('count')
          .limit(1)
        
        if (error) {
          setStatus(`❌ Error: ${error.message}`)
        } else {
          setStatus('✅ Supabase connection working!')
        }
      } catch (err) {
        setStatus(`❌ Connection failed: ${err}`)
      }
    }
    
    testConnection()
  }, [])
  
  return (
    <div className="p-4">
      <h1>Connection Test</h1>
      <p>{status}</p>
      <div className="mt-4">
        <p>Environment Check:</p>
        <ul>
          <li>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌'}</li>
          <li>Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌'}</li>
        </ul>
      </div>
    </div>
  )
}