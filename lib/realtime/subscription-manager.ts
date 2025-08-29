import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export type DatabaseEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'
export type SubscriptionCallback<T = any> = (payload: RealtimePostgresChangesPayload<T>) => void

export interface SubscriptionConfig {
  table: string
  event?: DatabaseEvent
  schema?: string
  filter?: string
  callback: SubscriptionCallback
}

export interface SubscriptionInstance {
  id: string
  channel: RealtimeChannel
  unsubscribe: () => void
}

class RealtimeSubscriptionManager {
  private subscriptions: Map<string, SubscriptionInstance> = new Map()
  private supabase = createClient()

  /**
   * Subscribe to real-time changes on a specific table
   * @param config - Subscription configuration
   * @returns Subscription instance with unsubscribe method
   */
  subscribe<T = any>(config: SubscriptionConfig): SubscriptionInstance {
    const {
      table,
      event = '*',
      schema = 'public',
      filter,
      callback
    } = config

    // Generate unique subscription ID
    const subscriptionId = `${schema}_${table}_${event}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create channel name
    const channelName = `realtime:${subscriptionId}`

    // Create channel
    const channel = this.supabase.channel(channelName)

    // Configure postgres changes subscription
    let subscription = channel.on(
      'postgres_changes',
      {
        event,
        schema,
        table,
        ...(filter && { filter })
      },
      callback
    )

    // Subscribe to channel
    subscription.subscribe((status) => {
      console.log(`Subscription ${subscriptionId} status:`, status)
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Successfully subscribed to ${table} changes`)
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Failed to subscribe to ${table} changes`)
      }
    })

    // Create unsubscribe function
    const unsubscribe = () => {
      console.log(`🔌 Unsubscribing from ${table} changes`)
      this.supabase.removeChannel(channel)
      this.subscriptions.delete(subscriptionId)
    }

    // Store subscription instance
    const instance: SubscriptionInstance = {
      id: subscriptionId,
      channel,
      unsubscribe
    }

    this.subscriptions.set(subscriptionId, instance)

    return instance
  }

  /**
   * Subscribe to multiple tables at once
   * @param configs - Array of subscription configurations
   * @returns Array of subscription instances
   */
  subscribeMultiple(configs: SubscriptionConfig[]): SubscriptionInstance[] {
    return configs.map(config => this.subscribe(config))
  }

  /**
   * Unsubscribe from a specific subscription
   * @param subscriptionId - ID of the subscription to remove
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId)
    if (subscription) {
      subscription.unsubscribe()
    }
  }

  /**
   * Unsubscribe from all active subscriptions
   */
  unsubscribeAll(): void {
    console.log(`🔌 Unsubscribing from ${this.subscriptions.size} active subscriptions`)
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe()
    })
    this.subscriptions.clear()
  }

  /**
   * Get all active subscriptions
   * @returns Array of subscription IDs
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys())
  }

  /**
   * Get subscription count
   * @returns Number of active subscriptions
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size
  }

  /**
   * Subscribe to announcements for students
   * @param callback - Function to handle announcement changes
   * @param departmentId - Optional department filter
   * @param classId - Optional class filter
   * @returns Subscription instance
   */
  subscribeToAnnouncements(
    callback: SubscriptionCallback,
    departmentId?: string,
    classId?: string
  ): SubscriptionInstance {
    let filter = ''
    if (departmentId && classId) {
      filter = `department_id=eq.${departmentId},class_id=eq.${classId}`
    } else if (departmentId) {
      filter = `department_id=eq.${departmentId}`
    }

    return this.subscribe({
      table: 'announcements',
      event: '*',
      callback,
      ...(filter && { filter })
    })
  }

  /**
   * Subscribe to assignments for students
   * @param callback - Function to handle assignment changes
   * @param departmentId - Optional department filter
   * @param classId - Optional class filter
   * @returns Subscription instance
   */
  subscribeToAssignments(
    callback: SubscriptionCallback,
    departmentId?: string,
    classId?: string
  ): SubscriptionInstance {
    let filter = ''
    if (departmentId && classId) {
      filter = `department_id=eq.${departmentId},class_id=eq.${classId}`
    } else if (departmentId) {
      filter = `department_id=eq.${departmentId}`
    }

    return this.subscribe({
      table: 'assignments',
      event: '*',
      callback,
      ...(filter && { filter })
    })
  }

  /**
   * Subscribe to assignment responses for faculty
   * @param callback - Function to handle response changes
   * @param facultyId - Faculty ID to filter responses
   * @returns Subscription instance
   */
  subscribeToAssignmentResponses(
    callback: SubscriptionCallback,
    facultyId?: string
  ): SubscriptionInstance {
    return this.subscribe({
      table: 'assignment_responses',
      event: '*',
      callback,
      ...(facultyId && { filter: `faculty_id=eq.${facultyId}` })
    })
  }

  /**
   * Subscribe to events for students
   * @param callback - Function to handle event changes
   * @param departmentId - Optional department filter
   * @returns Subscription instance
   */
  subscribeToEvents(
    callback: SubscriptionCallback,
    departmentId?: string
  ): SubscriptionInstance {
    let filter = 'status=eq.published'
    if (departmentId) {
      filter += `,department_id=eq.${departmentId}`
    }

    return this.subscribe({
      table: 'events',
      event: '*',
      callback,
      filter
    })
  }

  /**
   * Subscribe to student queries for faculty
   * @param callback - Function to handle query changes
   * @param departmentId - Optional department filter
   * @returns Subscription instance
   */
  subscribeToStudentQueries(
    callback: SubscriptionCallback,
    departmentId?: string
  ): SubscriptionInstance {
    return this.subscribe({
      table: 'student_queries',
      event: '*',
      callback,
      ...(departmentId && { filter: `department_id=eq.${departmentId}` })
    })
  }

  /**
   * Subscribe to study groups
   * @param callback - Function to handle study group changes
   * @param departmentId - Optional department filter
   * @returns Subscription instance
   */
  subscribeToStudyGroups(
    callback: SubscriptionCallback,
    departmentId?: string
  ): SubscriptionInstance {
    let filter = 'status=eq.active'
    if (departmentId) {
      filter += `,department_id=eq.${departmentId}`
    }

    return this.subscribe({
      table: 'study_groups',
      event: '*',
      callback,
      filter
    })
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeSubscriptionManager()

// Export utility functions for common use cases
export const subscribeToTable = (config: SubscriptionConfig) => realtimeManager.subscribe(config)
export const unsubscribeFromAll = () => realtimeManager.unsubscribeAll()

export default realtimeManager
