"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, Plus, Truck, FileText, Edit, Download, Search, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDateTime } from "@/lib/utils/date"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { type OrderData, generateOrderReportPDF, downloadPDF } from "@/lib/services/pdf-service"
import { Badge } from "@/components/ui/badge"
import { Pagination } from "@/components/ui/pagination"

interface Order {
  id: string
  reference: string | null
  total_cost: number
  status: string
  created_at: string
  arrival_date: string | null
  items: {
    product_id: string
    product_name: string
    // Remove size_id and size_name
    quantity: number
    cost_price: number
    subtotal: number
  }[]
}

export function OrdersTable({
  initialOrders,
  initialFilter = "all",
}: {
  initialOrders: Order[]
  initialFilter?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { addNotification } = useNotifications()
  const [orders, setOrders] = useState<Order[]>(initialOrders || [])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showPdfDialog, setShowPdfDialog] = useState(false)
  // Add these new state variables
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "completed">(
    initialFilter as "all" | "pending" | "completed",
  )
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const supabase = createClient()

  // Cargar pedidos directamente desde Supabase al inicio
  useEffect(() => {
    const loadOrders = async () => {
      try {
        // Aplicar filtro de estado si es necesario
        let query = supabase.from("orders").select("id, reference, total_cost, status, created_at, arrival_date")

        if (activeFilter === "pending") {
          query = query.eq("status", "pending")
        } else if (activeFilter === "completed") {
          query = query.eq("status", "completed")
        }

        const { data: ordersData, error } = await query.order("created_at", { ascending: false })

        if (error) {
          throw error
        }

        // Get order items for each order
        const ordersWithItems = await Promise.all(
          ordersData.map(async (order) => {
            // Define a proper type for the joined data
            interface OrderItemWithProduct {
              product_id: string;
              quantity: number;
              cost_price: number;
              subtotal: number;
              products: {
                name: string;
              };
            }

            const { data: itemsData, error: itemsError } = await supabase
              .from("order_items")
              .select(`
                product_id,
                quantity, 
                cost_price, 
                subtotal,
                products (name)
              `)
              .eq("order_id", order.id)

            if (itemsError) {
              console.error("Error fetching order items:", itemsError)
              return {
                ...order,
                items: [],
              }
            }

            // Cast itemsData to the correct type
            const typedItemsData = itemsData as unknown as OrderItemWithProduct[];
            
            const items = typedItemsData.map((item) => ({
              product_id: item.product_id,
              product_name: item.products.name || "Producto sin nombre",
              quantity: item.quantity,
              cost_price: item.cost_price,
              subtotal: item.subtotal,
            }))

            return {
              ...order,
              items,
            }
          }),
        )

        setOrders(ordersWithItems)
      } catch (error) {
        console.error("Error loading orders:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los pedidos",
          variant: "destructive",
        })
      }
    }

    loadOrders()

    // Configurar un intervalo para actualizar los datos cada 30 segundos
    const intervalId = setInterval(loadOrders, 30000)

    // Limpiar el intervalo cuando el componente se desmonte
    return () => clearInterval(intervalId)
  }, [activeFilter, supabase, toast])

  // Actualizar la URL cuando cambia el filtro
  useEffect(() => {
    if (activeFilter !== initialFilter) {
      const params = new URLSearchParams(searchParams.toString())
      if (activeFilter === "all") {
        params.delete("filter")
      } else {
        params.set("filter", activeFilter)
      }
      router.push(`/orders?${params.toString()}`)
    }
  }, [activeFilter, router, searchParams, initialFilter])

  const handleMarkAsArrived = async () => {
    if (!selectedOrder) return

    setIsUpdating(true)

    try {
      // First update the order status
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: "completed",
          arrival_date: new Date().toISOString(),
        })
        .eq("id", selectedOrder.id)

      if (orderError) {
        console.error("Error updating order status:", orderError)
        throw orderError
      }

      // Update inventory for each item
      for (const item of selectedOrder.items) {
        try {
          // First check if there's an inventory record with null size_id
          const { data: inventoryData, error: findError } = await supabase
            .from("inventory")
            .select("id, stock")
            .eq("product_id", item.product_id)
            .is("size_id", null)
            .maybeSingle() 

          if (findError) {
            console.error("Error finding inventory:", findError)
            throw findError
          }

          if (inventoryData) {
            // Update existing inventory record
            const { error: updateError } = await supabase
              .from("inventory")
              .update({
                stock: inventoryData.stock + item.quantity,
              })
              .eq("id", inventoryData.id)

            if (updateError) {
              console.error("Error updating inventory:", updateError)
              throw updateError
            }
          } else {
            // Create new inventory record
            const { error: insertError } = await supabase
              .from("inventory")
              .insert({
                product_id: item.product_id,
                size_id: null,
                stock: item.quantity,
              })

            if (insertError) {
              console.error("Error inserting inventory:", insertError)
              throw insertError
            }
          }
        } catch (itemError) {
          console.error(`Error updating inventory for item ${item.product_id}:`, itemError)
          // Continue with other items even if one fails
        }
      }

      addNotification("Pedido actualizado", "El pedido ha sido marcado como recibido", "success")

      // Update the orders list
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === selectedOrder.id
            ? { ...order, status: "completed", arrival_date: new Date().toISOString() }
            : order,
        )
      )

      router.refresh()
      setSelectedOrder(null)
    } catch (error) {
      // Improved error logging with more details
      console.error("Error updating order:", error)
      
      // Get more detailed error information
      let errorMessage = "Ocurrió un error al actualizar el pedido";
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage += `: ${error.message}`;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleViewPdf = (order: Order) => {
    setSelectedOrder(order)
    setShowPdfDialog(true)
  }

  const handleDownloadPdf = () => {
    if (!selectedOrder) return

    // Create a modified version of selectedOrder that matches OrderData structure
    const orderDataForPdf: OrderData = {
      ...selectedOrder,
      items: selectedOrder.items.map(item => ({
        ...item,
        size_name: "N/A" // Add the missing size_name property
      }))
    }

    const doc = generateOrderReportPDF(orderDataForPdf)
    downloadPDF(doc, `pedido-${selectedOrder.reference || selectedOrder.id}.pdf`)

    addNotification("PDF generado", "El reporte del pedido ha sido descargado correctamente", "success")

    setShowPdfDialog(false)
  }

  const handleExportOrders = () => {
    // Generar un PDF con todos los pedidos
    const combinedOrder: OrderData = {
      id: "all",
      reference: "Todos los pedidos",
      total_cost: orders.reduce((sum, order) => sum + order.total_cost, 0),
      status: "all",
      created_at: new Date().toISOString(),
      arrival_date: null,
      items: orders.flatMap((order) => order.items.map(item => ({
        ...item,
        size_name: "N/A" // Add the missing size_name property
      }))),
    }

    const doc = generateOrderReportPDF(combinedOrder)
    downloadPDF(doc, `pedidos-${new Date().toISOString().split("T")[0]}.pdf`)

    addNotification("Exportación completada", "Se ha generado el reporte de todos los pedidos", "success")
  }

  const formatStatus = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendiente"
      case "completed":
        return "Recibido"
      default:
        return status
    }
  }

  // Add this new function
  const handleDeleteOrder = async () => {
    if (!orderToDelete) return
    
    setIsDeleting(true)
    
    try {
      // First delete the order items
      const { error: deleteItemsError } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderToDelete.id)
      
      if (deleteItemsError) {
        console.error("Error eliminando items del pedido:", deleteItemsError)
        throw deleteItemsError
      }
      
      // Then delete the order
      const { error: deleteOrderError } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderToDelete.id)
      
      if (deleteOrderError) {
        console.error("Error eliminando pedido:", deleteOrderError)
        throw deleteOrderError
      }
      
      // Update local state
      setOrders((prev) => prev.filter((order) => order.id !== orderToDelete.id))
      
      addNotification(
        "Pedido eliminado", 
        "El pedido ha sido eliminado permanentemente", 
        "success"
      )
      
      setShowDeleteDialog(false)
      setOrderToDelete(null)
    } catch (error) {
      console.error("Error al eliminar el pedido:", error)
      
      toast({
        title: "Error",
        description: "No se pudo eliminar el pedido. Puede estar referenciado en otras tablas.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Filtrar pedidos por término de búsqueda
  const filteredOrders = orders.filter((order) => {
    const searchString = searchTerm.toLowerCase()
    const reference = order.reference?.toLowerCase() || ""
    const id = order.id.toLowerCase()

    return reference.includes(searchString) || id.includes(searchString)
  })

  // Calcular paginación
  const totalItems = filteredOrders.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // Asegurar que la página actual es válida
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(totalPages)
  }

  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold">Pedidos</h2>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-md border border-input overflow-hidden">
              <Button
                variant={activeFilter === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveFilter("all")}
                className="rounded-none border-r"
              >
                Todos
              </Button>
              <Button
                variant={activeFilter === "pending" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveFilter("pending")}
                className="rounded-none border-r"
              >
                Pendientes
              </Button>
              <Button
                variant={activeFilter === "completed" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveFilter("completed")}
                className="rounded-none"
              >
                Recibidos
              </Button>
            </div>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
              <Link href="/orders/new">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo pedido
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1) // Reset to first page on search
              }}
              className="pl-8 border-emerald-200 focus-visible:ring-emerald-500"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportOrders}
            className="flex items-center gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <Download className="h-4 w-4" />
            Exportar pedidos
          </Button>
        </div>

        {/* Tabla de pedidos con diseño mejorado */}
        <div className="rounded-lg overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-emerald-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-800">Referencia</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-800">Fecha</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-800">Estado</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-800">Productos</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-800">Total</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-emerald-800">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                      No se encontraron pedidos
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-emerald-50/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/orders/${order.id}`)}
                    >
                      <td className="px-4 py-3 text-sm">
                        <span className="font-medium">
                          {order.reference || <span className="text-gray-500">Sin referencia</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatDateTime(order.created_at)}</td>
                      <td className="px-4 py-3 text-sm">
                        {order.status === "pending" ? (
                          <Badge
                            variant="outline"
                            className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300"
                          >
                            Pendiente
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-800 hover:bg-green-200 border-green-300"
                          >
                            Recibido
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {/* Show product names instead of just count */}
                        <div className="max-w-[200px] truncate">
                          {order.items.map(item => item.product_name).join(", ")}
                        </div>
                        <div className="text-xs text-gray-500">{order.items.length} productos</div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-emerald-700">
                        {formatCurrency(order.total_cost)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="hover:bg-emerald-50"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/orders/${order.id}`)
                            }}
                          >
                            <div>
                              <Eye className="h-4 w-4 text-emerald-600" />
                              <span className="sr-only">Ver detalles</span>
                            </div>
                          </Button>
                          {order.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              className="hover:bg-emerald-50"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/orders/edit/${order.id}`)
                              }}
                            >
                              <div>
                                <Edit className="h-4 w-4 text-emerald-600" />
                                <span className="sr-only">Editar</span>
                              </div>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewPdf(order)
                            }}
                            className="hover:bg-emerald-50"
                          >
                            <FileText className="h-4 w-4 text-emerald-600" />
                            <span className="sr-only">Ver reporte</span>
                          </Button>
                          {order.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedOrder(order)
                                setShowPdfDialog(false)
                              }}
                              className="hover:bg-emerald-50"
                            >
                              <Truck className="h-4 w-4 text-emerald-600" />
                              <span className="sr-only">Marcar como recibido</span>
                            </Button>
                          )}
                          {/* Add delete button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              setOrderToDelete(order)
                              setShowDeleteDialog(true)
                            }}
                            className="hover:bg-emerald-50"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                            <span className="sr-only">Eliminar pedido</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginación */}
        {totalItems > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>

      {/* Diálogo para marcar como recibido */}
      <Dialog open={!!selectedOrder && !showPdfDialog} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar pedido como recibido</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas marcar este pedido como recibido? Esta acción actualizará el inventario con
              los productos del pedido.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <h4 className="font-medium">Productos en el pedido:</h4>
            <ul className="mt-2 space-y-1">
              {selectedOrder?.items.map((item, index) => (
                <li key={index} className="text-sm">
                  {item.product_name} x{item.quantity} - {formatCurrency(item.cost_price)} c/u
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrder(null)} disabled={isUpdating}>
              Cancelar
            </Button>
            <Button onClick={handleMarkAsArrived} disabled={isUpdating} className="bg-emerald-600 hover:bg-emerald-700">
              {isUpdating ? "Actualizando..." : "Confirmar recepción"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para ver/descargar PDF */}
      <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pedido {selectedOrder?.reference || selectedOrder?.id}</DialogTitle>
            <DialogDescription>Puedes descargar el reporte del pedido en formato PDF.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-2 font-medium">Detalles del pedido:</p>
            <ul className="space-y-1 text-sm">
              <li>
                <span className="font-medium">Fecha:</span> {selectedOrder && formatDateTime(selectedOrder.created_at)}
              </li>
              <li>
                <span className="font-medium">Estado:</span>{" "}
                {selectedOrder?.status === "pending" ? "Pendiente" : "Recibido"}
              </li>
              <li>
                <span className="font-medium">Total:</span> {selectedOrder && formatCurrency(selectedOrder.total_cost)}
              </li>
            </ul>
            
            <p className="mt-4 mb-2 font-medium">Productos:</p>
            <ul className="space-y-1 text-sm">
              {selectedOrder?.items.map((item, index) => (
                <li key={index}>
                  {item.product_name} x{item.quantity} - {formatCurrency(item.cost_price)} c/u
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPdfDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDownloadPdf} className="bg-emerald-600 hover:bg-emerald-700">
              <FileText className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Estás seguro?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente
              el pedido y todos sus datos asociados.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {orderToDelete && (
              <>
                <p className="font-medium">Detalles del pedido a eliminar:</p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li><span className="font-medium">Referencia:</span> {orderToDelete.reference || "Sin referencia"}</li>
                  <li><span className="font-medium">Fecha:</span> {formatDateTime(orderToDelete.created_at)}</li>
                  <li><span className="font-medium">Total:</span> {formatCurrency(orderToDelete.total_cost)}</li>
                </ul>
              </>
            )}
          </div>
          <DialogFooter className="flex flex-row justify-end gap-2 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteOrder}
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
  
