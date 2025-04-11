import { createClient } from "@/lib/supabase/server"
import { OrderEditForm } from "@/components/orders/order-edit-form"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

async function getOrder(id: string) {
  const supabase = createClient()

  try {
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, reference, total_cost, status, created_at")
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
        id,
        product_id,
        quantity, 
        cost_price, 
        subtotal,
        products (id, name, cost_price)
      `)
      .eq("order_id", id)

    if (itemsError) {
      console.error("Error fetching order items:", itemsError)
      return {
        ...order,
        items: [],
      }
    }

    // Add null checks to prevent "Cannot read properties of null" error
    const items = itemsData.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      product: item.products ? {
        id: item.products.id,
        name: item.products.name || "Unknown Product",
        cost_price: item.products.cost_price
      } : {
        id: item.product_id,
        name: "Unknown Product",
        cost_price: item.cost_price
      },
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

async function getProducts() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("products")
    .select("id, name, cost_price")
    .order("name")

  if (error) {
    console.error("Error fetching products:", error)
    return []
  }

  return data
}

export default async function EditOrderPage({ params }: { params: { id: string } }) {
  const order = await getOrder(params.id)
  const products = await getProducts()

  if (!order) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editar pedido</h1>
        <p className="text-muted-foreground">Actualiza los detalles del pedido</p>
      </div>

      <OrderEditForm order={order} products={products} />
    </div>
  )
}
