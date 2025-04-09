import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils/date"

export type NotificationType =
  | "stock_low"
  | "important_sale"
  | "system"
  | "order_update"
  | "new_customer"
  | "order_delayed"

export type EntityType = "product" | "sale" | "order" | "customer" | "system" | "inventory"

export interface Notification {
  id: string
  title: string
  message: string
  type: NotificationType
  is_read: boolean
  created_at: string
  user_id?: string | null
  link?: string | null // Usamos 'link' en lugar de 'action_url'
}

export interface NotificationCreateParams {
  title: string
  message: string
  type: NotificationType
  user_id?: string
  link?: string // Usamos 'link' en lugar de 'action_url'
}

class NotificationService {
  private supabase = createClient()

  // Crear una nueva notificación
  async createNotification(params: NotificationCreateParams): Promise<Notification | null> {
    try {
      // Preparamos los datos según la estructura real de la tabla
      const notificationData = {
        title: params.title,
        message: params.message,
        type: params.type,
        user_id: params.user_id || null,
        link: params.link || null,
      }

      const { data, error } = await this.supabase.from("notifications").insert(notificationData).select("*").single()

      if (error) {
        console.error("Error al insertar notificación:", error)
        throw error
      }

      return data
    } catch (error) {
      console.error("Error creating notification:", error)
      return null
    }
  }

  // Obtener todas las notificaciones, con opción de filtrar por leídas/no leídas
  async getNotifications(options?: { onlyUnread?: boolean; limit?: number }): Promise<Notification[]> {
    try {
      let query = this.supabase.from("notifications").select("*").order("created_at", { ascending: false })

      if (options?.onlyUnread) {
        query = query.eq("is_read", false)
      }

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error en la consulta de notificaciones:", error)
        throw error
      }

      // Verificar y transformar los datos para asegurar que son compatibles
      if (data && Array.isArray(data)) {
        console.log(`Notificaciones recuperadas: ${data.length}`)

        // Asegurarse de que cada notificación tiene los campos necesarios
        return data.map((notification) => ({
          id: notification.id,
          title: notification.title || "Sin título",
          message: notification.message || "",
          type: notification.type || "system",
          is_read: !!notification.is_read,
          created_at: notification.created_at || new Date().toISOString(),
          user_id: notification.user_id,
          link: notification.link,
        }))
      }

      console.warn("No se encontraron notificaciones o el formato es incorrecto")
      return []
    } catch (error) {
      console.error("Error fetching notifications:", error)
      return []
    }
  }

  // Marcar una notificación como leída
  async markAsRead(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.from("notifications").update({ is_read: true }).eq("id", id)

      if (error) throw error
      return true
    } catch (error) {
      console.error("Error marking notification as read:", error)
      return false
    }
  }

  // Marcar todas las notificaciones como leídas
  async markAllAsRead(): Promise<boolean> {
    try {
      const { error } = await this.supabase.from("notifications").update({ is_read: true }).eq("is_read", false)

      if (error) throw error
      return true
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      return false
    }
  }

  // Eliminar una notificación
  async deleteNotification(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.from("notifications").delete().eq("id", id)

      if (error) throw error
      return true
    } catch (error) {
      console.error("Error deleting notification:", error)
      return false
    }
  }

  // Eliminar todas las notificaciones
  async deleteAllNotifications(): Promise<boolean> {
    try {
      // En lugar de usar neq con "placeholder", simplemente eliminamos todas las filas
      const { error } = await this.supabase
        .from("notifications")
        .delete()
        .gte("id", "00000000-0000-0000-0000-000000000000")

      if (error) throw error
      return true
    } catch (error) {
      console.error("Error deleting all notifications:", error)
      return false
    }
  }

  // Crear notificación de stock bajo
  async createLowStockNotification(
    productId: string,
    productName: string,
    size: string,
    stock: number,
  ): Promise<Notification | null> {
    return this.createNotification({
      title: "⚠️ Stock bajo",
      message: `El producto "${productName}" (talla ${size}) tiene un stock bajo de ${stock} unidades.`,
      type: "stock_low",
      link: `/inventory/${productId}`,
    })
  }

  // Crear notificación de venta importante (por ejemplo, ventas mayores a cierto monto)
  async createImportantSaleNotification(
    saleId: string,
    invoiceNumber: string,
    amount: number,
    threshold = 500000,
  ): Promise<Notification | null> {
    if (amount < threshold) return null

    return this.createNotification({
      title: "💰 Venta importante",
      message: `Se ha registrado una venta importante: Factura ${invoiceNumber} por ${formatCurrency(amount)}.`,
      type: "important_sale",
      link: `/sales/${saleId}`,
    })
  }

  // Crear notificación de pedido retrasado
  async createDelayedOrderNotification(
    orderId: string,
    reference: string,
    expectedDate: string,
    daysLate: number,
  ): Promise<Notification | null> {
    return this.createNotification({
      title: "⏰ Pedido retrasado",
      message: `El pedido ${reference} lleva ${daysLate} días de retraso. Fecha esperada: ${new Date(expectedDate).toLocaleDateString("es-ES")}.`,
      type: "order_delayed",
      link: `/orders/${orderId}`,
    })
  }

  // Suscribirse a cambios en tiempo real de notificaciones
  subscribeToNotifications(callback: (notification: Notification) => void): () => void {
    const subscription = this.supabase
      .channel("notifications-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          callback(payload.new as Notification)
        },
      )
      .subscribe()

    // Retornar función para cancelar la suscripción
    return () => {
      subscription.unsubscribe()
    }
  }
}

// Exportar una instancia única del servicio
export const notificationService = new NotificationService()
