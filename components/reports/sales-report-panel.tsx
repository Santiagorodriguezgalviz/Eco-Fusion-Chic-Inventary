"use client"

import { useState } from "react"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar, FileText, ChevronRight, BarChart2, CalendarRange } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CustomCalendar } from "@/components/ui/custom-calendar"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
// Use the new modular PDF services
import { generateSalesReportPDF, downloadPDF } from "@/lib/services/pdf"

type ReportPeriod = "day" | "week" | "month" | "custom"

export function SalesReportPanel() {
  const [activeTab, setActiveTab] = useState<ReportPeriod>("day")
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [isCustomStartOpen, setIsCustomStartOpen] = useState(false)
  const [isCustomEndOpen, setIsCustomEndOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  // Función para obtener el rango de fechas según el período seleccionado
  const getDateRange = () => {
    let start: Date
    let end: Date

    switch (activeTab) {
      case "day":
        start = startOfDay(new Date())
        end = endOfDay(new Date())
        break
      case "week":
        start = startOfWeek(new Date(), { locale: es })
        end = endOfWeek(new Date(), { locale: es })
        break
      case "month":
        start = startOfMonth(new Date())
        end = endOfMonth(new Date())
        break
      case "custom":
        start = startOfDay(startDate)
        end = endOfDay(endDate)
        break
      default:
        start = startOfDay(new Date())
        end = endOfDay(new Date())
    }

    return { start, end }
  }

  // Función para generar el reporte
  const handleGenerateReport = async () => {
    setIsLoading(true)

    try {
      const { start, end } = getDateRange()

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
            size_name: item.sizes?.name || "N/A", // Add null check with fallback value
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

      // Generar título del reporte según el período
      let reportTitle = ""
      switch (activeTab) {
        case "day":
          reportTitle = `Reporte de ventas del día ${format(new Date(), "PPP", { locale: es })}`
          break
        case "week":
          reportTitle = `Reporte de ventas de la semana (${format(start, "PPP", { locale: es })} al ${format(end, "PPP", { locale: es })})`
          break
        case "month":
          reportTitle = `Reporte de ventas del mes de ${format(new Date(), "MMMM yyyy", { locale: es })}`
          break
        case "custom":
          reportTitle = `Reporte de ventas del ${format(start, "PPP", { locale: es })} al ${format(end, "PPP", { locale: es })}`
          break
      }

      // Generar y descargar PDF
      const doc = generateSalesReportPDF(salesWithItems, reportTitle)
      downloadPDF(doc, `reporte-ventas-${format(new Date(), "yyyy-MM-dd")}.pdf`)

      toast({
        title: "Reporte generado",
        description: `${reportTitle} descargado correctamente`,
        icon: (
          <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
            <FileText className="h-4 w-4 text-green-600" />
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

  // Renderizar el contenido según el período seleccionado
  const renderPeriodContent = () => {
    switch (activeTab) {
      case "day":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
              <Calendar className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-800">Hoy</p>
                <p className="text-xs text-emerald-600">{format(new Date(), "PPP", { locale: es })}</p>
              </div>
            </div>
            <Button
              onClick={handleGenerateReport}
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {isLoading ? "Generando..." : "Generar reporte del día"}
            </Button>
          </div>
        )

      case "week":
        const weekStart = startOfWeek(new Date(), { locale: es })
        const weekEnd = endOfWeek(new Date(), { locale: es })

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <CalendarRange className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">Esta semana</p>
                <p className="text-xs text-blue-600">
                  {format(weekStart, "PPP", { locale: es })} - {format(weekEnd, "PPP", { locale: es })}
                </p>
              </div>
            </div>
            <Button
              onClick={handleGenerateReport}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "Generando..." : "Generar reporte de la semana"}
            </Button>
          </div>
        )

      case "month":
        const monthStart = startOfMonth(new Date())
        const monthEnd = endOfMonth(new Date())

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <BarChart2 className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-800">Este mes</p>
                <p className="text-xs text-purple-600">
                  {format(monthStart, "PPP", { locale: es })} - {format(monthEnd, "PPP", { locale: es })}
                </p>
              </div>
            </div>
            <Button
              onClick={handleGenerateReport}
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? "Generando..." : "Generar reporte del mes"}
            </Button>
          </div>
        )

      case "custom":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Selector de fecha inicial */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicial</label>
                <div className="relative">
                  <div
                    className="w-full p-2 border border-emerald-200 rounded-md flex items-center justify-between cursor-pointer hover:bg-emerald-50"
                    onClick={() => setIsCustomStartOpen(!isCustomStartOpen)}
                  >
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-emerald-500 mr-2" />
                      {format(startDate, "PPP", { locale: es })}
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>

                  {isCustomStartOpen && (
                    <div className="absolute z-10 mt-1 w-full">
                      <Card>
                        <CardContent className="p-0">
                          <CustomCalendar
                            value={startDate}
                            onChange={(date) => {
                              setStartDate(date)
                              setIsCustomStartOpen(false)
                              if (date > endDate) {
                                setEndDate(date)
                              }
                            }}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </div>

              {/* Selector de fecha final */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha final</label>
                <div className="relative">
                  <div
                    className="w-full p-2 border border-emerald-200 rounded-md flex items-center justify-between cursor-pointer hover:bg-emerald-50"
                    onClick={() => setIsCustomEndOpen(!isCustomEndOpen)}
                  >
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-emerald-500 mr-2" />
                      {format(endDate, "PPP", { locale: es })}
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>

                  {isCustomEndOpen && (
                    <div className="absolute z-10 mt-1 w-full">
                      <Card>
                        <CardContent className="p-0">
                          <CustomCalendar
                            value={endDate}
                            onChange={(date) => {
                              setEndDate(date)
                              setIsCustomEndOpen(false)
                            }}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Accesos rápidos */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date()
                  setStartDate(subDays(today, 7))
                  setEndDate(today)
                }}
                className="text-xs"
              >
                Últimos 7 días
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date()
                  setStartDate(subDays(today, 30))
                  setEndDate(today)
                }}
                className="text-xs"
              >
                Últimos 30 días
              </Button>
            </div>

            <Button
              onClick={handleGenerateReport}
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {isLoading ? "Generando..." : "Generar reporte personalizado"}
            </Button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Card className="border-emerald-100">
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-medium text-lg text-emerald-800">Reporte de ventas</h3>
              <p className="text-sm text-emerald-600">Genera reportes de ventas por período</p>
            </div>
          </div>

          <Tabs defaultValue="day" value={activeTab} onValueChange={(value) => setActiveTab(value as ReportPeriod)}>
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="day" className="text-xs">
                Día
              </TabsTrigger>
              <TabsTrigger value="week" className="text-xs">
                Semana
              </TabsTrigger>
              <TabsTrigger value="month" className="text-xs">
                Mes
              </TabsTrigger>
              <TabsTrigger value="custom" className="text-xs">
                Personalizado
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>{renderPeriodContent()}</TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  )
}
