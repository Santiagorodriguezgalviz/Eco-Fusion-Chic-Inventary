import type { Metadata } from "next"
import { InventoryHistoryTable } from "@/components/inventory/inventory-history-table"

export const metadata: Metadata = {
  title: "Historial de Inventario | Eco Fusion Chic",
  description: "Historial de cambios en el inventario",
}

export default function InventoryHistoryPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Historial de Inventario</h1>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Registro de Cambios</h2>
          <p className="text-muted-foreground mb-6">
            Este registro muestra todos los cambios realizados en el inventario, incluyendo ventas, compras, ajustes y
            devoluciones.
          </p>

          <InventoryHistoryTable />
        </div>
      </div>
    </div>
  )
}
