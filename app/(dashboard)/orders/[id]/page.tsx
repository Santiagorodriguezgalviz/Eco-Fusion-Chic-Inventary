import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { OrderDetails } from "@/components/orders/order-details"

export const dynamic = "force-dynamic"

async function getOrder(id: string) {
  const supabase = createClient()

  try {
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, reference, total_cost, status, created_at, arrival_date")
      .eq("id", id)
      .single()

    if (error) throw error

    // Get order items
    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .select(`
        id,
        product_id,
        size_id,
        quantity, 
        cost_price, 
        subtotal,
        products (id, name, category, image_url),
        sizes (id, name)
      `)
      .eq("order_id", id)

    if (itemsError) throw itemsError

    const items = itemsData.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      size_id: item.size_id,
      product_name: item.products.name,
      product_category: item.products.category,
      product_image: item.products.image_url,
      size_name: item.sizes.name,
      quantity: item.quantity,
      cost_price: item.cost_price,
      subtotal: item.subtotal,
    }))

    return {
      ...order,
      items,
    }
  } catch (error) {
    console.error("Error fetching order:", error)
    return null
  }
}

export default async function OrderDetailsPage({ params }: { params: { id: string } }) {
  const order = await getOrder(params.id)

  if (!order) {
    notFound()
  }

  return <OrderDetails order={order} />
}
