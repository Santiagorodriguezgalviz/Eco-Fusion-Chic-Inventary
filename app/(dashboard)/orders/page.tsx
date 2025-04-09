import { createClient } from "@/lib/supabase/server"
import { OrdersTable } from "@/components/orders/orders-table"

export const dynamic = "force-dynamic"

async function getOrders(searchParams: { filter?: string }) {
  const supabase = createClient()
  const filter = searchParams.filter || "all"

  try {
    // Aplicar filtro de estado si es necesario
    let query = supabase.from("orders").select("id, reference, total_cost, status, created_at, arrival_date")

    if (filter === "pending") {
      query = query.eq("status", "pending")
    } else if (filter === "completed") {
      query = query.eq("status", "completed")
    }

    const { data: orders, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching orders:", error)
      return []
    }

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const { data: itemsData, error: itemsError } = await supabase
          .from("order_items")
          .select(`
            product_id,
            size_id,
            quantity, 
            cost_price, 
            subtotal,
            products (name),
            sizes (name)
          `)
          .eq("order_id", order.id)

        if (itemsError) {
          console.error("Error fetching order items:", itemsError)
          return {
            ...order,
            items: [],
          }
        }

        const items = itemsData.map((item) => ({
          product_id: item.product_id,
          size_id: item.size_id,
          product_name: item.products.name,
          size_name: item.sizes.name,
          quantity: item.quantity,
          cost_price: item.cost_price,
          subtotal: item.subtotal,
        }))

        return {
          ...order,
          items,
        }
      }),
    )

    return ordersWithItems
  } catch (error) {
    console.error("Error in getOrders:", error)
    return []
  }
}

export default async function OrdersPage({ searchParams }: { searchParams: { filter?: string } }) {
  const orders = await getOrders(searchParams)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
        <p className="text-muted-foreground">Gestiona los pedidos a proveedores</p>
      </div>

      <OrdersTable initialOrders={orders} initialFilter={searchParams.filter || "all"} />
    </div>
  )
}
