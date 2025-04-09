import { SalesReportPanel } from "@/components/reports/sales-report-panel"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function SalesReportPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes de ventas</h1>
          <p className="text-muted-foreground">Genera reportes detallados de ventas por período</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/sales">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a ventas
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-2">
          <SalesReportPanel />
        </div>

        <div>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-lg border border-emerald-100">
            <h3 className="font-medium text-lg text-emerald-800 mb-4">Información sobre reportes</h3>

            <div className="space-y-4 text-sm">
              <div className="bg-white p-3 rounded-md border border-emerald-100">
                <h4 className="font-medium text-emerald-700 mb-1">Reporte diario</h4>
                <p className="text-gray-600">Genera un reporte detallado de las ventas del día actual.</p>
              </div>

              <div className="bg-white p-3 rounded-md border border-emerald-100">
                <h4 className="font-medium text-emerald-700 mb-1">Reporte semanal</h4>
                <p className="text-gray-600">
                  Genera un reporte de ventas de la semana actual, desde el lunes hasta el domingo.
                </p>
              </div>

              <div className="bg-white p-3 rounded-md border border-emerald-100">
                <h4 className="font-medium text-emerald-700 mb-1">Reporte mensual</h4>
                <p className="text-gray-600">Genera un reporte completo de todas las ventas del mes actual.</p>
              </div>

              <div className="bg-white p-3 rounded-md border border-emerald-100">
                <h4 className="font-medium text-emerald-700 mb-1">Reporte personalizado</h4>
                <p className="text-gray-600">
                  Selecciona un rango de fechas específico para generar un reporte a medida.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
