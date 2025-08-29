import { createClient } from '@/lib/supabase/client'

// Define User type locally to avoid import issues
interface User {
  id: string
  email?: string
  user_metadata?: any
  [key: string]: any
}

export type UserRole = 'student' | 'faculty' | 'admin'
export type UserStatus = 'pending' | 'active' | 'rejected'
export type AuthProvider = 'google' | 'email'

export interface UserProfile {
  id: string
  user_id?: string
  full_name?: string
  name?: string
  email: string
  department?: string
  department_id?: string
  year?: string
  class_id?: string
  role: UserRole
  status?: UserStatus
  face_verified?: boolean
  auth_provider?: AuthProvider
  created_at: string
  updated_at: string
}

export interface PendingRegistration {
  id: string
  email: string
  name: string
  phone?: string
  department: string
  year?: string
  user_type: UserRole
  face_url?: string
  status: UserStatus
  rejection_reason?: string
  submitted_at: string
  auth_provider: AuthProvider
}

class AuthFlowManager {
  private supabase = createClient()

  /**
   * Check if user exists in profiles table
   */
  async checkUserExists(email: string): Promise<UserProfile | null> {
    try {
      const { data: student, error: studentError } = await this.supabase
        .from('students')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      if (student) {
        return {
          ...student,
          role: 'student' as UserRole,
          user_id: student.user_id || student.id,
          full_name: student.full_name || student.name,
          department: student.department,
          year: student.year,
          status: student.status || 'active',
          face_verified: student.face_verified || false,
          auth_provider: student.auth_provider || 'google'
        }
      }

      const { data: faculty, error: facultyError } = await this.supabase
        .from('faculty')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      if (faculty) {
        return {
          ...faculty,
          role: 'faculty' as UserRole,
          user_id: faculty.user_id || faculty.id,
          full_name: faculty.full_name || faculty.name,
          department: faculty.department,
          status: faculty.status || 'active',
          face_verified: faculty.face_verified || false,
          auth_provider: faculty.auth_provider || 'google'
        }
      }

      return null
    } catch (error) {
      console.error('Error checking user exists:', error)
      return null
    }
  }

  /**
   * Check pending registration status
   */
  async checkPendingRegistration(email: string): Promise<PendingRegistration | null> {
    try {
      const { data, error } = await this.supabase
        .from('pending_registrations')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking pending registration:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error checking pending registration:', error)
      return null
    }
  }

  /**
   * Google OAuth login flow
   */
  async signInWithGoogle(redirectTo?: string) {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    })

    if (error) {
      throw new Error(`Google OAuth failed: ${error.message}`)
    }

    return data
  }

  /**
   * Email/Password login for returning users
   */
  async signInWithEmail(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      throw new Error(`Login failed: ${error.message}`)
    }

    return data
  }

  /**
   * Create email/password credentials for Google users
   */
  async createEmailCredentials(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      throw new Error(`Failed to create credentials: ${error.message}`)
    }

    return data
  }

  /**
   * Determine redirect path based on user status and role
   */
  getRedirectPath(userProfile: UserProfile | null, pendingReg: PendingRegistration | null): string {
    // If user has pending registration
    if (pendingReg) {
      switch (pendingReg.status) {
        case 'pending':
          return '/auth/pending-approval'
        case 'rejected':
          return '/auth/registration-rejected'
        case 'active':
          // Should not happen, but handle gracefully
          return this.getDashboardPath(pendingReg.user_type)
      }
    }

    // If user exists in main tables
    if (userProfile) {
      switch (userProfile.status) {
        case 'pending':
          return '/auth/pending-approval'
        case 'rejected':
          return '/auth/registration-rejected'
        case 'active':
          return this.getDashboardPath(userProfile.role)
      }
    }

    // New user - needs registration
    return '/auth/complete-registration'
  }

  /**
   * Get dashboard path based on role
   */
  private getDashboardPath(role: UserRole): string {
    switch (role) {
      case 'student':
        return '/dashboard'
      case 'faculty':
        return '/dashboard'
      case 'admin':
        return '/admin'
      default:
        return '/dashboard'
    }
  }

  /**
   * Handle post-login flow
   */
  async handlePostLogin(user: User): Promise<string> {
    try {
      // Check if user exists in main tables
      const userProfile = await this.checkUserExists(user.email!)
      
      // Check pending registration
      const pendingReg = await this.checkPendingRegistration(user.email!)

      // Determine redirect path
      return this.getRedirectPath(userProfile, pendingReg)
    } catch (error) {
      console.error('Post-login flow error:', error)
      return '/auth/complete-registration'
    }
  }

  /**
   * Update user status (for admin approval)
   */
  async updateUserStatus(userId: string, status: UserStatus, rejectionReason?: string) {
    const { error } = await this.supabase
      .from('pending_registrations')
      .update({ 
        status, 
        rejection_reason: rejectionReason,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) {
      throw new Error(`Failed to update user status: ${error.message}`)
    }

    // If approved, move to main tables
    if (status === 'active') {
      await this.moveToMainTables(userId)
    }
  }

  /**
   * Move approved user from pending to main tables
   */
  private async moveToMainTables(pendingId: string) {
    const { data: pendingUser, error: fetchError } = await this.supabase
      .from('pending_registrations')
      .select('*')
      .eq('id', pendingId)
      .single()

    if (fetchError || !pendingUser) {
      throw new Error('Failed to fetch pending user')
    }

    const userData = {
      email: pendingUser.email,
      full_name: pendingUser.name,
      department_id: pendingUser.department,
      class_id: pendingUser.year,
      phone: pendingUser.phone,
      face_url: pendingUser.face_url,
      status: 'active' as UserStatus,
      face_verified: true,
      auth_provider: pendingUser.auth_provider || 'google' as AuthProvider,
      created_at: pendingUser.submitted_at,
      updated_at: new Date().toISOString()
    }

    // Insert into appropriate table
    const tableName = pendingUser.user_type === 'student' ? 'students' : 'faculty'
    const { error: insertError } = await this.supabase
      .from(tableName)
      .insert(userData)

    if (insertError) {
      throw new Error(`Failed to move user to ${tableName}: ${insertError.message}`)
    }

    // Remove from pending table
    const { error: deleteError } = await this.supabase
      .from('pending_registrations')
      .delete()
      .eq('id', pendingId)

    if (deleteError) {
      console.error('Failed to remove from pending table:', deleteError)
      // Don't throw error here as user is already approved
    }
  }

  /**
   * Sign out user
   */
  async signOut() {
    const { error } = await this.supabase.auth.signOut()
    if (error) {
      throw new Error(`Sign out failed: ${error.message}`)
    }
  }

  /**
   * Get current user session
   */
  async getCurrentUser() {
    const { data: { user }, error } = await this.supabase.auth.getUser()
    if (error) {
      throw new Error(`Failed to get user: ${error.message}`)
    }
    return user
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return this.supabase.auth.onAuthStateChange(callback)
  }
}

// Export singleton instance
export const authFlowManager = new AuthFlowManager()
export default authFlowManager
