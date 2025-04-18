"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, Plus, Send, FileText, Calendar, RefreshCcw } from "lucide-react"
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null)
  const [showReturnDialog, setShowReturnDialog] = useState(false)
  const [saleToReturn, setSaleToReturn] = useState<Sale | null>(null)
  const [isProcessingReturn, setIsProcessingReturn] = useState(false)
  
  const supabase = createClient()

  const handleDeleteSale = async () => {
    if (!saleToDelete) return
    
    try {
      // Delete sale items first
      const { error: itemsError } = await supabase
        .from("sale_items")
        .delete()
        .eq("sale_id", saleToDelete.id)
        
      if (itemsError) throw itemsError
      
      // Then delete the sale
      const { error: saleError } = await supabase
        .from("sales")
        .delete()
        .eq("id", saleToDelete.id)
        
      if (saleError) throw saleError
      
      // Update local state
      setSales((prev) => prev.filter((sale) => sale.id !== saleToDelete.id))
      
      toast({
        title: "Venta eliminada",
        description: "La venta ha sido eliminada correctamente",
      })
      
      addNotification(
        "Venta eliminada",
        `La factura ${saleToDelete.invoice_number} ha sido eliminada`,
        "success"
      )
    } catch (error) {
      console.error("Error deleting sale:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la venta",
        variant: "destructive",
      })
    } finally {
      setShowDeleteDialog(false)
      setSaleToDelete(null)
    }
  }

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
                products (
                  id,
                  name
                ),
                sizes (name)
              `)
              .eq("sale_id", sale.id)

            if (itemsError) {
              console.error("Error fetching sale items:", itemsError)
              return {
                ...sale,
                customer: sale.customers || null,
                items: [],
              }
            }

            // Fix the mapping of product data
            const items = itemsData.map((item) => ({
              product_name: item.products && typeof item.products === 'object' && 'name' in item.products 
                ? item.products.name 
                : "Unknown product",
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
            }))

            return {
              ...sale,
              customer: sale.customers || null,
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
          products (
            id,
            name
          ),
          sizes (name)
        `)
        .eq("sale_id", saleId)

      if (itemsError) throw itemsError

      // Fix the mapping of product data
      const items = itemsData.map((item) => ({
        product_name: item.products && typeof item.products === 'object' && 'name' in item.products 
          ? item.products.name 
          : "Unknown product",
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
      }))

      return {
        ...saleData,
        customer: saleData.customers || null,
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
      // Create a properly formatted sale object for WhatsApp
      const formattedSale: SaleData = {
        ...sale,
        items: sale.items.map(item => ({
          ...item,
          // Ensure product_name is properly formatted without undefined
          product_name: item.product_name || "Producto sin nombre"
        }))
      } as SaleData;
      
      const whatsappUrl = sendInvoiceToWhatsApp(formattedSale)
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

  // New function to handle product returns
  // Función para manejar devoluciones de productos
  const handleReturnSale = async () => {
    if (!saleToReturn) return
    
    setIsProcessingReturn(true)
    
    try {
      console.log("Iniciando proceso de devolución para la venta:", saleToReturn.id)
      
      // 1. Obtener los items de la venta para devolverlos al inventario
      const { data: saleItems, error: itemsError } = await supabase
        .from("sale_items")
        .select(`
          id,
          product_id,
          size_id,
          quantity,
          products (id, name, stock)
        `)
        .eq("sale_id", saleToReturn.id)
      
      if (itemsError) {
        console.error("Error al obtener los items de la venta:", itemsError)
        throw itemsError
      }
      
      if (!saleItems || saleItems.length === 0) {
        throw new Error("No se encontraron productos para esta venta")
      }
      
      console.log("Items encontrados para devolver:", saleItems)
      
      // 2. Devolver cada item al inventario
      for (const item of saleItems) {
        // Verificar si el producto existe
        if (!item.product_id) {
          console.warn("Omitiendo item sin product_id:", item)
          continue
        }
        
        console.log(`Procesando devolución del producto ${item.product_id}, talla ${item.size_id || 'única'}, cantidad ${item.quantity}`)
        
        try {
          // Primero, actualizar el stock directamente en la tabla de productos
          const { data: productData, error: productError } = await supabase
            .from("products")
            .select("stock")
            .eq("id", item.product_id)
            .single()
            
          if (productError) {
            console.error("Error al obtener el producto:", productError)
            continue // Continuar con el siguiente item si hay error
          }
          
          // Actualizar el stock del producto
          const currentStock = productData.stock || 0
          const newStock = currentStock + item.quantity
          
          const { error: updateProductError } = await supabase
            .from("products")
            .update({ 
              stock: newStock,
              updated_at: new Date().toISOString() 
            })
            .eq("id", item.product_id)
            
          if (updateProductError) {
            console.error("Error al actualizar el stock del producto:", updateProductError)
            continue // Continuar con el siguiente item si hay error
          }
          
          console.log(`Stock del producto actualizado correctamente. Nuevo stock: ${newStock}`)
          
          // Solo si tiene size_id, actualizar también el inventario detallado
          if (item.size_id) {
            // Verificar si existe registro en inventario
            let inventoryQuery = supabase
              .from("inventory")
              .select("id, stock")
              .eq("product_id", item.product_id)
              .eq("size_id", item.size_id)
            
            const { data: inventoryData, error: inventoryError } = await inventoryQuery.single()
            
            if (inventoryError && inventoryError.code !== 'PGRST116') {
              console.error("Error al verificar inventario:", inventoryError)
              // No lanzamos error, continuamos con el siguiente item
              continue
            }
            
            if (inventoryData) {
              // Actualizar registro existente en inventario
              console.log(`Actualizando inventario: stock actual ${inventoryData.stock} + cantidad devuelta ${item.quantity}`)
              const nuevoStock = inventoryData.stock + item.quantity
              
              const { error: updateError } = await supabase
                .from("inventory")
                .update({ 
                  stock: nuevoStock,
                  updated_at: new Date().toISOString()
                })
                .eq("id", inventoryData.id)
              
              if (updateError) {
                console.error("Error al actualizar inventario:", updateError)
                // No lanzamos error, ya actualizamos el stock principal
              } else {
                console.log(`Inventario actualizado correctamente. Nuevo stock: ${nuevoStock}`)
              }
            } else {
              // Crear nuevo registro en inventario si no existe
              console.log(`Creando nuevo registro en inventario con cantidad ${item.quantity}`)
              const { error: insertError } = await supabase
                .from("inventory")
                .insert({
                  product_id: item.product_id,
                  size_id: item.size_id,
                  stock: item.quantity,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
              
              if (insertError) {
                console.error("Error al insertar en inventario:", insertError)
                // No lanzamos error, ya actualizamos el stock principal
              } else {
                console.log("Nuevo registro de inventario creado correctamente")
              }
            }
          }
        } catch (itemError) {
          console.error(`Error procesando el item ${item.product_id}:`, itemError)
          // Continuamos con el siguiente item en lugar de abortar todo el proceso
        }
      }
      
      // 3. Eliminar primero los items de la venta
      console.log("Eliminando items de la venta...")
      const { error: deleteItemsError } = await supabase
        .from("sale_items")
        .delete()
        .eq("sale_id", saleToReturn.id)
      
      if (deleteItemsError) {
        console.error("Error al eliminar items de la venta:", deleteItemsError)
        throw deleteItemsError
      }
      
      // 4. Eliminar la venta completamente
      console.log("Eliminando la venta...")
      const { error: deleteSaleError } = await supabase
        .from("sales")
        .delete()
        .eq("id", saleToReturn.id)
      
      if (deleteSaleError) {
        console.error("Error al eliminar la venta:", deleteSaleError)
        throw deleteSaleError
      }
      
      // 5. Eliminar la venta del estado local
      setSales((prev) => prev.filter((sale) => sale.id !== saleToReturn.id))
      
      // 6. Mostrar mensaje de éxito
      toast({
        title: "Devolución completada",
        description: "Los productos han sido devueltos al inventario correctamente",
      })
      
      addNotification(
        "Devolución procesada",
        `La factura ${saleToReturn.invoice_number} ha sido procesada como devolución y los productos han vuelto al inventario`,
        "success"
      )
    } catch (error) {
      console.error("Error al procesar la devolución:", error)
      // Añadir información detallada del error
      if (error instanceof Error) {
        console.error("Detalles del error:", {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      } else {
        console.error("Tipo de error desconocido:", typeof error);
      }
      
      toast({
        title: "Error",
        description: "No se pudo procesar la devolución. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsProcessingReturn(false)
      setShowReturnDialog(false)
      setSaleToReturn(null)
    }
  }

  // Update the columns definition to correctly show product information in the Prenda column
  const columns = [
    {
      header: "Factura",
      accessorKey: "invoice_number" as keyof Sale,
    },
    {
      header: "Fecha",
      accessorKey: "created_at" as keyof Sale,
      cell: (row: Sale) => {
        const date = new Date(row.created_at)
        return (
          <div className="whitespace-nowrap">
            <div>{date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
            <div className="text-xs text-gray-500">{date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        )
      },
    },
    {
      header: "Prenda",
      accessorKey: "items" as keyof Sale,
      cell: (row: Sale) => {
        if (!row.items || row.items.length === 0) {
          return <span className="text-gray-500">Sin productos</span>
        }
        
        // Show the first product and indicate if there are more
        const mainProduct = row.items[0].product_name
        const additionalCount = row.items.length - 1
        
        return (
          <div>
            <div className="font-medium">{mainProduct}</div>
            {additionalCount > 0 && (
              <div className="text-xs text-gray-500">+{additionalCount} {additionalCount === 1 ? 'producto' : 'productos'}</div>
            )}
          </div>
        )
      },
    },
    {
      header: "Cliente",
      accessorKey: "customer" as keyof Sale,
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
      accessorKey: "total_amount" as keyof Sale,
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
        // Update the actions section to include the return button
        actions={(row) => (
          <div className="flex justify-end gap-2">
            <Button 
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                setSaleToDelete(row)
                setShowDeleteDialog(true)
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"></path>
                <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              <span className="sr-only">Eliminar venta</span>
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
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                setSaleToReturn(row)
                setShowReturnDialog(true)
              }}
              title="Procesar devolución"
            >
              <RefreshCcw className="h-4 w-4" />
              <span className="sr-only">Procesar devolución</span>
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
        <DialogContent className="sm:max-w-[550px] w-[95vw]">
          <DialogHeader>
            <DialogTitle>Factura {selectedSale?.invoice_number}</DialogTitle>
            <DialogDescription>
              Puedes descargar la factura en formato PDF o enviarla por WhatsApp al cliente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-2">
            <div className="text-green-600 font-medium border-b pb-2">Detalles de la factura:</div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Fecha:</span>
                <div className="font-medium">{selectedSale && formatDateTime(selectedSale.created_at)}</div>
              </div>
              
              <div>
                <span className="text-muted-foreground">Cliente:</span>
                <div className="font-medium">{selectedSale?.customer?.name || "Cliente no registrado"}</div>
              </div>
              
              <div>
                <span className="text-muted-foreground">Identificación:</span>
                <div className="font-medium">{selectedSale?.customer?.identification || "N/A"}</div>
              </div>
              
              <div>
                <span className="text-muted-foreground">Total:</span>
                <div className="font-medium text-green-600">{selectedSale && formatCurrency(selectedSale.total_amount)}</div>
              </div>
            </div>
            
            <div className="pt-1">
              <div className="text-green-600 font-medium mb-2">Productos:</div>
              {selectedSale?.items && selectedSale.items.length > 0 ? (
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                  {selectedSale.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm border-b pb-1">
                      <div>
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-xs text-muted-foreground">{item.quantity} x {formatCurrency(item.price)}</div>
                      </div>
                      <div className="font-medium">{formatCurrency(item.subtotal)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Sin productos</div>
              )}
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between pt-2">
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
              <Button onClick={handleDownloadPdf} className="bg-green-600 hover:bg-green-700">
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

      {/* Diálogo de confirmación para eliminar venta */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Estás seguro?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente
              la venta y todos sus datos asociados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteSale}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para devolución */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Procesar devolución</DialogTitle>
            <DialogDescription>
              Esta acción procesará una devolución para la factura {saleToReturn?.invoice_number}.
              Los productos serán devueltos al inventario y la venta será eliminada del sistema.
            </DialogDescription>
          </DialogHeader>
          
          {saleToReturn && (
            <div className="py-4">
              <div className="text-sm font-medium mb-2">Productos a devolver:</div>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                {saleToReturn.items.map((item, index) => (
                  <div key={index} className="flex justify-between py-1 border-b last:border-0">
                    <div>{item.product_name}</div>
                    <div className="text-muted-foreground">{item.quantity} unidad(es)</div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm font-medium">Total a reembolsar:</div>
                <div className="text-lg font-bold text-green-600">{formatCurrency(saleToReturn.total_amount)}</div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setShowReturnDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleReturnSale}
              disabled={isProcessingReturn}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isProcessingReturn ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </>
              ) : (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Procesar devolución
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
