import { createClient } from "@/lib/supabase/server"
import { SalesTable } from "@/components/sales/sales-table"
import { getDateRange } from "@/lib/utils/date"

export const dynamic = "force-dynamic"

// Define proper types for the joined data
interface SaleItemWithProduct {
  quantity: number;
  price: number;
  subtotal: number;
  products: {
    name: string;
  };
}

async function getSales(searchParams: { filter?: string }) {
  const supabase = createClient()
  const filter = searchParams.filter || "all"

  try {
    // Aplicar filtro de fecha si es necesario
    let query = supabase.from("sales").select(`
      id, 
      invoice_number, 
      total_amount, 
      created_at,
      customers (
        id, 
        name, 
        identification, 
        phone
      )
    `)

    if (filter !== "all") {
      const { start, end } = getDateRange(filter as "day" | "week" | "month")
      query = query.gte("created_at", start).lte("created_at", end)
    }

    const { data: sales, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching sales:", error)
      return []
    }

    // Get sale items for each sale
    const salesWithItems = await Promise.all(
      sales.map(async (sale) => {
        const { data: itemsData, error: itemsError } = await supabase
          .from("sale_items")
          .select(`
            quantity, 
            price, 
            subtotal,
            products (name)
          `)
          .eq("sale_id", sale.id)

        if (itemsError) {
          console.error("Error fetching sale items:", itemsError)
          return {
            ...sale,
            // Fix: customers is an array, but we need the first item
            customer: sale.customers?.[0] || null,
            items: [],
          }
        }

        // Cast itemsData to the correct type
        const typedItemsData = itemsData as unknown as SaleItemWithProduct[];
        
        const items = typedItemsData.map((item) => ({
          product_name: item.products.name || "Producto sin nombre",
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
        }))

        return {
          ...sale,
          // Fix: customers is an array, but we need the first item
          customer: sale.customers?.[0] || null,
          items,
        }
      }),
    )

    return salesWithItems
  } catch (error) {
    console.error("Error in getSales:", error)
    return []
  }
}

export default async function SalesPage({ searchParams }: { searchParams: { filter?: string } }) {
  const sales = await getSales(searchParams)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
        <p className="text-muted-foreground">Gestiona las ventas y facturas</p>
      </div>

      <SalesTable initialSales={sales} initialFilter={searchParams.filter || "all"} />
    </div>
  )
}
