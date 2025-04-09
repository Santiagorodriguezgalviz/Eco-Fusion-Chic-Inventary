import { createClient } from "@/lib/supabase/server"
import { OrderForm } from "@/components/orders/order-form"

export const dynamic = "force-dynamic"

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

export default async function NewOrderPage() {
  const products = await getProducts()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Pedido</h1>
        <p className="text-muted-foreground">Registra un nuevo pedido a proveedores</p>
      </div>

      <OrderForm products={products} />
    </div>
  )
}
