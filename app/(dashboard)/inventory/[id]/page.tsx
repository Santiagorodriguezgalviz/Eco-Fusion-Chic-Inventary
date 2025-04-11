import { createClient } from "@/lib/supabase/server"
import { ProductForm } from "@/components/inventory/product-form"
import { notFound } from "next/navigation"
import { ProductHistory } from "@/components/inventory/product-history"

export const dynamic = "force-dynamic"

async function getProductData(id: string) {
  const supabase = createClient()

  // Get product details
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single()

  if (productError) {
    console.error("Error fetching product:", productError)
    return null
  }

  // Get sizes for the form
  const { data: sizes, error: sizesError } = await supabase
    .from("sizes")
    .select("id, name")
    .order("name")

  if (sizesError) {
    console.error("Error fetching sizes:", sizesError)
    return { product, sizes: [] }
  }

  // Get inventory for this product
  const { data: inventory, error: inventoryError } = await supabase
    .from("inventory")
    .select("id, size_id, stock, sizes(name)")
    .eq("product_id", id)

  if (inventoryError) {
    console.error("Error fetching inventory:", inventoryError)
    return { product, sizes, inventory: [] }
  }

  return { product, sizes, inventory }
}

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const data = await getProductData(params.id)

  if (!data || !data.product) {
    notFound()
  }

  // Check if we're in edit mode (can be determined by a query parameter or other means)
  // For now, we'll just show the product details
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{data.product.name}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Product form for editing */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Editar Producto</h2>
            <p className="text-muted-foreground">Actualiza la información del producto</p>
          </div>

          <ProductForm 
            product={data.product} 
            sizes={data.sizes} 
            existingInventory={data.inventory} 
            isEditing={true} 
          />
        </div>

        {/* Historial de cambios */}
        <ProductHistory productId={data.product.id} productName={data.product.name} />
      </div>
    </div>
  )
}
