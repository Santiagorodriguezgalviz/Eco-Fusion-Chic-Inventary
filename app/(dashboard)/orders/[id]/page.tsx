import { createClient } from "@/lib/supabase/server"
import { formatCurrency, formatDateTime } from "@/lib/utils/date"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, FileText } from "lucide-react"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

async function getOrder(id: string) {
  const supabase = createClient()

  try {
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, reference, total_cost, status, created_at, arrival_date")
      .eq("id", id)
      .single()

    if (error || !order) {
      console.error("Error fetching order:", error)
      return null
    }

    // Get order items
    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .select(`
        product_id,
        quantity, 
        cost_price, 
        subtotal,
        products (name)
      `)
      .eq("order_id", id)

    if (itemsError) {
      console.error("Error fetching order items:", itemsError)
      return {
        ...order,
        items: [],
      }
    }

    // Add null check for products to prevent "Cannot read properties of null" error
    const items = itemsData.map((item) => ({
      product_id: item.product_id,
      product_name: item.products?.name || "Producto desconocido", // Add fallback
      quantity: item.quantity,
      cost_price: item.cost_price,
      subtotal: item.subtotal,
    }))

    return {
      ...order,
      items,
    }
  } catch (error) {
    console.error("Error in getOrder:", error)
    return null
  }
}

export default async function OrderDetailsPage({ params }: { params: { id: string } }) {
  const order = await getOrder(params.id)

  if (!order) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/orders" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a pedidos
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mt-2">
            Pedido {order.reference || <span className="text-muted-foreground">Sin referencia</span>}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/orders/pdf/${order.id}`} target="_blank">
              <FileText className="mr-2 h-4 w-4" />
              Ver PDF
            </Link>
          </Button>
          {order.status === "pending" && (
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
              <Link href={`/orders/edit/${order.id}`}>Editar pedido</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Detalles del pedido</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estado</p>
                <p className="text-sm font-medium">
                  {order.status === "pending" ? "Pendiente" : "Recibido"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha de creación</p>
                <p className="text-sm font-medium">{formatDateTime(order.created_at)}</p>
              </div>
              {order.arrival_date && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha de recepción</p>
                  <p className="text-sm font-medium">{formatDateTime(order.arrival_date)}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-sm font-medium">{formatCurrency(order.total_cost)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Productos</h3>
            <div className="space-y-4">
              {order.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay productos en este pedido</p>
              ) : (
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} x {formatCurrency(item.cost_price)}
                        </p>
                      </div>
                      <p className="font-medium">{formatCurrency(item.subtotal)}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center pt-4 border-t">
                <p className="font-semibold">Total</p>
                <p className="font-semibold">{formatCurrency(order.total_cost)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
