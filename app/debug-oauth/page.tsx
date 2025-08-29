"use client"

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'

export default function DebugOAuth() {
  const [logs, setLogs] = useState<string[]>([])
  const supabase = createClientComponentClient()

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testGoogleOAuth = async () => {
    addLog('Testing Google OAuth configuration...')
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?type=student`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })

      if (error) {
        addLog(`OAuth Error: ${error.message}`)
      } else {
        addLog('OAuth initiated successfully')
      }
    } catch (err: any) {
      addLog(`Exception: ${err.message}`)
    }
  }

  const checkSupabaseConfig = () => {
    addLog('Checking Supabase configuration...')
    addLog(`URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'}`)
    addLog(`Anon Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'}`)
  }

  useEffect(() => {
    checkSupabaseConfig()
  }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">OAuth Debug Page</h1>
      
      <div className="space-y-4">
        <button 
          onClick={testGoogleOAuth}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Test Google OAuth
        </button>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Debug Logs:</h2>
          <div className="space-y-1 text-sm font-mono">
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded border-l-4 border-yellow-400">
          <h3 className="font-semibold">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm mt-2">
            <li>Click "Test Google OAuth" button</li>
            <li>Check the logs for any errors</li>
            <li>If OAuth works, you'll be redirected to Google</li>
            <li>Check browser console (F12) for additional errors</li>
            <li>Check server console for callback logs</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
