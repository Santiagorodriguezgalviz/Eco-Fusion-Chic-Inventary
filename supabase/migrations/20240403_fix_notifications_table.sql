"use client"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { notificationService, type Notification } from "@/lib/services/notification-service"
import { useToast } from "@/components/ui/use-toast"
import { monitoringService } from "@/lib/services/monitoring-service"

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  deleteAllNotifications: () => Promise<void>
  refreshNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Cargar notificaciones iniciales
  const loadNotifications = async () => {
    setLoading(true)
    try {
      const data = await notificationService.getNotifications()
      setNotifications(data)
      setUnreadCount(data.filter((n) => !n.is_read).length)
    } catch (error) {
      console.error("Error loading notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  // Cargar notificaciones al montar el componente
  useEffect(() => {
    loadNotifications()

    // Ejecutar monitores para verificar condiciones que generan notificaciones
    const checkConditions = async () => {
      try {
        await monitoringService.runAllMonitors()
      } catch (error) {
        console.error("Error running monitors:", error)
      }
    }

    // Verifi
