"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { authFlowManager } from '@/lib/auth/auth-flow-manager'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          setStatus('error')
          setMessage(error.message)
          return
        }

        const { session } = data
        if (!session?.user) {
          setStatus('error')
          setMessage('No user session found')
          return
        }

        const user = session.user
        const userType = searchParams.get('type') || 'student'

        // Debug logging
        console.log('🔍 Auth Callback - User from session:', user)
        console.log('📧 User email:', user.email)
        console.log('📋 User metadata:', user.user_metadata)

        if (!user.email) {
          setStatus('error')
          setMessage('User details not found. Please try signing in again.')
          return
        }

        // Check if this is a new user (Google OAuth) or returning user
        const userProfile = await authFlowManager.checkUserExists(user.email!)
        const pendingReg = await authFlowManager.checkPendingRegistration(user.email!)

        console.log('👤 User profile found:', userProfile)
        console.log('⏳ Pending registration found:', pendingReg)

        if (!userProfile && !pendingReg) {
          // New user - redirect to registration with pre-filled data
          const params = new URLSearchParams({
            email: user.email!,
            name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            photo: user.user_metadata?.avatar_url || '',
            type: userType
          })
          
          setStatus('success')
          setMessage('Redirecting to complete registration...')
          router.push(`/auth/complete-registration?${params.toString()}`)
          return
        }

        // Existing user - determine redirect path
        const redirectPath = await authFlowManager.handlePostLogin(user)
        setStatus('success')
        setMessage('Login successful! Redirecting...')
        router.push(redirectPath)

      } catch (error: any) {
        console.error('Auth callback error:', error)
        setStatus('error')
        setMessage(error.message || 'Authentication failed')
      }
    }

    handleAuthCallback()
  }, [router, searchParams, supabase.auth])

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-600" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-blue-600'
      case 'success':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
    }
  }

  const getStatusTitle = () => {
    switch (status) {
      case 'loading':
        return 'Processing Authentication...'
      case 'success':
        return 'Authentication Successful!'
      case 'error':
        return 'Authentication Failed'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            {getStatusIcon()}
            <h2 className={`text-xl font-semibold ${getStatusColor()}`}>
              {getStatusTitle()}
            </h2>
            {message && (
              <p className="text-gray-600 text-sm">
                {message}
              </p>
            )}
            {status === 'error' && (
              <div className="mt-4">
                <button
                  onClick={() => router.push('/login')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Return to Login
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
