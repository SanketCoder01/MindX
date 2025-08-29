"use client"

import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, Loader2, AlertTriangle } from "lucide-react"
import { useRealtime } from "./RealtimeProvider"

export function RealtimeStatus() {
  const { isConnected, subscriptionCount, connectionStatus } = useRealtime()

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-3 w-3" />
      case 'connecting':
        return <Loader2 className="h-3 w-3 animate-spin" />
      case 'error':
        return <AlertTriangle className="h-3 w-3" />
      default:
        return <WifiOff className="h-3 w-3" />
    }
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'connecting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return `Live (${subscriptionCount})`
      case 'connecting':
        return 'Connecting...'
      case 'error':
        return 'Error'
      default:
        return 'Offline'
    }
  }

  return (
    <Badge variant="outline" className={`text-xs ${getStatusColor()} flex items-center gap-1`}>
      {getStatusIcon()}
      {getStatusText()}
    </Badge>
  )
}
