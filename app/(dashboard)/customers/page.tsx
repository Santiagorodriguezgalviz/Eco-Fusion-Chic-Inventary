import { createClient } from "@/lib/supabase/server"
import { CustomersTable } from "@/components/customers/customers-table"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, User } from "lucide-react" // Import User icon

export const dynamic = "force-dynamic"

async function getCustomers() {
  const supabase = createClient()

  const { data, error } = await supabase.from("customers").select("*").order("name")

  if (error) {
    console.error("Error fetching customers:", error)
    return []
  }

  return data
}

export default async function CustomersPage() {
  const customers = await getCustomers()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gestiona los clientes de tu tienda</p>
        </div>
      
      </div>

      <CustomersTable customers={customers} />
    </div>
  )
}
