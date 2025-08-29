"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card"
import { Badge } from "@/ui/badge"
import { Button } from "@/ui/button"
import { MessageCircle, Clock, CheckCircle, XCircle, AlertTriangle, User, Calendar, Tag } from "lucide-react"
import { type Grievance } from "@/app/actions/grievance-actions"

interface FacultyGrievanceCardProps {
  grievance: Grievance
  onRespond: (grievance: Grievance) => void
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  in_review: "bg-blue-100 text-blue-800 border-blue-200", 
  resolved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200"
}

const statusIcons = {
  pending: Clock,
  in_review: AlertTriangle,
  resolved: CheckCircle,
  rejected: XCircle
}

const priorityColors = {
  high: "bg-red-50 border-red-200",
  medium: "bg-yellow-50 border-yellow-200", 
  low: "bg-green-50 border-green-200"
}

export default function FacultyGrievanceCard({ grievance, onRespond }: FacultyGrievanceCardProps) {
  const StatusIcon = statusIcons[grievance.status]
  const isResolved = grievance.status === 'resolved'
  const isRejected = grievance.status === 'rejected'
  
  return (
    <Card className={`hover:shadow-md transition-all duration-200 ${
      grievance.status === 'pending' ? 'border-l-4 border-l-yellow-500' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-semibold">{grievance.title}</CardTitle>
              {grievance.is_anonymous && (
                <Badge variant="secondary" className="text-xs">Anonymous</Badge>
              )}
            </div>
            <CardDescription className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {grievance.grievance_id}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {grievance.is_anonymous ? 'Anonymous Student' : grievance.student?.name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(grievance.created_at).toLocaleDateString()}
              </span>
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={statusColors[grievance.status]}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {grievance.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {grievance.category}
            </Badge>
            {grievance.against && (
              <Badge variant="outline" className="text-xs">
                Against: {grievance.against}
              </Badge>
            )}
          </div>
          
          <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">
            {grievance.description}
          </p>
        </div>

        {grievance.document_urls && grievance.document_urls.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>📎 {grievance.document_urls.length} document(s) attached</span>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t">
          <div className="text-xs text-gray-500 space-y-1">
            <div>Created: {new Date(grievance.created_at).toLocaleString()}</div>
            {grievance.updated_at !== grievance.created_at && (
              <div>Updated: {new Date(grievance.updated_at).toLocaleString()}</div>
            )}
            {grievance.resolved_at && (
              <div className="text-green-600">
                Resolved: {new Date(grievance.resolved_at).toLocaleString()}
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => onRespond(grievance)}
              variant={isResolved || isRejected ? "outline" : "default"}
              size="sm"
              className="flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              {isResolved || isRejected ? 'View Details' : 'Respond'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
