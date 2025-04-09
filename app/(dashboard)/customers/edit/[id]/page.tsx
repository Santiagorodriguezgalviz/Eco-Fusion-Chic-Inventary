import { createClient } from "@/lib/supabase/server"
import { CustomerForm } from "@/components/customers/customer-form"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

async function getCustomer(id: string) {
  const supabase = createClient()

  const { data, error } = await supabase.from("customers").select("*").eq("id", id).single()

  if (error) {
    console.error("Error fetching customer:", error)
    return null
  }

  return data
}

export default async function EditCustomerPage({ params }: { params: { id: string } }) {
  const customer = await getCustomer(params.id)

  if (!customer) {
    return notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editar Cliente</h1>
        <p className="text-muted-foreground">Actualiza la información del cliente</p>
      </div>

      <CustomerForm customer={customer} />
    </div>
  )
}
