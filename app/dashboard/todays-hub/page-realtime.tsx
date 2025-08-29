"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, BookOpen, Megaphone, Search, AlertTriangle, MessageCircle } from "lucide-react"
import { 
  useAnnouncementSubscription,
  useAssignmentSubscription,
  useEventSubscription,
  useStudentQuerySubscription,
  useStudyGroupSubscription
} from "@/hooks/useRealtimeSubscription"
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

interface NotificationItem { 
  id: string; 
  title: string; 
  created_at: string; 
  description?: string; 
  type: 'assignment' | 'announcement' | 'lost_found' | 'grievance' | 'study_group' | 'event' | 'query';
}

export default function TodaysHubRealtimePage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const supabase = createClient()

  // Load initial data and user profile
  useEffect(() => {
    const loadInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user profile to determine department/class
      const { data: profile } = await supabase
        .from('students')
        .select('department_id, class_id')
        .eq('user_id', user.id)
        .single()

      if (!profile) {
        // Try faculty table
        const { data: facultyProfile } = await supabase
          .from('faculty')
          .select('department_id')
          .eq('user_id', user.id)
          .single()
        
        setUserProfile(facultyProfile)
      } else {
        setUserProfile(profile)
      }

      try {
        const allNotifications: NotificationItem[] = []

        // Load assignments
        const { data: assignments } = await supabase
          .from('assignments')
          .select('id, title, created_at, description')
          .order('created_at', { ascending: false })
          .limit(10)
        
        if (assignments) {
          assignments.forEach((item: any) => {
            allNotifications.push({
              id: item.id,
              title: item.title,
              created_at: item.created_at,
              description: item.description,
              type: 'assignment'
            })
          })
        }

        // Load announcements
        const { data: announcements } = await supabase
          .from('announcements')
          .select('id, title, created_at, content')
          .order('created_at', { ascending: false })
          .limit(10)
        
        if (announcements) {
          announcements.forEach((item: any) => {
            allNotifications.push({
              id: item.id,
              title: item.title,
              created_at: item.created_at,
              description: item.content,
              type: 'announcement'
            })
          })
        }

        // Load study groups
        const { data: studyGroups } = await supabase
          .from('study_groups')
          .select('id, name, created_at, description')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(10)
        
        if (studyGroups) {
          studyGroups.forEach((item: any) => {
            allNotifications.push({
              id: item.id,
              title: item.name,
              created_at: item.created_at,
              description: item.description,
              type: 'study_group'
            })
          })
        }

        // Load events
        const { data: events } = await supabase
          .from('events')
          .select('id, title, created_at, description')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(10)
        
        if (events) {
          events.forEach((item: any) => {
            allNotifications.push({
              id: item.id,
              title: item.title,
              created_at: item.created_at,
              description: item.description,
              type: 'event'
            })
          })
        }

        // Load student queries
        const { data: queries } = await supabase
          .from('student_queries')
          .select('id, query_text, status, created_at, reply_text')
          .order('created_at', { ascending: false })
          .limit(10)
        
        if (queries) {
          queries.forEach((item: any) => {
            allNotifications.push({
              id: item.id,
              title: item.reply_text ? 'Query Replied' : 'Query Submitted',
              created_at: item.created_at,
              description: item.query_text,
              type: 'query'
            })
          })
        }

        // Load lost & found (university-wide)
        const { data: lostFound } = await supabase
          .from('lost_found_items')
          .select('id, title, created_at, description')
          .order('created_at', { ascending: false })
          .limit(10)

        if (lostFound) {
          (lostFound as any[]).forEach((item: any) => {
            allNotifications.push({
              id: item.id,
              title: item.title,
              created_at: item.created_at,
              description: item.description,
              type: 'lost_found'
            })
          })
        }

        // Load grievances (private to student)
        const { data: grievances } = await supabase
          .from('grievances')
          .select('id, title, created_at, description')
          .order('created_at', { ascending: false })
          .limit(10)

        if (grievances) {
          (grievances as any[]).forEach((item: any) => {
            allNotifications.push({
              id: item.id,
              title: item.title,
              created_at: item.created_at,
              description: item.description,
              type: 'grievance'
            })
          })
        }

        // Sort all notifications by date
        allNotifications.sort((a: NotificationItem, b: NotificationItem) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setNotifications(allNotifications)
      } catch (error) {
        console.error('Error loading notifications:', error)
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [])

  // Real-time update handlers
  const handleAnnouncementUpdate = useCallback((payload: RealtimePostgresChangesPayload) => {
    console.log('📢 Announcement update:', payload)
    
    setNotifications(prev => {
      let updated = [...prev]
      
      switch (payload.eventType) {
        case 'INSERT':
          const newAnnouncement: NotificationItem = {
            id: payload.new.id,
            title: payload.new.title,
            created_at: payload.new.created_at,
            description: payload.new.content,
            type: 'announcement'
          }
          updated = [newAnnouncement, ...updated]
          
          // Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Announcement', { body: payload.new.title })
          }
          break
          
        case 'UPDATE':
          updated = updated.map(item => 
            item.id === payload.new.id && item.type === 'announcement'
              ? { ...item, title: payload.new.title, description: payload.new.content }
              : item
          )
          break
          
        case 'DELETE':
          updated = updated.filter(item => !(item.id === payload.old.id && item.type === 'announcement'))
          break
      }
      
      // Sort by date and limit to recent items
      return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50)
    })
  }, [])

  const handleAssignmentUpdate = useCallback((payload: RealtimePostgresChangesPayload) => {
    console.log('📚 Assignment update:', payload)
    
    setNotifications(prev => {
      let updated = [...prev]
      
      switch (payload.eventType) {
        case 'INSERT':
          const newAssignment: NotificationItem = {
            id: payload.new.id,
            title: payload.new.title,
            created_at: payload.new.created_at,
            description: payload.new.description,
            type: 'assignment'
          }
          updated = [newAssignment, ...updated]
          
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Assignment', { body: payload.new.title })
          }
          break
          
        case 'UPDATE':
          updated = updated.map(item => 
            item.id === payload.new.id && item.type === 'assignment'
              ? { ...item, title: payload.new.title, description: payload.new.description }
              : item
          )
          break
          
        case 'DELETE':
          updated = updated.filter(item => !(item.id === payload.old.id && item.type === 'assignment'))
          break
      }
      
      return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50)
    })
  }, [])

  const handleEventUpdate = useCallback((payload: RealtimePostgresChangesPayload) => {
    console.log('🎉 Event update:', payload)
    
    setNotifications(prev => {
      let updated = [...prev]
      
      switch (payload.eventType) {
        case 'INSERT':
          const newEvent: NotificationItem = {
            id: payload.new.id,
            title: payload.new.title,
            created_at: payload.new.created_at,
            description: payload.new.description,
            type: 'event'
          }
          updated = [newEvent, ...updated]
          
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Event', { body: payload.new.title })
          }
          break
          
        case 'UPDATE':
          updated = updated.map(item => 
            item.id === payload.new.id && item.type === 'event'
              ? { ...item, title: payload.new.title, description: payload.new.description }
              : item
          )
          break
          
        case 'DELETE':
          updated = updated.filter(item => !(item.id === payload.old.id && item.type === 'event'))
          break
      }
      
      return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50)
    })
  }, [])

  const handleStudyGroupUpdate = useCallback((payload: RealtimePostgresChangesPayload) => {
    console.log('👥 Study group update:', payload)
    
    setNotifications(prev => {
      let updated = [...prev]
      
      switch (payload.eventType) {
        case 'INSERT':
          const newStudyGroup: NotificationItem = {
            id: payload.new.id,
            title: payload.new.name,
            created_at: payload.new.created_at,
            description: payload.new.description,
            type: 'study_group'
          }
          updated = [newStudyGroup, ...updated]
          
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Study Group', { body: payload.new.name })
          }
          break
          
        case 'UPDATE':
          updated = updated.map(item => 
            item.id === payload.new.id && item.type === 'study_group'
              ? { ...item, title: payload.new.name, description: payload.new.description }
              : item
          )
          break
          
        case 'DELETE':
          updated = updated.filter(item => !(item.id === payload.old.id && item.type === 'study_group'))
          break
      }
      
      return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50)
    })
  }, [])

  const handleQueryUpdate = useCallback((payload: RealtimePostgresChangesPayload) => {
    console.log('❓ Query update:', payload)
    
    setNotifications(prev => {
      let updated = [...prev]
      
      switch (payload.eventType) {
        case 'INSERT':
          const newQuery: NotificationItem = {
            id: payload.new.id,
            title: 'Query Submitted',
            created_at: payload.new.created_at,
            description: payload.new.query_text,
            type: 'query'
          }
          updated = [newQuery, ...updated]
          break
          
        case 'UPDATE':
          updated = updated.map(item => 
            item.id === payload.new.id && item.type === 'query'
              ? { 
                  ...item, 
                  title: payload.new.reply_text ? 'Query Replied' : 'Query Submitted',
                  description: payload.new.query_text 
                }
              : item
          )
          
          if (payload.new.reply_text && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Query Replied', { body: 'Your query has been answered' })
          }
          break
          
        case 'DELETE':
          updated = updated.filter(item => !(item.id === payload.old.id && item.type === 'query'))
          break
      }
      
      return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50)
    })
  }, [])

  // Set up real-time subscriptions
  useAnnouncementSubscription(
    handleAnnouncementUpdate,
    { departmentId: userProfile?.department_id, classId: userProfile?.class_id },
    { enabled: !!userProfile }
  )

  useAssignmentSubscription(
    handleAssignmentUpdate,
    { departmentId: userProfile?.department_id, classId: userProfile?.class_id },
    { enabled: !!userProfile }
  )

  useEventSubscription(
    handleEventUpdate,
    userProfile?.department_id,
    { enabled: !!userProfile }
  )

  useStudyGroupSubscription(
    handleStudyGroupUpdate,
    userProfile?.department_id,
    { enabled: !!userProfile }
  )

  useStudentQuerySubscription(
    handleQueryUpdate,
    userProfile?.department_id,
    { enabled: !!userProfile }
  )

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const getIcon = (type: string) => {
    switch (type) {
      case 'assignment': return <BookOpen className="h-4 w-4" />
      case 'announcement': return <Megaphone className="h-4 w-4" />
      case 'study_group': return <BookOpen className="h-4 w-4" />
      case 'event': return <Clock className="h-4 w-4" />
      case 'lost_found': return <Search className="h-4 w-4" />
      case 'grievance': return <AlertTriangle className="h-4 w-4" />
      case 'query': return <MessageCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'assignment': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'announcement': return 'bg-green-100 text-green-800 border-green-200'
      case 'study_group': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'event': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'lost_found': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'grievance': return 'bg-red-100 text-red-800 border-red-200'
      case 'query': return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return 'Yesterday'
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="space-y-3 md:space-y-4">
        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-xl md:text-2xl font-bold">Today's Hub</motion.h1>
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="animate-pulse bg-gray-200 h-16 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-xl md:text-2xl font-bold">
        Today's Hub
        <Badge className="ml-2 bg-green-500 text-white">Live</Badge>
      </motion.h1>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardContent className="p-3 md:p-5">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-between mb-4"
          >
            <h2 className="text-base md:text-lg font-semibold">Latest Updates</h2>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 500 }}
            >
              <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md">
                {notifications.length}
              </Badge>
            </motion.div>
          </motion.div>
          
          <div className="space-y-3">
            {notifications.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-8">
                No notifications yet. Check back later!
              </div>
            )}
            
            {notifications.map((notification, index) => (
              <motion.div 
                key={notification.id} 
                initial={{ opacity: 0, y: 20, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ 
                  delay: index * 0.08,
                  type: "spring",
                  stiffness: 300,
                  damping: 25
                }}
                className="p-4 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <motion.div 
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className={`p-2 rounded-full ${getTypeColor(notification.type)} group-hover:shadow-md transition-shadow`}
                    >
                      {getIcon(notification.type)}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm md:text-base truncate group-hover:text-primary transition-colors">{notification.title}</h3>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          <Badge variant="outline" className={`text-xs ${getTypeColor(notification.type)} capitalize`}>
                            {notification.type.replace('_', ' ')}
                          </Badge>
                        </motion.div>
                      </div>
                      {notification.description && (
                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                          {notification.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(notification.created_at)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
