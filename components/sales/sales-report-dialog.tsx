"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { generateSalesReportPDF, downloadPDF } from "@/lib/services/pdf-service"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { FileText, Download, Calendar } from "lucide-react"
import { CustomCalendar } from "@/components/ui/custom-calendar"

export function SalesReportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [date, setDate] = useState<Date | null>(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const handleGenerateReport = async () => {
    if (!date) {
      toast({
        title: "Fecha requerida",
        description: "Por favor selecciona una fecha para generar el reporte",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Crear rango de fechas para el día seleccionado
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      // Obtener ventas para el día seleccionado
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
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString())

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
          description: `No hay ventas registradas para el ${format(date, "PPP", { locale: es })}`,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Generar y descargar PDF
      const dateStr = format(date, "PPP", { locale: es })
      const doc = generateSalesReportPDF(salesWithItems, dateStr)
      downloadPDF(doc, `reporte-ventas-${format(date, "yyyy-MM-dd")}.pdf`)

      toast({
        title: "Reporte generado",
        description: `Reporte de ventas del ${dateStr} descargado correctamente`,
        icon: (
          <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
            <Download className="h-4 w-4 text-green-600" />
          </div>
        ),
      })

      onOpenChange(false)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-emerald-800">Generar reporte de ventas</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg border border-emerald-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-medium text-emerald-800">Selecciona una fecha</h3>
                <p className="text-xs text-emerald-600">El reporte incluirá todas las ventas del día seleccionado</p>
              </div>
            </div>

            {/* Campo de entrada de fecha con formato */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={date ? format(date, "dd/MM/yyyy", { locale: es }) : ""}
                  readOnly
                  className="w-full p-2 border border-emerald-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Seleccionar fecha"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Calendar className="h-4 w-4 text-emerald-500" />
                </div>
              </div>
            </div>

            {/* Calendario personalizado */}
            <div className="mt-6">
              <CustomCalendar value={date} onChange={setDate} className="mx-auto" />
            </div>

            {date && (
              <div className="mt-4 text-center text-sm text-emerald-700 bg-white p-2 rounded-md border border-emerald-100">
                <p className="font-medium">Fecha seleccionada: {format(date, "PPP", { locale: es })}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerateReport}
            disabled={isLoading || !date}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
