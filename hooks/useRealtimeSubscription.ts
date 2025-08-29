import { useEffect, useRef, useCallback } from 'react'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { realtimeManager, SubscriptionConfig, SubscriptionInstance } from '@/lib/realtime/subscription-manager'

export interface UseRealtimeSubscriptionOptions {
  enabled?: boolean
  onError?: (error: Error) => void
}

/**
 * React hook for managing real-time subscriptions
 * @param config - Subscription configuration
 * @param options - Additional options
 * @returns Subscription management functions
 */
export function useRealtimeSubscription<T = any>(
  config: SubscriptionConfig,
  options: UseRealtimeSubscriptionOptions = {}
) {
  const { enabled = true, onError } = options
  const subscriptionRef = useRef<SubscriptionInstance | null>(null)
  const configRef = useRef(config)

  // Update config ref when config changes
  useEffect(() => {
    configRef.current = config
  }, [config])

  const subscribe = useCallback(() => {
    if (!enabled) return

    try {
      // Unsubscribe from previous subscription if exists
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }

      // Create new subscription
      subscriptionRef.current = realtimeManager.subscribe(configRef.current)
    } catch (error) {
      console.error('Failed to subscribe:', error)
      onError?.(error as Error)
    }
  }, [enabled, onError])

  const unsubscribe = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
      subscriptionRef.current = null
    }
  }, [])

  // Subscribe on mount and when enabled changes
  useEffect(() => {
    if (enabled) {
      subscribe()
    } else {
      unsubscribe()
    }

    // Cleanup on unmount
    return () => {
      unsubscribe()
    }
  }, [enabled, subscribe, unsubscribe])

  return {
    subscribe,
    unsubscribe,
    isSubscribed: subscriptionRef.current !== null
  }
}

/**
 * Hook for subscribing to announcements with automatic filtering
 */
export function useAnnouncementSubscription(
  callback: (payload: RealtimePostgresChangesPayload) => void,
  filters?: { departmentId?: string; classId?: string },
  options?: UseRealtimeSubscriptionOptions
) {
  return useRealtimeSubscription(
    {
      table: 'announcements',
      event: '*',
      callback,
      ...(filters?.departmentId && filters?.classId && {
        filter: `department_id=eq.${filters.departmentId},class_id=eq.${filters.classId}`
      }),
      ...(filters?.departmentId && !filters?.classId && {
        filter: `department_id=eq.${filters.departmentId}`
      })
    },
    options
  )
}

/**
 * Hook for subscribing to assignments with automatic filtering
 */
export function useAssignmentSubscription(
  callback: (payload: RealtimePostgresChangesPayload) => void,
  filters?: { departmentId?: string; classId?: string },
  options?: UseRealtimeSubscriptionOptions
) {
  return useRealtimeSubscription(
    {
      table: 'assignments',
      event: '*',
      callback,
      ...(filters?.departmentId && filters?.classId && {
        filter: `department_id=eq.${filters.departmentId},class_id=eq.${filters.classId}`
      }),
      ...(filters?.departmentId && !filters?.classId && {
        filter: `department_id=eq.${filters.departmentId}`
      })
    },
    options
  )
}

/**
 * Hook for subscribing to assignment responses (for faculty)
 */
export function useAssignmentResponseSubscription(
  callback: (payload: RealtimePostgresChangesPayload) => void,
  facultyId?: string,
  options?: UseRealtimeSubscriptionOptions
) {
  return useRealtimeSubscription(
    {
      table: 'assignment_responses',
      event: '*',
      callback,
      ...(facultyId && { filter: `faculty_id=eq.${facultyId}` })
    },
    options
  )
}

/**
 * Hook for subscribing to events
 */
export function useEventSubscription(
  callback: (payload: RealtimePostgresChangesPayload) => void,
  departmentId?: string,
  options?: UseRealtimeSubscriptionOptions
) {
  return useRealtimeSubscription(
    {
      table: 'events',
      event: '*',
      callback,
      filter: departmentId ? `status=eq.published,department_id=eq.${departmentId}` : 'status=eq.published'
    },
    options
  )
}

/**
 * Hook for subscribing to student queries (for faculty)
 */
export function useStudentQuerySubscription(
  callback: (payload: RealtimePostgresChangesPayload) => void,
  departmentId?: string,
  options?: UseRealtimeSubscriptionOptions
) {
  return useRealtimeSubscription(
    {
      table: 'student_queries',
      event: '*',
      callback,
      ...(departmentId && { filter: `department_id=eq.${departmentId}` })
    },
    options
  )
}

/**
 * Hook for subscribing to study groups
 */
export function useStudyGroupSubscription(
  callback: (payload: RealtimePostgresChangesPayload) => void,
  departmentId?: string,
  options?: UseRealtimeSubscriptionOptions
) {
  return useRealtimeSubscription(
    {
      table: 'study_groups',
      event: '*',
      callback,
      filter: departmentId ? `status=eq.active,department_id=eq.${departmentId}` : 'status=eq.active'
    },
    options
  )
}

/**
 * Hook for managing multiple subscriptions
 */
export function useMultipleSubscriptions(
  configs: SubscriptionConfig[],
  options: UseRealtimeSubscriptionOptions = {}
) {
  const { enabled = true, onError } = options
  const subscriptionsRef = useRef<SubscriptionInstance[]>([])

  const subscribeAll = useCallback(() => {
    if (!enabled) return

    try {
      // Unsubscribe from previous subscriptions
      subscriptionsRef.current.forEach(sub => sub.unsubscribe())
      
      // Create new subscriptions
      subscriptionsRef.current = realtimeManager.subscribeMultiple(configs)
    } catch (error) {
      console.error('Failed to subscribe to multiple tables:', error)
      onError?.(error as Error)
    }
  }, [configs, enabled, onError])

  const unsubscribeAll = useCallback(() => {
    subscriptionsRef.current.forEach(sub => sub.unsubscribe())
    subscriptionsRef.current = []
  }, [])

  useEffect(() => {
    if (enabled) {
      subscribeAll()
    } else {
      unsubscribeAll()
    }

    return () => {
      unsubscribeAll()
    }
  }, [enabled, subscribeAll, unsubscribeAll])

  return {
    subscribeAll,
    unsubscribeAll,
    subscriptionCount: subscriptionsRef.current.length
  }
}
