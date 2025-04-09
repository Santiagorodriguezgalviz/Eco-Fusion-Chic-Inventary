import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils/date"
// Renombrar la importación de dynamic para evitar conflictos
import nextDynamic from "next/dynamic"

// Importar Recharts de manera dinámica para evitar problemas de SSR
const RechartsComponent = nextDynamic(() => 
  import("@/components/charts/sales-distribution-chart").catch(() => 
    import("@/components/charts/fallback-chart")
  ), {
  ssr: false,
  loading: () => <div className="flex h-[400px] items-center justify-center">Cargando gráfico...</div>
})

// Usar el nombre correcto para la configuración de Next.js
export const dynamic = "force-dynamic"
export const runtime = "edge" // Try using edge runtime which might handle the dependencies better

async function getSalesDistributionData() {
  const supabase = createClient()

  try {
    // Obtener ventas por categoría
    const { data: salesByCategory, error } = await supabase.rpc("get_sales_by_category")

    if (error) {
      console.error("Error fetching sales distribution:", error)
      return []
    }

    return salesByCategory || []
  } catch (error) {
    console.error("Error in getSalesDistributionData:", error)
    return []
  }
}

interface SalesItem {
  category: string
  total_amount: number
}

export default async function SalesDistributionPage() {
  const salesDistribution = await getSalesDistributionData() as SalesItem[]

  // Colores para las categorías
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#8dd1e1"]

  // Formatear datos para el gráfico
  const chartData = salesDistribution.map((item: SalesItem, index: number) => ({
    name: item.category,
    value: item.total_amount,
    color: COLORS[index % COLORS.length],
  }))

  // Calcular el total de ventas
  const totalSales = chartData.reduce((sum: number, item: { value: number }) => sum + item.value, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Distribución de Ventas</h1>
          <p className="text-gray-500">Análisis detallado por categoría de producto</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/reports/analysis">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Categoría</CardTitle>
            <CardDescription>Porcentaje de ventas por categoría de producto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <RechartsComponent chartData={chartData} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalles por Categoría</CardTitle>
            <CardDescription>Ventas totales por categoría</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chartData.length > 0 ? (
                <>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-500">Ventas totales</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
                  </div>

                  <div className="space-y-2">
                    {chartData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="font-medium">{formatCurrency(item.value)}</p>
                          <p className="text-xs text-gray-500">
                            {((item.value / totalSales) * 100).toFixed(1)}% del total
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-[300px] items-center justify-center">
                  <p className="text-gray-500">No hay datos disponibles</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
