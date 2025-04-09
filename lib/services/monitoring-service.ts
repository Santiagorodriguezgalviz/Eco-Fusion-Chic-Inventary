import { createClient } from "@/lib/supabase/client"
import { notificationService } from "./notification-service"

// Umbral de stock bajo
const LOW_STOCK_THRESHOLD = 5
// Umbral para ventas importantes (en pesos)
const IMPORTANT_SALE_THRESHOLD = 500000
// Días de retraso para considerar un pedido como retrasado
const DAYS_LATE_THRESHOLD = 3

class MonitoringService {
  private supabase = createClient()

  // Monitorear productos con stock bajo
  async monitorLowStock(): Promise<void> {
    try {
      // Obtener productos con stock bajo
      const { data, error } = await this.supabase
        .from("inventory")
        .select(`
          id,
          product_id,
          size_id,
          stock,
          products(name),
          sizes(name)
        `)
        .lt("stock", LOW_STOCK_THRESHOLD)

      if (error) throw error

      // Crear notificaciones para cada producto con stock bajo
      for (const item of data || []) {
        try {
          await notificationService.createNotification({
            title: "⚠️ Stock bajo",
            message: `El producto "${item.products.name}" (talla ${item.sizes.name}) tiene un stock bajo de ${item.stock} unidades.`,
            type: "stock_low",
            related_entity_type: "product",
            related_entity_id: item.product_id,
            priority: item.stock <= 2 ? "high" : "medium",
          })
        } catch (err) {
          console.error("Error al crear notificación de stock bajo:", err)
        }
      }
    } catch (error) {
      console.error("Error monitoring low stock:", error)
    }
  }

  // Monitorear ventas importantes
  async monitorImportantSales(): Promise<void> {
    try {
      // Obtener ventas recientes importantes
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)

      const { data, error } = await this.supabase
        .from("sales")
        .select("id, invoice_number, total_amount, created_at")
        .gte("total_amount", IMPORTANT_SALE_THRESHOLD)
        .gte("created_at", oneDayAgo.toISOString())
        .order("created_at", { ascending: false })

      if (error) throw error

      // Crear notificaciones para cada venta importante
      for (const sale of data || []) {
        try {
          await notificationService.createNotification({
            title: "💰 Venta importante",
            message: `Se ha registrado una venta importante: Factura ${sale.invoice_number} por $${sale.total_amount.toLocaleString()}.`,
            type: "important_sale",
            related_entity_type: "sale",
            related_entity_id: sale.id,
            priority: "high",
          })
        } catch (err) {
          console.error("Error al crear notificación de venta importante:", err)
        }
      }
    } catch (error) {
      console.error("Error monitoring important sales:", error)
    }
  }

  // Monitorear pedidos retrasados
  async monitorDelayedOrders(): Promise<void> {
    try {
      const today = new Date()

      // Obtener pedidos que deberían haber llegado
      const { data, error } = await this.supabase
        .from("orders")
        .select("id, reference, arrival_date, status")
        .lt("arrival_date", today.toISOString())
        .not("status", "eq", "entregado")
        .not("status", "eq", "cancelado")

      if (error) throw error

      // Crear notificaciones para cada pedido retrasado
      for (const order of data || []) {
        try {
          const arrivalDate = new Date(order.arrival_date)
          const daysLate = Math.floor((today.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24))

          if (daysLate >= DAYS_LATE_THRESHOLD) {
            await notificationService.createNotification({
              title: "⏰ Pedido retrasado",
              message: `El pedido ${order.reference || `Pedido #${order.id.substring(0, 8)}`} lleva ${daysLate} días de retraso. Fecha esperada: ${new Date(order.arrival_date).toLocaleDateString("es-ES")}.`,
              type: "order_delayed",
              related_entity_type: "order",
              related_entity_id: order.id,
              priority: daysLate > 7 ? "high" : "medium",
            })
          }
        } catch (err) {
          console.error("Error al crear notificación de pedido retrasado:", err)
        }
      }
    } catch (error) {
      console.error("Error monitoring delayed orders:", error)
    }
  }

  // Ejecutar todas las monitorizaciones
  async runAllMonitors(): Promise<void> {
    try {
      await this.monitorLowStock()
      await this.monitorImportantSales()
      await this.monitorDelayedOrders()
    } catch (error) {
      console.error("Error running all monitors:", error)
    }
  }
}

// Exportar una instancia única del servicio
export const monitoringService = new MonitoringService()
