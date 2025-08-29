"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { authFlowManager } from '@/lib/auth/auth-flow-manager'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  allowedRoles?: ('student' | 'faculty' | 'admin')[]
  redirectTo?: string
}

export default function AuthGuard({ 
  children, 
  requireAuth = true, 
  allowedRoles = ['student', 'faculty', 'admin'],
  redirectTo = '/login'
}: AuthGuardProps) {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        // If auth not required, allow access
        if (!requireAuth) {
          setAuthorized(true)
          setLoading(false)
          return
        }

        // If no session and auth required, redirect to login
        if (!session) {
          router.push(redirectTo)
          return
        }

        const user = session.user

        // Check user status and role
        const userProfile = await authFlowManager.checkUserExists(user.email!)
        const pendingReg = await authFlowManager.checkPendingRegistration(user.email!)

        // Handle different user states
        if (pendingReg) {
          switch (pendingReg.status) {
            case 'pending':
              if (pathname !== '/auth/pending-approval') {
                router.push('/auth/pending-approval')
                return
              }
              break
            case 'rejected':
              if (pathname !== '/auth/registration-rejected') {
                router.push('/auth/registration-rejected')
                return
              }
              break
          }
        } else if (userProfile) {
          switch (userProfile.status) {
            case 'pending':
              if (pathname !== '/auth/pending-approval') {
                router.push('/auth/pending-approval')
                return
              }
              break
            case 'rejected':
              if (pathname !== '/auth/registration-rejected') {
                router.push('/auth/registration-rejected')
                return
              }
              break
            case 'active':
              // Check if user role is allowed
              if (!allowedRoles.includes(userProfile.role)) {
                router.push('/unauthorized')
                return
              }
              break
          }
        } else {
          // New user - redirect to registration
          if (pathname !== '/auth/complete-registration') {
            router.push('/auth/complete-registration')
            return
          }
        }

        setAuthorized(true)
      } catch (error) {
        console.error('Auth check error:', error)
        router.push(redirectTo)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (event === 'SIGNED_OUT') {
        setAuthorized(false)
        router.push(redirectTo)
      } else if (event === 'SIGNED_IN') {
        checkAuth()
      }
    })

    return () => subscription.unsubscribe()
  }, [requireAuth, allowedRoles, redirectTo, router, pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return <>{children}</>
}
