"use client"
import { useRealtimeSubscription } from "@/lib/supabase/realtime"
import { useCustomToast } from "@/components/ui/custom-toast"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Clock, ShoppingCart, Package, Bell } from "lucide-react"
import { ToastAction } from "@/components/ui/toast"

export function NotificationToast() {
  const { showToast } = useCustomToast()
  const router = useRouter()

  // Suscribirse a nuevas notificaciones en tiempo real
  useRealtimeSubscription({
    table: "notifications",
    event: "INSERT",
    onEvent: (payload) => {
      const notification = payload.new

      if (!notification) return

      // Determinar el icono y variante según el tipo de notificación
      let icon
      let variant: "default" | "destructive" | "success" | "warning" | null = "default"

      switch (notification.type) {
        case "stock_low":
          icon = <AlertCircle className="h-5 w-5 text-red-500" />
          variant = "destructive"
          break
        case "important_sale":
          icon = <ShoppingCart className="h-5 w-5 text-green-500" />
          variant = "success"
          break
        case "order_update":
          if (notification.priority === "high") {
            icon = <Clock className="h-5 w-5 text-amber-500" />
            variant = "warning"
          } else {
            icon = <Package className="h-5 w-5 text-blue-500" />
            variant = "default"
          }
          break
        case "system":
          icon = <CheckCircle2 className="h-5 w-5 text-blue-500" />
          variant = "default"
          break
        default:
          icon = <Bell className="h-5 w-5 text-blue-500" />
      }

      // Determinar la duración según la prioridad
      const duration = notification.priority === "high" ? 8000 : 5000

      // Solo mostrar toast para notificaciones de prioridad alta o media
      if (notification.priority === "high" || notification.priority === "medium") {
        showToast({
          title: notification.title,
          description: notification.message,
          variant: variant,
          icon: icon,
          duration: duration,
          action: notification.action_url ? (
            <ToastAction altText="Ver detalles" onClick={() => router.push(notification.action_url || "/")}>
              Ver
            </ToastAction>
          ) : undefined,
        })
      }
    },
    onError: (error) => {
      console.error("Error en la suscripción a notificaciones:", error)
      
      // Mostrar un toast de error si hay problemas con la suscripción
      showToast({
        title: "Error de conexión",
        description: "No se pudieron cargar las notificaciones en tiempo real",
        variant: "destructive",
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      })
    },
  })

  return null // Este componente no renderiza nada, solo maneja las notificaciones
}
