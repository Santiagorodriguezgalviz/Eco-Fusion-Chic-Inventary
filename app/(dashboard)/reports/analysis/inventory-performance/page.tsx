import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, TrendingUp, AlertTriangle } from "lucide-react"
import Link from "next/link"
// Eliminar la importación directa de recharts
import InventoryChartWrapper from "@/components/charts/inventory-performance-chart-wrapper"

export const dynamic = "force-dynamic"

async function getInventoryPerformanceData() {
  const supabase = createClient()

  try {
    // Obtener datos de rotación de inventario
    const { data: inventoryData, error } = await supabase.rpc("get_inventory_performance")

    if (error) {
      console.error("Error fetching inventory performance:", error)
      return { rotationData: [], lowStockData: [] }
    }

    // Obtener productos con stock bajo
    const { data: lowStockData, error: lowStockError } = await supabase
      .from("inventory")
      .select(`
        stock,
        products(id, name, category),
        sizes(name)
      `)
      .lt("stock", 5)
      .order("stock", { ascending: true })

    if (lowStockError) {
      console.error("Error fetching low stock data:", lowStockError)
      return { rotationData: inventoryData || [], lowStockData: [] }
    }

    return {
      rotationData: inventoryData || [],
      lowStockData: lowStockData || [],
    }
  } catch (error) {
    console.error("Error in getInventoryPerformanceData:", error)
    return { rotationData: [], lowStockData: [] }
  }
}

export default async function InventoryPerformancePage() {
  const { rotationData, lowStockData } = await getInventoryPerformanceData()

  // Formatear datos para el gráfico de rotación
  const chartData = rotationData.map((item) => ({
    category: item.category,
    rotacion: Number.parseFloat(item.rotation_index.toFixed(2)),
    stock: item.avg_stock,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rendimiento de Inventario</h1>
          <p className="text-gray-500">Análisis detallado de rotación y stock</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/reports/analysis">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Índice de Rotación por Categoría</CardTitle>
          <CardDescription>Muestra qué tan rápido se vende el inventario por categoría</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            {chartData.length > 0 ? (
              <InventoryChartWrapper chartData={chartData} />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-gray-500">No hay datos disponibles</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Categorías de Mayor Rotación</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <CardDescription>Categorías que se venden más rápido</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chartData.length > 0 ? (
                chartData
                  .sort((a, b) => b.rotacion - a.rotacion)
                  .slice(0, 5)
                  .map((item, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{item.category}</p>
                        <p className="text-xs text-gray-500">Stock promedio: {item.stock}</p>
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">{item.rotacion}</span>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="flex h-[200px] items-center justify-center">
                  <p className="text-gray-500">No hay datos disponibles</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Productos con Stock Bajo</CardTitle>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <CardDescription>Productos que necesitan reabastecimiento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockData.length > 0 ? (
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {lowStockData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{item.products?.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.products?.category} - Talla: {item.sizes?.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-1">
                        <span className="text-sm font-medium text-red-600">Stock: {item.stock}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-[200px] items-center justify-center">
                  <p className="text-gray-500">No hay productos con stock bajo</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
