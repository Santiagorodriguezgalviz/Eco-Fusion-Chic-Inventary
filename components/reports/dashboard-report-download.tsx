"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileDown, BarChart3 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, getDateRange } from "@/lib/utils/date"
import * as XLSX from "xlsx"

export function DashboardReportDownload() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const handleDownload = async () => {
    setIsLoading(true)
    try {
      // Obtener datos para el reporte
      const today = getDateRange("day")
      const week = getDateRange("week")
      const month = getDateRange("month")

      // Ventas
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)

      if (salesError) throw salesError

      // Productos
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)

      if (productsError) throw productsError

      // Inventario
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("inventory")
        .select(`
          *,
          products:product_id (
            id, name, category
          )
        `)
        .order("stock", { ascending: true })
        .limit(100)

      if (inventoryError) throw inventoryError

      // Pedidos
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)

      if (ordersError) throw ordersError

      // Crear libro de Excel
      const wb = XLSX.utils.book_new()

      // Hoja de resumen
      const summaryData = [
        ["Eco Fusion Chic - Reporte del Dashboard"],
        ["Fecha de generación", new Date().toLocaleString()],
        [""],
        ["Resumen de ventas"],
        ["Período", "Total"],
        [
          "Hoy",
          formatCurrency(
            salesData
              .filter((s) => new Date(s.created_at) >= new Date(today.start))
              .reduce((sum, s) => sum + s.total_amount, 0),
          ),
        ],
        [
          "Esta semana",
          formatCurrency(
            salesData
              .filter((s) => new Date(s.created_at) >= new Date(week.start))
              .reduce((sum, s) => sum + s.total_amount, 0),
          ),
        ],
        [
          "Este mes",
          formatCurrency(
            salesData
              .filter((s) => new Date(s.created_at) >= new Date(month.start))
              .reduce((sum, s) => sum + s.total_amount, 0),
          ),
        ],
        [""],
        ["Resumen de inventario"],
        ["Total de productos", productsData.length],
        ["Productos con stock bajo", inventoryData.filter((i) => i.stock < 5).length],
        [""],
        ["Resumen de pedidos"],
        ["Total de pedidos", ordersData.length],
        ["Pedidos pendientes", ordersData.filter((o) => o.status === "pending").length],
        ["Pedidos completados", ordersData.filter((o) => o.status === "completed").length],
      ]

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(wb, summaryWs, "Resumen")

      // Hoja de ventas
      const salesSheetData = [["ID", "Cliente", "Fecha", "Total", "Estado"]]

      salesData.forEach((sale) => {
        salesSheetData.push([
          sale.id,
          sale.customer_id,
          new Date(sale.created_at).toLocaleString(),
          sale.total_amount,
          sale.status,
        ])
      })

      const salesWs = XLSX.utils.aoa_to_sheet(salesSheetData)
      XLSX.utils.book_append_sheet(wb, salesWs, "Ventas")

      // Hoja de inventario
      const inventorySheetData = [["ID", "Producto", "Categoría", "Stock", "Ubicación"]]

      inventoryData.forEach((item) => {
        inventorySheetData.push([
          item.id,
          item.products?.name || "Desconocido",
          item.products?.category || "Sin categoría",
          item.stock,
          item.location || "No especificada",
        ])
      })

      const inventoryWs = XLSX.utils.aoa_to_sheet(inventorySheetData)
      XLSX.utils.book_append_sheet(wb, inventoryWs, "Inventario")

      // Generar archivo y descargar
      XLSX.writeFile(wb, "dashboard-report.xlsx")

      toast({
        title: "Reporte generado",
        description: "El reporte del dashboard se ha descargado correctamente",
      })
    } catch (error) {
      console.error("Error generando reporte:", error)
      toast({
        title: "Error",
        description: "No se pudo generar el reporte",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl text-blue-800">Reporte del Dashboard</CardTitle>
            <CardDescription className="text-blue-600">
              Descarga un reporte completo con todos los datos del dashboard
            </CardDescription>
          </div>
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1">
            <p className="text-sm text-blue-700 mb-2">Este reporte incluye:</p>
            <ul className="text-sm text-blue-600 list-disc list-inside space-y-1">
              <li>Resumen de ventas por período</li>
              <li>Estado actual del inventario</li>
              <li>Resumen de pedidos</li>
              <li>Productos más vendidos</li>
            </ul>
          </div>
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700" onClick={handleDownload} disabled={isLoading}>
            <FileDown className="mr-2 h-5 w-5" />
            {isLoading ? "Generando..." : "Descargar reporte"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
