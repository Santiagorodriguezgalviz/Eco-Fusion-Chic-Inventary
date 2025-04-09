import { createClient } from "@/lib/supabase/server"
import { ProductForm } from "@/components/inventory/product-form"

export const dynamic = "force-dynamic"

async function getSizes() {
  const supabase = createClient()

  const { data, error } = await supabase.from("sizes").select("id, name").order("name")

  if (error) {
    console.error("Error fetching sizes:", error)
    return []
  }

  return data
}

export default async function NewProductPage() {
  const sizes = await getSizes()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Producto</h1>
        <p className="text-muted-foreground">Agrega un nuevo producto al inventario</p>
      </div>

      <ProductForm sizes={sizes} />
    </div>
  )
}
