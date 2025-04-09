import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { OrderEditForm } from "@/components/orders/order-edit-form"

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
        products (id, name, category, cost_price),
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

async function getProducts() {
  const supabase = createClient()

  // Get all products
  const { data: products, error } = await supabase.from("products").select("id, name, cost_price").order("name")

  if (error) {
    console.error("Error fetching products:", error)
    return []
  }

  // Get sizes for each product
  const productsWithSizes = await Promise.all(
    products.map(async (product) => {
      const { data: sizesData, error: sizesError } = await supabase.from("sizes").select("id, name").order("name")

      if (sizesError) {
        console.error("Error fetching sizes:", sizesError)
        return {
          ...product,
          sizes: [],
        }
      }

      return {
        ...product,
        sizes: sizesData,
      }
    }),
  )

  return productsWithSizes
}

export default async function EditOrderPage({ params }: { params: { id: string } }) {
  const order = await getOrder(params.id)
  const products = await getProducts()

  if (!order) {
    notFound()
  }

  if (order.status === "completed") {
    // No se pueden editar pedidos completados
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Pedido</h1>
          <p className="text-muted-foreground">No se pueden editar pedidos que ya han sido recibidos</p>
        </div>

        <div className="flex justify-center p-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Pedido ya recibido</h2>
            <p className="text-gray-500 mb-4">Este pedido ya ha sido marcado como recibido y no puede ser editado.</p>
            <a href="/orders" className="text-emerald-600 hover:underline">
              Volver a la lista de pedidos
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editar Pedido</h1>
        <p className="text-muted-foreground">Modifica los detalles del pedido</p>
      </div>

      <OrderEditForm order={order} products={products} />
    </div>
  )
}
