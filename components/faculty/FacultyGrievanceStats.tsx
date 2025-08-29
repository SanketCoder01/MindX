"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card"
import { Badge } from "@/ui/badge"
import { Clock, AlertTriangle, CheckCircle, XCircle, MessageCircle, TrendingUp } from "lucide-react"
import { type Grievance } from "@/app/actions/grievance-actions"

interface FacultyGrievanceStatsProps {
  grievances: Grievance[]
}

export default function FacultyGrievanceStats({ grievances }: FacultyGrievanceStatsProps) {
  const stats = {
    total: grievances.length,
    pending: grievances.filter(g => g.status === 'pending').length,
    inReview: grievances.filter(g => g.status === 'in_review').length,
    resolved: grievances.filter(g => g.status === 'resolved').length,
    rejected: grievances.filter(g => g.status === 'rejected').length
  }

  const recentGrievances = grievances.filter(g => {
    const createdDate = new Date(g.created_at)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return createdDate >= weekAgo
  }).length

  const categories = grievances.reduce((acc, g) => {
    acc[g.category] = (acc[g.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topCategory = Object.entries(categories).sort(([,a], [,b]) => b - a)[0]

  const statCards = [
    {
      title: "Total Grievances",
      value: stats.total,
      icon: MessageCircle,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50"
    },
    {
      title: "In Review", 
      value: stats.inReview,
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "Resolved",
      value: stats.resolved,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
      
      {/* Additional Stats */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quick Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{recentGrievances}</div>
              <div className="text-sm text-gray-600">New this week</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-600">Resolution rate</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">
                {topCategory ? topCategory[0] : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">
                Top category ({topCategory ? topCategory[1] : 0} cases)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
