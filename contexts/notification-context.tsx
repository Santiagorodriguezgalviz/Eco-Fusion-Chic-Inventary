"use client"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { notificationService, type Notification } from "@/lib/services/notification-service"
import { useToast } from "@/components/ui/use-toast"

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
      console.log("Datos de notificaciones recibidos:", data)

      // Verificar que los datos son válidos antes de actualizar el estado
      if (Array.isArray(data)) {
        setNotifications(data)
        const unreadCount = data.filter((n) => !n.is_read).length
        setUnreadCount(unreadCount)
        console.log(`Total: ${data.length}, No leídas: ${unreadCount}`)
      } else {
        console.error("Los datos de notificaciones no son un array:", data)
        setNotifications([])
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("Error loading notifications:", error)
      setNotifications([])
      setUnreadCount(0)
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
        // Desactivar temporalmente el monitoreo automático para evitar errores repetidos
        // await monitoringService.runAllMonitors()
        console.log("Monitoreo automático desactivado temporalmente")
      } catch (error) {
        console.error("Error running monitors:", error)
      }
    }

    // Verificar condiciones al inicio
    checkConditions()

    // Configurar verificación periódica (cada 5 minutos)
    const intervalId = setInterval(checkConditions, 5 * 60 * 1000)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  // Suscribirse a nuevas notificaciones
  useEffect(() => {
    const unsubscribe = notificationService.subscribeToNotifications((newNotification) => {
      // Actualizar el estado con la nueva notificación
      setNotifications((prev) => [newNotification, ...prev])
      setUnreadCount((prev) => prev + 1)

      // Mostrar un toast para la nueva notificación
      toast({
        title: newNotification.title,
        description: newNotification.message,
        variant: "default",
      })
    })

    return () => {
      unsubscribe()
    }
  }, [toast])

  // Marcar una notificación como leída
  const markAsRead = async (id: string) => {
    const success = await notificationService.markAsRead(id)
    if (success) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }

  // Marcar todas las notificaciones como leídas
  const markAllAsRead = async () => {
    const success = await notificationService.markAllAsRead()
    if (success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    }
  }

  // Eliminar una notificación
  const deleteNotification = async (id: string) => {
    const success = await notificationService.deleteNotification(id)
    if (success) {
      const notificationToDelete = notifications.find((n) => n.id === id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      if (notificationToDelete && !notificationToDelete.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    }
  }

  // Eliminar todas las notificaciones
  const deleteAllNotifications = async () => {
    const success = await notificationService.deleteAllNotifications()
    if (success) {
      setNotifications([])
      setUnreadCount(0)
    }
  }

  // Refrescar notificaciones
  const refreshNotifications = async () => {
    await loadNotifications()
  }

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshNotifications,
  }

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}
