"use client"

import { useState, useEffect } from "react"
import { Bell, X, Check, AlertTriangle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"

export type NotificationType = "info" | "success" | "warning" | "error"

export interface Notification {
  id: string
  title: string
  message: string
  type: NotificationType
  timestamp: Date
  read: boolean
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { toast } = useToast()

  // Cargar notificaciones del localStorage al iniciar
  useEffect(() => {
    try {
      const savedNotifications = localStorage.getItem("notifications")
      if (savedNotifications) {
        const parsed = JSON.parse(savedNotifications)
        // Convertir strings de fecha a objetos Date
        const withDates = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }))
        setNotifications(withDates)
      }
    } catch (error) {
      console.error("Error loading notifications:", error)
    }
  }, [])

  // Guardar notificaciones en localStorage cuando cambien
  useEffect(() => {
    try {
      localStorage.setItem("notifications", JSON.stringify(notifications))
    } catch (error) {
      console.error("Error saving notifications:", error)
    }
  }, [notifications])

  const addNotification = (title: string, message: string, type: NotificationType = "info") => {
    const newNotification: Notification = {
      id: Date.now().toString(),
      title,
      message,
      type,
      timestamp: new Date(),
      read: false,
    }

    setNotifications((prev) => [newNotification, ...prev])

    // Mostrar toast
    toast({
      title,
      description: message,
      icon: getNotificationIcon(type),
    })

    return newNotification.id
  }

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const clearAllNotifications = () => {
    setNotifications([])
  }

  const getUnreadCount = () => {
    return notifications.filter((n) => !n.read).length
  }

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    getUnreadCount,
  }
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "success":
      return (
        <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="h-4 w-4 text-green-600" />
        </div>
      )
    case "error":
      return (
        <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center">
          <X className="h-4 w-4 text-red-600" />
        </div>
      )
    case "warning":
      return (
        <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        </div>
      )
    case "info":
    default:
      return (
        <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
          <Info className="h-4 w-4 text-blue-600" />
        </div>
      )
  }
}

export function NotificationsDropdown() {
  const { notifications, markAsRead, markAllAsRead, removeNotification, clearAllNotifications, getUnreadCount } =
    useNotifications()

  const unreadCount = getUnreadCount()

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "Ahora mismo"
    if (diffMins < 60) return `Hace ${diffMins} minutos`
    if (diffHours < 24) return `Hace ${diffHours} horas`
    if (diffDays === 1) return "Ayer"
    return date.toLocaleDateString()
  }

  const getTypeStyles = (type: NotificationType) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-100"
      case "error":
        return "bg-red-50 border-red-100"
      case "warning":
        return "bg-amber-50 border-amber-100"
      case "info":
      default:
        return "bg-blue-50 border-blue-100"
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-medium text-white">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">Notificaciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
          <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
          {notifications.length > 0 && (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={markAllAsRead}>
                Marcar todo como leído
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-red-600 hover:text-red-700"
                onClick={clearAllNotifications}
              >
                Borrar todo
              </Button>
            </div>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Bell className="mb-2 h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-500">No hay notificaciones</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`relative flex items-start gap-4 border-l-2 p-3 hover:bg-gray-50 ${
                  notification.read ? "border-transparent" : getTypeStyles(notification.type)
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex-shrink-0">{getNotificationIcon(notification.type)}</div>
                <div className="grid gap-1 pr-8">
                  <p className="text-sm font-medium">{notification.title}</p>
                  <p className="text-xs text-gray-500">{notification.message}</p>
                  <p className="text-xs text-gray-500">{formatTimestamp(notification.timestamp)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity hover:bg-gray-200 group-hover:opacity-100 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeNotification(notification.id)
                  }}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Eliminar</span>
                </Button>
              </div>
            ))
          )}
        </div>
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button variant="outline" size="sm" className="w-full" onClick={markAllAsRead}>
                Ver todas las notificaciones
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
