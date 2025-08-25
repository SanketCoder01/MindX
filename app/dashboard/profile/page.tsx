"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Camera, User, Lock, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import ProfileEditor from "@/components/ProfileEditor"
import { useUser } from "@/contexts/UserContext"

export default function ProfilePage() {
  const { toast } = useToast()
  const supabase = createClient()
  // Mock fetchUserProfile since authentication is disabled
  const fetchUserProfile = () => Promise.resolve()
  const [isEditing, setIsEditing] = useState(false)
  const [showPhotoEditor, setShowPhotoEditor] = useState(false)
  const [showPasswordUpdate, setShowPasswordUpdate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userType, setUserType] = useState<'student' | 'faculty'>('student')
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [profile, setProfile] = useState({
    id: '',
    name: '',
    email: '',
    department: '',
    year: '',
    designation: '',
    employee_id: '',
    phone: '',
    photoUrl: null as string | null,
    face_url: null as string | null,
  })
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    loadProfile()
    
    // Set up real-time subscription for profile updates
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
      const channel = supabase
        .channel('profile_updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students_cse_1st_year' }, () => loadProfile())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students_cse_2nd_year' }, () => loadProfile())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students_cse_3rd_year' }, () => loadProfile())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students_cse_4th_year' }, () => loadProfile())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students_aids_1st_year' }, () => loadProfile())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students_aids_2nd_year' }, () => loadProfile())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students_aids_3rd_year' }, () => loadProfile())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students_aids_4th_year' }, () => loadProfile())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students_aiml_1st_year' }, () => loadProfile())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students_aiml_2nd_year' }, () => loadProfile())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students_aiml_3rd_year' }, () => loadProfile())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students_aiml_4th_year' }, () => loadProfile())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students_cy_1st_year' }, () => loadProfile())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students_cy_2nd_year' }, () => loadProfile())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students_cy_3rd_year' }, () => loadProfile())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students_cy_4th_year' }, () => loadProfile())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'faculty_cse' }, () => loadProfile())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'faculty_aids' }, () => loadProfile())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'faculty_aiml' }, () => loadProfile())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'faculty_cy' }, () => loadProfile())
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
      }
    }
    
    setupSubscription()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in again.",
          variant: "destructive",
        })
        return
      }

      // First check if user has a pending registration to get their type and department
      const { data: pendingReg } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .single()

      if (pendingReg) {
        if (pendingReg.user_type === 'student') {
          // Query the specific department-year table for students
          const dept = pendingReg.department.toLowerCase()
          const year = pendingReg.year.toLowerCase().replace(' year', 'th_year').replace('st_year', '1st_year').replace('nd_year', '2nd_year').replace('rd_year', '3rd_year')
          const tableName = `students_${dept}_${year}`
          
          const { data: studentData } = await supabase
            .from(tableName)
            .select('*')
            .eq('user_id', user.id)
            .single()

          if (studentData) {
            setUserType('student')
            setProfile({
              id: studentData.id,
              name: studentData.name || '',
              email: studentData.email || '',
              department: studentData.department || '',
              year: studentData.year || '',
              designation: '',
              employee_id: studentData.prn || '',
              phone: studentData.phone || '',
              photoUrl: studentData.face_url || null,
              face_url: studentData.face_url || null,
            })
          }
        } else if (pendingReg.user_type === 'faculty') {
          // Query the department-specific faculty table
          const dept = pendingReg.department.toLowerCase()
          const tableName = `faculty_${dept}`
          
          const { data: facultyData } = await supabase
            .from(tableName)
            .select('*')
            .eq('user_id', user.id)
            .single()

          if (facultyData) {
            setUserType('faculty')
            setProfile({
              id: facultyData.id,
              name: facultyData.name || '',
              email: facultyData.email || '',
              department: facultyData.department || '',
              year: '',
              designation: facultyData.designation || '',
              employee_id: facultyData.employee_id || '',
              phone: facultyData.phone || '',
              photoUrl: facultyData.face_url || null,
              face_url: facultyData.face_url || null,
            })
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      toast({
        title: "Error",
        description: "Failed to load profile data.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's registration info to determine correct table
      const { data: pendingReg } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .single()

      if (!pendingReg) return

      const updateData: any = {
        name: profile.name,
        department: profile.department,
        phone: profile.phone,
      }
      
      if (userType === 'student') {
        updateData.year = profile.year
        
        // Update both specific department-year table and general department table
        const dept = pendingReg.department.toLowerCase()
        const year = pendingReg.year.toLowerCase().replace(' year', 'th_year').replace('st_year', '1st_year').replace('nd_year', '2nd_year').replace('rd_year', '3rd_year')
        const specificTableName = `students_${dept}_${year}`
        const generalTableName = `students_${dept}`

        // Update specific table
        await supabase.from(specificTableName).update(updateData).eq('user_id', user.id)
        // Update general table
        await supabase.from(generalTableName).update(updateData).eq('user_id', user.id)
      } else {
        updateData.designation = profile.designation
        updateData.employee_id = profile.employee_id
        
        // Update both department-specific and general faculty tables
        const dept = pendingReg.department.toLowerCase()
        const deptTableName = `faculty_${dept}`

        // Update department table
        await supabase.from(deptTableName).update(updateData).eq('user_id', user.id)
        // Update general table
        await supabase.from('faculty').update(updateData).eq('user_id', user.id)
      }

      setIsEditing(false)
      await fetchUserProfile()
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      })
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePasswordUpdate = async () => {
    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast({
          title: "Password Mismatch",
          description: "New passwords do not match.",
          variant: "destructive",
        })
        return
      }

      if (passwordData.newPassword.length < 8) {
        toast({
          title: "Password Too Short",
          description: "Password must be at least 8 characters long.",
          variant: "destructive",
        })
        return
      }

      // Verify old password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: passwordData.oldPassword
      })

      if (signInError) {
        toast({
          title: "Incorrect Password",
          description: "The current password is incorrect.",
          variant: "destructive",
        })
        return
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (updateError) throw updateError

      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' })
      setShowPasswordUpdate(false)
      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully.",
      })
    } catch (error) {
      console.error('Error updating password:', error)
      toast({
        title: "Update Failed",
        description: "Failed to update password. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePhotoUpload = () => setShowPhotoEditor(true)

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="mr-2" onClick={() => window.history.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            variant={isEditing ? "default" : "outline"}
          >
            {isEditing ? "Save Changes" : "Edit Profile"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center"
            >
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden">
                  {(profile.face_url || profile.photoUrl) ? (
                    <img
                      src={profile.face_url || profile.photoUrl || "/placeholder.svg"}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-16 w-16 text-purple-500" />
                  )}
                </div>
                {isEditing && (
                  <Button
                    size="icon"
                    className="absolute bottom-0 right-0 rounded-full bg-purple-600 hover:bg-purple-700"
                    onClick={handlePhotoUpload}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex-1 space-y-4"
            >
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={profile.name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={profile.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  name="department"
                  value={profile.department}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
              </div>

              {userType === 'student' && (
                <div className="grid gap-2">
                  <Label htmlFor="year">Academic Year</Label>
                  <Input
                    id="year"
                    name="year"
                    value={profile.year}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={!isEditing ? "bg-gray-50" : ""}
                  />
                </div>
              )}

              {userType === 'faculty' && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      name="designation"
                      value={profile.designation}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={!isEditing ? "bg-gray-50" : ""}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="employee_id">Employee ID</Label>
                    <Input
                      id="employee_id"
                      name="employee_id"
                      value={profile.employee_id}
                      onChange={handleInputChange}
                      disabled={true}
                      className="bg-gray-50"
                    />
                  </div>
                </>
              )}

              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={profile.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col gap-4">
          <Button
            onClick={() => setShowPasswordUpdate(true)}
            variant="outline"
            className="w-full justify-center"
          >
            <Lock className="mr-2 h-4 w-4" />
            Change Password
          </Button>
      </div>

      {showPhotoEditor && (
        <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Edit Profile Photo</h2>
              <Button variant="ghost" onClick={() => setShowPhotoEditor(false)}>Close</Button>
            </div>
            <ProfileEditor initialPhoto={profile.face_url || profile.photoUrl || undefined} />
          </div>
        </div>
      )}

      {showPasswordUpdate && (
        <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Change Password
                  <Button variant="ghost" size="sm" onClick={() => setShowPasswordUpdate(false)}>
                    ×
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="oldPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="oldPassword"
                      type={showOldPassword ? "text" : "password"}
                      value={passwordData.oldPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                      placeholder="Enter current password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                    >
                      {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="Enter new password (min 8 characters)"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' })
                      setShowPasswordUpdate(false)
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePasswordUpdate}
                    className="flex-1"
                    disabled={!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                  >
                    Update Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
