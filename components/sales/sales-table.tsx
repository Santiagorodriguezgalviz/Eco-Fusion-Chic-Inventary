"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, Plus, Send, FileText, Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDateTime, getDateRange } from "@/lib/utils/date"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { useToast } from "@/components/ui/use-toast"
import { useNotifications } from "@/components/ui/notifications"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  type SaleData,
  generateSaleInvoicePDF,
  sendInvoiceToWhatsApp,
  downloadPDF,
  generateSalesReportPDF,
} from "@/lib/services/pdf-service"
import { useRealtimeSubscription } from "@/lib/supabase/realtime"

interface Sale {
  id: string
  invoice_number: string
  total_amount: number
  created_at: string
  customer: {
    id: string
    name: string
    identification: string
    phone: string | null
  } | null
  items: {
    product_name: string
    size_name: string
    quantity: number
    price: number
    subtotal: number
  }[]
}

export function SalesTable({
  initialSales,
  initialFilter = "all",
}: {
  initialSales: Sale[]
  initialFilter?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { addNotification } = useNotifications()
  const [sales, setSales] = useState<Sale[]>(initialSales || [])
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [showPdfDialog, setShowPdfDialog] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [activeFilter, setActiveFilter] = useState<"all" | "today" | "week" | "month">(
    initialFilter === "today" ? "today" : (initialFilter as "all" | "today" | "week" | "month"),
  )
  const supabase = createClient()

  // Cargar ventas directamente desde Supabase al inicio
  useEffect(() => {
    const loadSales = async () => {
      try {
        // Aplicar filtro de fecha si es necesario
        let query = supabase.from("sales").select(`
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

        if (activeFilter !== "all") {
          const { start, end } = getDateRange(activeFilter as "day" | "week" | "month")
          console.log("Filtrando por fecha:", { start, end, activeFilter })
          query = query.gte("created_at", start).lte("created_at", end)
        }

        const { data: salesData, error } = await query.order("created_at", { ascending: false })

        if (error) {
          throw error
        }

        // Get sale items for each sale
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

            if (itemsError) {
              console.error("Error fetching sale items:", itemsError)
              return {
                ...sale,
                customer: sale.customers,
                items: [],
              }
            }

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

        setSales(salesWithItems)
      } catch (error) {
        console.error("Error loading sales:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar las ventas",
          variant: "destructive",
        })
      }
    }

    // Solo cargar si no hay ventas iniciales o si cambia el filtro
    if (!initialSales || initialSales.length === 0 || activeFilter !== initialFilter) {
      loadSales()
    }
  }, [activeFilter, supabase, toast, initialSales, initialFilter])

  // Actualizar la URL cuando cambia el filtro
  useEffect(() => {
    if (activeFilter !== initialFilter) {
      const params = new URLSearchParams(searchParams.toString())
      if (activeFilter === "all") {
        params.delete("filter")
      } else {
        params.set("filter", activeFilter)
      }
      router.push(`/sales?${params.toString()}`)
    }
  }, [activeFilter, router, searchParams, initialFilter])

  // Suscripción en tiempo real a cambios en ventas
  useRealtimeSubscription({
    table: "sales",
    event: ["INSERT", "UPDATE", "DELETE"],
    onEvent: (payload) => {
      if (payload.eventType === "INSERT") {
        // Verificar si la nueva venta cumple con el filtro actual
        if (activeFilter !== "all") {
          const { start, end } = getDateRange(activeFilter as "day" | "week" | "month")
          const saleDate = new Date(payload.new.created_at)
          const startDate = new Date(start)
          const endDate = new Date(end)

          if (saleDate < startDate || saleDate > endDate) {
            return
          }
        }

        // Obtener los detalles completos de la venta
        fetchSaleDetails(payload.new.id).then((newSale) => {
          if (newSale) {
            setSales((prev) => [newSale, ...prev])
            addNotification(
              "Nueva venta registrada",
              `Se ha registrado la factura ${newSale.invoice_number}`,
              "success",
            )
          }
        })
      } else if (payload.eventType === "UPDATE") {
        // Actualizar la venta en el estado
        fetchSaleDetails(payload.new.id).then((updatedSale) => {
          if (updatedSale) {
            setSales((prev) => prev.map((sale) => (sale.id === updatedSale.id ? updatedSale : sale)))
          }
        })
      } else if (payload.eventType === "DELETE") {
        // Eliminar la venta del estado
        setSales((prev) => prev.filter((sale) => sale.id !== payload.old.id))
      }
    },
  })

  // Función para obtener los detalles completos de una venta
  const fetchSaleDetails = async (saleId: string): Promise<Sale | null> => {
    try {
      const { data: saleData, error: saleError } = await supabase
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
        .eq("id", saleId)
        .single()

      if (saleError) throw saleError

      const { data: itemsData, error: itemsError } = await supabase
        .from("sale_items")
        .select(`
          quantity, 
          price, 
          subtotal,
          products (name),
          sizes (name)
        `)
        .eq("sale_id", saleId)

      if (itemsError) throw itemsError

      const items = itemsData.map((item) => ({
        product_name: item.products.name,
        size_name: item.sizes.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
      }))

      return {
        ...saleData,
        customer: saleData.customers,
        items,
      }
    } catch (error) {
      console.error("Error fetching sale details:", error)
      return null
    }
  }

  const handleSendWhatsApp = async (sale: Sale) => {
    if (!sale.customer || !sale.customer.phone) {
      toast({
        title: "Error",
        description: "El cliente no tiene número de teléfono registrado",
        variant: "destructive",
      })
      return
    }

    setIsSendingWhatsApp(true)

    try {
      const whatsappUrl = sendInvoiceToWhatsApp(sale as SaleData)
      window.open(whatsappUrl, "_blank")

      addNotification("WhatsApp preparado", "Se ha generado el mensaje con la factura", "success")
    } catch (error) {
      console.error("Error sending WhatsApp:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al enviar el mensaje de WhatsApp",
        variant: "destructive",
      })
    } finally {
      setIsSendingWhatsApp(false)
    }
  }

  const handleViewPdf = (sale: Sale) => {
    setSelectedSale(sale)
    setShowPdfDialog(true)
  }

  const handleDownloadPdf = () => {
    if (!selectedSale) return

    const doc = generateSaleInvoicePDF(selectedSale as SaleData)
    downloadPDF(doc, `factura-${selectedSale.invoice_number}.pdf`)

    addNotification("PDF generado", "La factura ha sido descargada correctamente", "success")

    setShowPdfDialog(false)
  }

  const handleGenerateDailyReport = () => {
    if (!selectedDate) return

    const dateStr = selectedDate.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })

    // Filtrar ventas por la fecha seleccionada
    const startOfDay = new Date(selectedDate)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(selectedDate)
    endOfDay.setHours(23, 59, 59, 999)

    const filteredSales = sales.filter((sale) => {
      const saleDate = new Date(sale.created_at)
      return saleDate >= startOfDay && saleDate <= endOfDay
    })

    if (filteredSales.length === 0) {
      toast({
        title: "Sin datos",
        description: `No hay ventas registradas para el ${dateStr}`,
        variant: "destructive",
      })
      return
    }

    const doc = generateSalesReportPDF(filteredSales as SaleData[], dateStr)
    downloadPDF(doc, `reporte-ventas-${dateStr.replace(/\//g, "-")}.pdf`)

    addNotification("Reporte generado", `Reporte de ventas del ${dateStr} descargado correctamente`, "success")

    setShowReportDialog(false)
  }

  const handleExportSales = () => {
    const doc = generateSalesReportPDF(sales as SaleData[], "Todas las ventas")
    downloadPDF(doc, `reporte-ventas-completo.pdf`)

    addNotification("Exportación completada", "Se ha generado el reporte de todas las ventas", "success")
  }

  const columns = [
    {
      header: "Factura",
      accessorKey: "invoice_number",
    },
    {
      header: "Fecha",
      accessorKey: "created_at",
      cell: (row: Sale) => formatDateTime(row.created_at),
    },
    {
      header: "Cliente",
      accessorKey: (row: Sale) => row.customer?.name || "Cliente no registrado",
      cell: (row: Sale) => (
        <div>
          {row.customer ? (
            <>
              <div>{row.customer.name}</div>
              <div className="text-xs text-gray-500">{row.customer.identification}</div>
            </>
          ) : (
            <span className="text-gray-500">Cliente no registrado</span>
          )}
        </div>
      ),
    },
    {
      header: "Total",
      accessorKey: "total_amount",
      cell: (row: Sale) => formatCurrency(row.total_amount),
    },
  ]

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-xl font-bold">Ventas</h2>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-md border border-input overflow-hidden">
            <Button
              variant={activeFilter === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveFilter("all")}
              className="rounded-none border-r"
            >
              Todas
            </Button>
            <Button
              variant={activeFilter === "today" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveFilter("today")}
              className="rounded-none border-r"
            >
              Hoy
            </Button>
            <Button
              variant={activeFilter === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveFilter("week")}
              className="rounded-none border-r"
            >
              Semana
            </Button>
            <Button
              variant={activeFilter === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveFilter("month")}
              className="rounded-none"
            >
              Mes
            </Button>
          </div>
          <Button asChild>
            <Link href="/sales/new">
              <Plus className="mr-2 h-4 w-4" />
              Nueva venta
            </Link>
          </Button>
        </div>
      </div>

      <DataTable
        data={sales}
        columns={columns}
        searchKey="invoice_number"
        onRowClick={(row) => router.push(`/sales/${row.id}`)}
        actions={(row) => (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/sales/${row.id}`}>
                <Eye className="h-4 w-4" />
                <span className="sr-only">Ver detalles</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                handleViewPdf(row)
              }}
            >
              <FileText className="h-4 w-4" />
              <span className="sr-only">Ver factura</span>
            </Button>
            {row.customer && row.customer.phone && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  handleSendWhatsApp(row)
                }}
                disabled={isSendingWhatsApp}
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Enviar por WhatsApp</span>
              </Button>
            )}
          </div>
        )}
        exportLabel="Exportar ventas"
        onExport={handleExportSales}
      />

      {/* Diálogo para ver/descargar PDF */}
      <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Factura {selectedSale?.invoice_number}</DialogTitle>
            <DialogDescription>
              Puedes descargar la factura en formato PDF o enviarla por WhatsApp al cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-2 font-medium">Detalles de la factura:</p>
            <ul className="space-y-1 text-sm">
              <li>
                <span className="font-medium">Fecha:</span> {selectedSale && formatDateTime(selectedSale.created_at)}
              </li>
              <li>
                <span className="font-medium">Cliente:</span> {selectedSale?.customer?.name || "Cliente no registrado"}
              </li>
              <li>
                <span className="font-medium">Total:</span> {selectedSale && formatCurrency(selectedSale.total_amount)}
              </li>
              <li>
                <span className="font-medium">Productos:</span> {selectedSale?.items.length || 0}
              </li>
            </ul>
          </div>
          <DialogFooter className="flex sm:justify-between">
            <Button variant="outline" onClick={() => setShowPdfDialog(false)}>
              Cancelar
            </Button>
            <div className="flex gap-2">
              {selectedSale?.customer?.phone && (
                <Button
                  variant="outline"
                  onClick={() => {
                    handleSendWhatsApp(selectedSale)
                    setShowPdfDialog(false)
                  }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Enviar por WhatsApp
                </Button>
              )}
              <Button onClick={handleDownloadPdf}>
                <FileText className="mr-2 h-4 w-4" />
                Descargar PDF
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para generar reporte diario */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generar reporte de ventas</DialogTitle>
            <DialogDescription>Selecciona una fecha para generar el reporte de ventas del día.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    selectedDate.toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  ) : (
                    <span>Seleccionar fecha</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGenerateDailyReport} disabled={!selectedDate}>
              <FileText className="mr-2 h-4 w-4" />
              Generar reporte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
