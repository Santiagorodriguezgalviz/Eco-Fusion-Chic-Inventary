import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ExpensesTable } from "@/components/expenses/expenses-table"
import { createClient } from "@/lib/supabase/server"
import { getDateRange } from "@/lib/utils/date"

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = createClient()
  
  // Get filter from search params or default to "all"
  const filter = searchParams.filter || "all"
  
  // Build the query
  let query = supabase
    .from("expenses")
    .select('*')
  
  // Apply date filters if needed
  if (filter !== "all") {
    const { start, end } = getDateRange(filter as "day" | "week" | "month")
    query = query.gte("created_at", start).lte("created_at", end)
  }
  
  // Execute the query
  const { data, error } = await query.order("created_at", { ascending: false })
  
  if (error) {
    console.error("Error fetching expenses:", error)
    return []
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gastos</h1>
          <p className="text-muted-foreground">Gestiona los gastos y egresos del negocio</p>
        </div>
        <Link href="/expenses/new">
        </Link>
      </div>
      <ExpensesTable initialExpenses={data || []} initialFilter={filter as string} />
    </div>
  )
}