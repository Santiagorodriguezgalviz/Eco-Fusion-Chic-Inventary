import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ProductHistory } from "@/components/inventory/product-history"

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  // Obtener detalles del producto
  const { data: product, error } = await supabase.from("products").select("*").eq("id", params.id).single()

  if (error || !product) {
    notFound()
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Aquí irían otros componentes de detalles del producto */}

        {/* Historial de cambios */}
        <ProductHistory productId={product.id} productName={product.name} />
      </div>
    </div>
  )
}
