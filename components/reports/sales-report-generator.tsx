"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DateRangePicker } from "@/components/reports/date-range-picker"
import { FileText, Download } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { generateSalesReportPDF, downloadPDF } from "@/lib/services/pdf-service"

export function SalesReportGenerator() {
  const [startDate, setStartDate] = useState<Date | null>(new Date())
  const [endDate, setEndDate] = useState<Date | null>(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Fechas requeridas",
        description: "Por favor selecciona las fechas para generar el reporte",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Crear rango de fechas
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)

      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)

      // Obtener ventas para el rango de fechas
      const { data: salesData, error } = await supabase
        .from("sales")
        .select(`
          id, 
          invoice_number, 
          total_amount, 
          created_at,
          customers (
            id, 
            name, 
            identification, 
            phone
          )
        `)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())

      if (error) throw error

      // Obtener detalles de cada venta
      const salesWithItems = await Promise.all(
        salesData.map(async (sale) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from("sale_items")
            .select(`
              quantity, 
              price, 
              subtotal,
              products (name),
              sizes (name)
            `)
            .eq("sale_id", sale.id)

          if (itemsError) throw itemsError

          const items = itemsData.map((item) => ({
            product_name: item.products.name,
            size_name: item.sizes.name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          }))

          return {
            ...sale,
            customer: sale.customers,
            items,
          }
        }),
      )

      if (salesWithItems.length === 0) {
        toast({
          title: "Sin datos",
          description: `No hay ventas registradas para el período seleccionado`,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Generar y descargar PDF
      const dateRangeStr = `${format(startDate, "PPP", { locale: es })} al ${format(endDate, "PPP", { locale: es })}`
      const doc = generateSalesReportPDF(salesWithItems, dateRangeStr)
      downloadPDF(doc, `reporte-ventas-${format(startDate, "yyyy-MM-dd")}-${format(endDate, "yyyy-MM-dd")}.pdf`)

      toast({
        title: "Reporte generado",
        description: `Reporte de ventas del período seleccionado descargado correctamente`,
        icon: (
          <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
            <Download className="h-4 w-4 text-green-600" />
          </div>
        ),
      })
    } catch (error) {
      console.error("Error generating report:", error)
      toast({
        title: "Error",
        description: "No se pudo generar el reporte. Intente nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-emerald-100">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardTitle className="text-emerald-800">Generar reporte de ventas</CardTitle>
        <CardDescription>Selecciona un rango de fechas para generar el reporte</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          onClick={handleGenerateReport}
          disabled={isLoading || !startDate || !endDate}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isLoading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Generando...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Generar reporte
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
