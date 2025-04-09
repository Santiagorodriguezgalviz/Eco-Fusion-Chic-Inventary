import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, TrendingUp, ArrowRight } from "lucide-react"
import Link from "next/link"
import { SalesChart } from "@/components/dashboard/sales-chart"
import { InventoryPerformanceChart } from "@/components/reports/inventory-performance-chart"

export default function AnalysisPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Análisis de datos</h1>
        <p className="text-gray-500">Visualiza y analiza los datos de tu negocio</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Análisis de ventas</CardTitle>
                <CardDescription>Visualiza las tendencias de ventas por período</CardDescription>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <SalesChart />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Rendimiento de inventario</CardTitle>
              <CardDescription>Análisis de rotación y stock</CardDescription>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <InventoryPerformanceChart />
            <div className="mt-4 flex justify-end">
              <Button asChild>
                <Link href="/reports/analysis/inventory-performance">
                  Ver análisis detallado
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
