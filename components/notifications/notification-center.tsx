"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, Check, Trash2, ShoppingCart, Package, AlertTriangle } from "lucide-react"
import { useNotifications } from "@/contexts/notification-context"
import type { Notification, NotificationType } from "@/lib/services/notification-service"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"all" | "inventory" | "sales" | "orders">("all")
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications } =
    useNotifications()
  const notificationRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Cerrar el panel de notificaciones al hacer clic fuera de él
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Filtrar notificaciones según la pestaña activa
  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === "all") return true
    if (activeTab === "inventory") return notification.type === "stock_low"
    if (activeTab === "sales") return notification.type === "important_sale"
    if (activeTab === "orders") return notification.type === "order_delayed" || notification.type === "order_update"
    return true
  })

  // Obtener el icono según el tipo de notificación
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "stock_low":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />
      case "important_sale":
        return <ShoppingCart className="h-5 w-5 text-green-500" />
      case "order_delayed":
      case "order_update":
        return <Package className="h-5 w-5 text-blue-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  // Manejar clic en una notificación
  const handleNotificationClick = (notification: Notification) => {
    // Marcar como leída
    if (!notification.is_read) {
      markAsRead(notification.id)
    }

    // Navegar al enlace si existe
    if (notification.link) {
      router.push(notification.link)
      setIsOpen(false)
    }
  }

  // Renderizar una notificación
  const renderNotification = (notification: Notification) => {
    return (
      <div
        key={notification.id}
        className={`mb-2 rounded-lg p-3 transition-all duration-200 hover:bg-gray-100 ${
          notification.is_read ? "bg-white" : "bg-blue-50"
        }`}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className="flex items-start gap-3">
          <div className="mt-1 flex-shrink-0">{getNotificationIcon(notification.type)}</div>
          <div className="flex-1">
            <h4 className="text-sm font-medium">{notification.title}</h4>
            <p className="text-xs text-gray-600">{notification.message}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {new Date(notification.created_at).toLocaleDateString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {!notification.is_read && (
                <Badge variant="default" className="ml-2 bg-blue-500 px-1.5 py-0 text-[10px]">
                  Nuevo
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Renderizar esqueletos de carga
  const renderSkeletons = () => {
    return Array(5)
      .fill(0)
      .map((_, index) => (
        <div key={index} className="mb-2 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <div className="flex-1">
              <Skeleton className="mb-2 h-4 w-3/4" />
              <Skeleton className="mb-2 h-3 w-full" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        </div>
      ))
  }

  return (
    <div className="relative" ref={notificationRef}>
      {/* Botón de notificaciones */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-1 text-gray-700 hover:bg-gray-200 focus:outline-none"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
          {/* Encabezado */}
          <div className="flex items-center justify-between border-b p-3">
            <h3 className="text-lg font-semibold">Notificaciones</h3>
            <div className="flex space-x-1">
              <button
                onClick={() => markAllAsRead()}
                className="rounded p-1 text-gray-500 hover:bg-gray-100"
                title="Marcar todas como leídas"
              >
                <Check className="h-5 w-5" />
              </button>
              <button
                onClick={() => deleteAllNotifications()}
                className="rounded p-1 text-gray-500 hover:bg-gray-100"
                title="Eliminar todas"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Pestañas */}
          <div className="flex border-b">
            <button
              className={`flex-1 py-2 text-sm font-medium ${
                activeTab === "all" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"
              }`}
              onClick={() => setActiveTab("all")}
            >
              Todas
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium ${
                activeTab === "inventory" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"
              }`}
              onClick={() => setActiveTab("inventory")}
            >
              Inventario
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium ${
                activeTab === "sales" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"
              }`}
              onClick={() => setActiveTab("sales")}
            >
              Ventas
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium ${
                activeTab === "orders" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"
              }`}
              onClick={() => setActiveTab("orders")}
            >
              Pedidos
            </button>
          </div>

          {/* Lista de notificaciones */}
          <div className="max-h-80 overflow-y-auto p-3">
            {loading ? (
              renderSkeletons()
            ) : filteredNotifications.length > 0 ? (
              filteredNotifications.map(renderNotification)
            ) : (
              <div className="py-6 text-center text-sm text-gray-500">No hay notificaciones</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
