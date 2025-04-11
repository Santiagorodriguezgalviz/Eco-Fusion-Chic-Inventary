import { createClient } from "@/lib/supabase/server"
import { SaleForm } from "@/components/sales/sale-form"

export const dynamic = "force-dynamic"

async function getProducts() {
  const supabase = createClient()

  // Get all products with stock
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, price, stock")
    .order("name")

  if (error) {
    console.error("Error fetching products:", error)
    return []
  }

  return products
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
  const products = await getProducts()
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
