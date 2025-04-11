import { createClient } from "@/lib/supabase/server"
import { ProductTable } from "@/components/inventory/product-table"

export const dynamic = "force-dynamic"

async function getProducts() {
  const supabase = createClient()

  // Get all products
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, category, price, cost_price, stock") // Add stock to the query
    .order("name")

  if (error) {
    console.error("Error fetching products:", error)
    return []
  }

  // Get inventory for each product
  const productsWithInventory = await Promise.all(
    products.map(async (product) => {
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("inventory")
        .select("stock, sizes(name)")
        .eq("product_id", product.id)

      if (inventoryError) {
        console.error("Error fetching inventory:", inventoryError)
        return {
          ...product,
          inventory: [],
        }
      }

      // Solución: Verificar si sizes existe y manejarlo correctamente
      const inventory = inventoryData.map((item: any) => ({
        size: item.sizes?.name || 'Sin talla',
        stock: item.stock,
      }))

      return {
        ...product,
        inventory,
      }
    }),
  )

  return productsWithInventory
}

export default async function InventoryPage() {
  const products = await getProducts()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
        <p className="text-muted-foreground">Gestiona los productos y su stock</p>
      </div>

      <ProductTable initialProducts={products} />
    </div>
  )
}
