"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, User, Mail, Phone, GraduationCap, Building, Calendar, Eye } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { authFlowManager } from '@/lib/auth/auth-flow-manager'

interface PendingUser {
  id: string
  email: string
  name: string
  phone?: string
  department: string
  year?: string
  user_type: 'student' | 'faculty'
  face_url?: string
  status: string
  submitted_at: string
  auth_provider: string
}

export default function PendingApprovalsPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadPendingUsers()
    
    // Set up real-time subscription for pending registrations
    const channel = supabase
      .channel('pending_registrations_admin')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pending_registrations' },
        () => {
          loadPendingUsers() // Reload when changes occur
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadPendingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false })

      if (error) {
        console.error('Error loading pending users:', error)
        toast({
          title: 'Error',
          description: 'Failed to load pending registrations',
          variant: 'destructive'
        })
        return
      }

      setPendingUsers(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId: string) => {
    setActionLoading(userId)
    try {
      await authFlowManager.updateUserStatus(userId, 'active')
      
      toast({
        title: 'User Approved',
        description: 'User has been approved and moved to active status',
      })
      
      // Remove from local state
      setPendingUsers(prev => prev.filter(user => user.id !== userId))
    } catch (error: any) {
      console.error('Approval error:', error)
      toast({
        title: 'Approval Failed',
        description: error.message || 'Failed to approve user',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (userId: string, reason: string) => {
    if (!reason.trim()) {
      toast({
        title: 'Rejection Reason Required',
        description: 'Please provide a reason for rejection',
        variant: 'destructive'
      })
      return
    }

    setActionLoading(userId)
    try {
      await authFlowManager.updateUserStatus(userId, 'rejected', reason)
      
      toast({
        title: 'User Rejected',
        description: 'User registration has been rejected',
      })
      
      // Remove from local state
      setPendingUsers(prev => prev.filter(user => user.id !== userId))
      setSelectedUser(null)
      setRejectionReason('')
    } catch (error: any) {
      console.error('Rejection error:', error)
      toast({
        title: 'Rejection Failed',
        description: error.message || 'Failed to reject user',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Pending Approvals</h1>
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Pending Approvals</h1>
          <Badge variant="outline" className="text-lg px-3 py-1">
            {pendingUsers.length} Pending
          </Badge>
        </div>

        {pendingUsers.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
                <p className="text-gray-600">No pending registrations to review.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {pendingUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                          <AvatarImage src={user.face_url} alt={user.name} />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xl font-bold">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-xl">{user.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={
                              user.user_type === 'student' 
                                ? 'bg-blue-100 text-blue-800 border-blue-200' 
                                : 'bg-purple-100 text-purple-800 border-purple-200'
                            }>
                              {user.user_type === 'student' ? 'Student' : 'Faculty'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {user.auth_provider === 'google' ? 'Google OAuth' : 'Email/Password'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>Submitted</p>
                        <p>{formatDate(user.submitted_at)}</p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                      
                      {user.phone && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Phone className="h-4 w-4" />
                          <span className="text-sm">{user.phone}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Building className="h-4 w-4" />
                        <span className="text-sm">{user.department}</span>
                      </div>
                      
                      {user.year && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <GraduationCap className="h-4 w-4" />
                          <span className="text-sm">{user.year}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {user.face_url && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                View Photo
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Face Verification Photo</DialogTitle>
                              </DialogHeader>
                              <div className="flex justify-center">
                                <img 
                                  src={user.face_url} 
                                  alt={`${user.name}'s verification photo`}
                                  className="max-w-full max-h-96 rounded-lg"
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              disabled={actionLoading === user.id}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reject Registration</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Alert>
                                <AlertDescription>
                                  Please provide a reason for rejecting {user.name}'s registration.
                                  This will be sent to the user via email.
                                </AlertDescription>
                              </Alert>
                              <Textarea
                                placeholder="Enter rejection reason..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows={4}
                              />
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    setSelectedUser(null)
                                    setRejectionReason('')
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  variant="destructive"
                                  onClick={() => handleReject(user.id, rejectionReason)}
                                  disabled={actionLoading === user.id}
                                >
                                  {actionLoading === user.id ? 'Rejecting...' : 'Reject'}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button 
                          onClick={() => handleApprove(user.id)}
                          disabled={actionLoading === user.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {actionLoading === user.id ? 'Approving...' : 'Approve'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
