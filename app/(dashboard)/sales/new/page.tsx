import { createClient } from "@/lib/supabase/server"
import { SaleForm } from "@/components/sales/sale-form"

export const dynamic = "force-dynamic"

async function getProductsWithSizes() {
  const supabase = createClient()

  // Get all products
  const { data: products, error } = await supabase.from("products").select("id, name, price").order("name")

  if (error) {
    console.error("Error fetching products:", error)
    return []
  }

  // Get inventory for each product
  const productsWithSizes = await Promise.all(
    products.map(async (product) => {
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("inventory")
        .select("size_id, stock, sizes(id, name)")
        .eq("product_id", product.id)

      if (inventoryError) {
        console.error("Error fetching inventory:", inventoryError)
        return {
          ...product,
          sizes: [],
        }
      }

      const sizes = inventoryData.map((item) => ({
        id: item.size_id,
        name: item.sizes.name,
        stock: item.stock,
      }))

      return {
        ...product,
        sizes,
      }
    }),
  )

  return productsWithSizes
}

async function getCustomers() {
  const supabase = createClient()

  const { data, error } = await supabase.from("customers").select("id, name, identification, phone").order("name")

  if (error) {
    console.error("Error fetching customers:", error)
    return []
  }

  return data
}

export default async function NewSalePage() {
  const products = await getProductsWithSizes()
  const customers = await getCustomers()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nueva Venta</h1>
        <p className="text-muted-foreground">Registra una nueva venta</p>
      </div>

      <SaleForm products={products} customers={customers} />
    </div>
  )
}
