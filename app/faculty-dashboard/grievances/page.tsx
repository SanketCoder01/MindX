"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card"
import { Badge } from "@/ui/badge"
import { Button } from "@/ui/button"
import { Textarea } from "@/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select"
import { Input } from "@/ui/input"
import { MessageCircle, Clock, CheckCircle, XCircle, AlertTriangle, Search, Filter } from "lucide-react"
import { getFacultyGrievances, addFacultyResponse, type Grievance } from "@/app/actions/grievance-actions"
import { useUser } from "@/contexts/UserContext"
import { toast } from "@/hooks/use-toast"

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  in_review: "bg-blue-100 text-blue-800", 
  resolved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800"
}

const statusIcons = {
  pending: Clock,
  in_review: AlertTriangle,
  resolved: CheckCircle,
  rejected: XCircle
}

export default function FacultyGrievancesPage() {
  const { user, profile } = useUser()
  const [grievances, setGrievances] = useState<Grievance[]>([])
  const [filteredGrievances, setFilteredGrievances] = useState<Grievance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null)
  const [response, setResponse] = useState("")
  const [newStatus, setNewStatus] = useState<string>("")
  const [responding, setResponding] = useState(false)
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (profile?.id) {
      loadGrievances()
    }
  }, [profile])

  useEffect(() => {
    filterGrievances()
  }, [grievances, statusFilter, categoryFilter, searchQuery])

  const loadGrievances = async () => {
    if (!profile?.id) return
    
    try {
      setLoading(true)
      const result = await getFacultyGrievances(profile.id)
      
      if (result.success) {
        setGrievances(result.data || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to load grievances",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error loading grievances:", error)
      toast({
        title: "Error", 
        description: "Failed to load grievances",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filterGrievances = () => {
    let filtered = [...grievances]

    if (statusFilter !== "all") {
      filtered = filtered.filter(g => g.status === statusFilter)
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(g => g.category === categoryFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(g => 
        g.title.toLowerCase().includes(query) ||
        g.description.toLowerCase().includes(query) ||
        g.grievance_id.toLowerCase().includes(query) ||
        g.student?.name.toLowerCase().includes(query)
      )
    }

    setFilteredGrievances(filtered)
  }

  const handleResponse = async () => {
    if (!selectedGrievance || !response.trim() || !profile?.id) return

    try {
      setResponding(true)
      const result = await addFacultyResponse(
        selectedGrievance.id,
        profile.id,
        response.trim(),
        newStatus as any
      )

      if (result.success) {
        toast({
          title: "Success",
          description: "Response added successfully"
        })
        setResponse("")
        setNewStatus("")
        setSelectedGrievance(null)
        loadGrievances()
      } else {
        toast({
          title: "Error",
          description: result.error?.message || "Failed to add response",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error adding response:", error)
      toast({
        title: "Error",
        description: "Failed to add response",
        variant: "destructive"
      })
    } finally {
      setResponding(false)
    }
  }

  const getUniqueCategories = () => {
    const categories = [...new Set(grievances.map(g => g.category))]
    return categories.filter(Boolean)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Department Grievances</h1>
          <p className="text-gray-600">View and respond to grievances from your department</p>
        </div>
        <div className="text-sm text-gray-500">
          {profile?.department && (
            <Badge variant="outline">{profile.department} Department</Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search grievances..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {getUniqueCategories().map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="text-sm text-gray-500 flex items-center">
              {filteredGrievances.length} of {grievances.length} grievances
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grievances List */}
      <div className="grid gap-4">
        {filteredGrievances.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No grievances found</h3>
              <p className="text-gray-500">
                {grievances.length === 0 
                  ? "No grievances from your department yet"
                  : "No grievances match your current filters"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredGrievances.map((grievance) => {
            const StatusIcon = statusIcons[grievance.status]
            return (
              <Card key={grievance.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{grievance.title}</CardTitle>
                      <CardDescription>
                        ID: {grievance.grievance_id} • 
                        Student: {grievance.student?.name} • 
                        {grievance.category}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[grievance.status]}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {grievance.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4 line-clamp-3">{grievance.description}</p>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      Created: {new Date(grievance.created_at).toLocaleDateString()}
                      {grievance.resolved_at && (
                        <span className="ml-4">
                          Resolved: {new Date(grievance.resolved_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    
                    <Button 
                      onClick={() => setSelectedGrievance(grievance)}
                      variant="outline"
                      size="sm"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Respond
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Response Modal */}
      {selectedGrievance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Respond to Grievance</CardTitle>
              <CardDescription>
                {selectedGrievance.grievance_id} - {selectedGrievance.title}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Original Grievance:</h4>
                <p className="text-gray-700">{selectedGrievance.description}</p>
                <div className="mt-2 text-sm text-gray-500">
                  By: {selectedGrievance.student?.name} • 
                  Category: {selectedGrievance.category} • 
                  Status: {selectedGrievance.status}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Your Response</label>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Enter your response to this grievance..."
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Update Status (Optional)</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Keep current status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Keep current status</SelectItem>
                    <SelectItem value="in_review">Mark as In Review</SelectItem>
                    <SelectItem value="resolved">Mark as Resolved</SelectItem>
                    <SelectItem value="rejected">Mark as Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedGrievance(null)
                    setResponse("")
                    setNewStatus("")
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleResponse}
                  disabled={!response.trim() || responding}
                >
                  {responding ? "Adding Response..." : "Add Response"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
