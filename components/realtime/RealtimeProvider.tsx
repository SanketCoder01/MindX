"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { realtimeManager } from '@/lib/realtime/subscription-manager'
import { createClient } from '@/lib/supabase/client'

interface RealtimeContextType {
  isConnected: boolean
  subscriptionCount: number
  userProfile: any
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  subscriptionCount: 0,
  userProfile: null,
  connectionStatus: 'disconnected'
})

export const useRealtime = () => useContext(RealtimeContext)

interface RealtimeProviderProps {
  children: React.ReactNode
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [subscriptionCount, setSubscriptionCount] = useState(0)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const supabase = createClient()

  useEffect(() => {
    const initializeRealtime = async () => {
      setConnectionStatus('connecting')
      
      try {
        // Get user and profile
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setConnectionStatus('disconnected')
          return
        }

        // Try to get student profile first
        const { data: studentProfile } = await supabase
          .from('students')
          .select('id, user_id, department_id, class_id, full_name')
          .eq('user_id', user.id)
          .single()

        if (studentProfile) {
          setUserProfile({ ...studentProfile, role: 'student' })
        } else {
          // Try faculty profile
          const { data: facultyProfile } = await supabase
            .from('faculty')
            .select('id, user_id, department_id, full_name')
            .eq('user_id', user.id)
            .single()

          if (facultyProfile) {
            setUserProfile({ ...facultyProfile, role: 'faculty' })
          }
        }

        setConnectionStatus('connected')
        setIsConnected(true)
      } catch (error) {
        console.error('Failed to initialize realtime:', error)
        setConnectionStatus('error')
      }
    }

    initializeRealtime()

    // Update subscription count periodically
    const interval = setInterval(() => {
      setSubscriptionCount(realtimeManager.getSubscriptionCount())
    }, 1000)

    return () => {
      clearInterval(interval)
      realtimeManager.unsubscribeAll()
    }
  }, [])

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setIsConnected(false)
        setUserProfile(null)
        setConnectionStatus('disconnected')
        realtimeManager.unsubscribeAll()
      } else if (event === 'SIGNED_IN' && session) {
        setConnectionStatus('connecting')
        // Re-initialize when user signs in
        window.location.reload()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <RealtimeContext.Provider value={{
      isConnected,
      subscriptionCount,
      userProfile,
      connectionStatus
    }}>
      {children}
    </RealtimeContext.Provider>
  )
}
