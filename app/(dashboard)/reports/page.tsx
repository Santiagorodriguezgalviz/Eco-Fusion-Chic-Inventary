import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, BarChart2, Package } from "lucide-react"
import Link from "next/link"

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Descargar reportes</h1>
        <p className="text-muted-foreground">Genera y descarga reportes de ventas, inventario y pedidos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Reporte de ventas */}
        <Card className="overflow-hidden border-emerald-100 hover:shadow-md transition-all">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-emerald-800">Reporte de ventas</CardTitle>
                <CardDescription className="text-emerald-600">
                  Genera un reporte detallado de ventas por período
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center">
                  <span className="text-emerald-600 text-sm">1</span>
                </div>
                <p className="text-sm">Selecciona un período para el reporte</p>
              </div>

              <div className="space-y-2">
                <Link
                  href="/reports/sales?period=day"
                  className="flex items-center justify-between p-2 border border-emerald-100 rounded-md hover:bg-emerald-50"
                >
                  <span className="text-sm font-medium">Ventas de hoy</span>
                  <FileText className="h-4 w-4 text-emerald-500" />
                </Link>

                <Link
                  href="/reports/sales?period=week"
                  className="flex items-center justify-between p-2 border border-emerald-100 rounded-md hover:bg-emerald-50"
                >
                  <span className="text-sm font-medium">Ventas de la semana</span>
                  <FileText className="h-4 w-4 text-emerald-500" />
                </Link>

                <Link
                  href="/reports/sales?period=month"
                  className="flex items-center justify-between p-2 border border-emerald-100 rounded-md hover:bg-emerald-50"
                >
                  <span className="text-sm font-medium">Ventas del mes</span>
                  <FileText className="h-4 w-4 text-emerald-500" />
                </Link>

                <Link
                  href="/reports/sales?period=custom"
                  className="flex items-center justify-between p-2 border border-emerald-100 rounded-md hover:bg-emerald-50"
                >
                  <span className="text-sm font-medium">Personalizado...</span>
                  <FileText className="h-4 w-4 text-emerald-500" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reporte de inventario */}
        <Card className="overflow-hidden border-blue-100 hover:shadow-md transition-all">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <BarChart2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-blue-800">Reporte de inventario</CardTitle>
                <CardDescription className="text-blue-600">
                  Genera un reporte del estado actual del inventario
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <span className="text-blue-600 text-sm">1</span>
                </div>
                <p className="text-sm">Selecciona el tipo de reporte</p>
              </div>

              <div className="space-y-2">
                <Link
                  href="/reports/inventory?type=complete"
                  className="flex items-center justify-between p-2 border border-blue-100 rounded-md hover:bg-blue-50"
                >
                  <span className="text-sm font-medium">Inventario completo</span>
                  <BarChart2 className="h-4 w-4 text-blue-500" />
                </Link>

                <Link
                  href="/reports/inventory?type=low-stock"
                  className="flex items-center justify-between p-2 border border-blue-100 rounded-md hover:bg-blue-50"
                >
                  <span className="text-sm font-medium">Productos con stock bajo</span>
                  <BarChart2 className="h-4 w-4 text-blue-500" />
                </Link>

                <Link
                  href="/reports/inventory?type=best-sellers"
                  className="flex items-center justify-between p-2 border border-blue-100 rounded-md hover:bg-blue-50"
                >
                  <span className="text-sm font-medium">Productos más vendidos</span>
                  <BarChart2 className="h-4 w-4 text-blue-500" />
                </Link>

                <Link
                  href="/reports/inventory?type=custom"
                  className="flex items-center justify-between p-2 border border-blue-100 rounded-md hover:bg-blue-50"
                >
                  <span className="text-sm font-medium">Personalizado...</span>
                  <BarChart2 className="h-4 w-4 text-blue-500" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reporte de pedidos */}
        <Card className="overflow-hidden border-orange-100 hover:shadow-md transition-all">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-orange-800">Reporte de pedidos</CardTitle>
                <CardDescription className="text-orange-600">Genera un reporte de pedidos por estado</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-orange-50 flex items-center justify-center">
                  <span className="text-orange-600 text-sm">1</span>
                </div>
                <p className="text-sm">Selecciona el tipo de reporte</p>
              </div>

              <div className="space-y-2">
                <Link
                  href="/reports/orders?type=all"
                  className="flex items-center justify-between p-2 border border-orange-100 rounded-md hover:bg-orange-50"
                >
                  <span className="text-sm font-medium">Todos los pedidos</span>
                  <Package className="h-4 w-4 text-orange-500" />
                </Link>

                <Link
                  href="/reports/orders?type=pending"
                  className="flex items-center justify-between p-2 border border-orange-100 rounded-md hover:bg-orange-50"
                >
                  <span className="text-sm font-medium">Pedidos pendientes</span>
                  <Package className="h-4 w-4 text-orange-500" />
                </Link>

                <Link
                  href="/reports/orders?type=delivered"
                  className="flex items-center justify-between p-2 border border-orange-100 rounded-md hover:bg-orange-50"
                >
                  <span className="text-sm font-medium">Pedidos recibidos</span>
                  <Package className="h-4 w-4 text-orange-500" />
                </Link>

                <Link
                  href="/reports/orders?type=custom"
                  className="flex items-center justify-between p-2 border border-orange-100 rounded-md hover:bg-orange-50"
                >
                  <span className="text-sm font-medium">Personalizado...</span>
                  <Package className="h-4 w-4 text-orange-500" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
        >
          Volver al dashboard
        </Link>
      </div>
    </div>
  )
}
