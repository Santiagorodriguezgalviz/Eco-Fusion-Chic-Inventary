"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDateTime } from "@/lib/utils/date"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Edit, Truck, FileText, Trash } from "lucide-react"
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

interface OrderItem {
  id: string
  product_id: string
  size_id: string
  product_name: string
  product_category: string
  product_image: string | null
  size_name: string
  quantity: number
  cost_price: number
  subtotal: number
}

interface Order {
  id: string
  reference: string | null
  total_cost: number
  status: string
  created_at: string
  arrival_date: string | null
  items: OrderItem[]
}

export function OrderDetails({ order }: { order: Order }) {
  const router = useRouter()
  const { toast } = useToast()
  const { addNotification } = useNotifications()
  const [isUpdating, setIsUpdating] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const supabase = createClient()

  const handleMarkAsArrived = async () => {
    setIsUpdating(true)

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "completed",
          arrival_date: new Date().toISOString(),
        })
        .eq("id", order.id)

      if (error) throw error

      // Update inventory for each item
      for (const item of order.items) {
        // Find the inventory record
        const { data: inventoryData, error: findError } = await supabase
          .from("inventory")
          .select("id, stock")
          .eq("product_id", item.product_id)
          .eq("size_id", item.size_id)
          .single()

        if (findError) {
          if (findError.code === "PGRST116") {
            // Record not found, create new inventory record
            const { error: insertError } = await supabase.from("inventory").insert({
              product_id: item.product_id,
              size_id: item.size_id,
              stock: item.quantity,
            })

            if (insertError) throw insertError
          } else {
            throw findError
          }
        } else {
          // Update existing inventory record
          const { error: updateError } = await supabase
            .from("inventory")
            .update({
              stock: inventoryData.stock + item.quantity,
            })
            .eq("id", inventoryData.id)

          if (updateError) throw updateError
        }
      }

      addNotification("Pedido actualizado", "El pedido ha sido marcado como recibido", "success")
      router.refresh()

      // Redirect to orders page after a short delay
      setTimeout(() => {
        router.push("/orders")
      }, 1500)
    } catch (error) {
      console.error("Error updating order:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al actualizar el pedido",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
      setShowConfirmDialog(false)
    }
  }

  const handleDeleteOrder = async () => {
    setIsUpdating(true)

    try {
      // Delete order items first
      const { error: itemsError } = await supabase.from("order_items").delete().eq("order_id", order.id)

      if (itemsError) throw itemsError

      // Then delete the order
      const { error } = await supabase.from("orders").delete().eq("id", order.id)

      if (error) throw error

      addNotification("Pedido eliminado", "El pedido ha sido eliminado exitosamente", "success")

      // Redirect to orders page
      router.push("/orders")
    } catch (error) {
      console.error("Error deleting order:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al eliminar el pedido",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
      setShowDeleteDialog(false)
    }
  }

  const handleDownloadPdf = () => {
    const doc = generateOrderReportPDF(order as OrderData)
    downloadPDF(doc, `pedido-${order.reference || order.id}.pdf`)

    addNotification("PDF generado", "El reporte del pedido ha sido descargado correctamente", "success")
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            {order.reference || `Pedido #${order.id.substring(0, 8)}`}
          </h1>
          <Badge
            variant="outline"
            className={
              order.status === "pending"
                ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300"
                : "bg-green-100 text-green-800 hover:bg-green-200 border-green-300"
            }
          >
            {formatStatus(order.status)}
          </Badge>
        </div>
        <div className="flex gap-2">
          {order.status === "pending" && (
            <>
              <Button variant="outline" onClick={() => setShowConfirmDialog(true)} className="flex items-center gap-1">
                <Truck className="mr-2 h-4 w-4" />
                Marcar como recibido
              </Button>
              <Button variant="outline" asChild className="flex items-center gap-1">
                <Link href={`/orders/edit/${order.id}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </Button>
            </>
          )}
          <Button variant="outline" onClick={handleDownloadPdf} className="flex items-center gap-1">
            <FileText className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
          {order.status === "pending" && (
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información del pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Referencia</p>
                <p className="font-medium">{order.reference || "Sin referencia"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                <p className="font-medium">{formatStatus(order.status)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fecha de creación</p>
                <p className="font-medium">{formatDateTime(order.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fecha de llegada</p>
                <p className="font-medium">{order.arrival_date ? formatDateTime(order.arrival_date) : "Pendiente"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-xl font-bold">{formatCurrency(order.total_cost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Total de productos</p>
                <p className="text-xl font-bold">{order.items.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total de unidades</p>
                <p className="text-xl font-bold">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Costo promedio por unidad</p>
                <p className="text-xl font-bold">
                  {formatCurrency(order.total_cost / order.items.reduce((sum, item) => sum + item.quantity, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
          <CardDescription>Detalle de los productos incluidos en el pedido</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Talla</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Costo unitario</TableHead>
                <TableHead>Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-xs text-gray-500">{item.product_category}</p>
                    </div>
                  </TableCell>
                  <TableCell>{item.size_name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatCurrency(item.cost_price)}</TableCell>
                  <TableCell>{formatCurrency(item.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-end">
          <div className="text-xl font-bold">Total: {formatCurrency(order.total_cost)}</div>
        </CardFooter>
      </Card>

      {/* Diálogo para confirmar recepción */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
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
              {order.items.map((item) => (
                <li key={item.id} className="text-sm">
                  {item.product_name} ({item.size_name}) x{item.quantity}
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={isUpdating}>
              Cancelar
            </Button>
            <Button onClick={handleMarkAsArrived} disabled={isUpdating} className="bg-emerald-600 hover:bg-emerald-700">
              {isUpdating ? "Actualizando..." : "Confirmar recepción"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para confirmar eliminación */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar pedido</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este pedido? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isUpdating}>
              Cancelar
            </Button>
            <Button onClick={handleDeleteOrder} disabled={isUpdating} variant="destructive">
              {isUpdating ? "Eliminando..." : "Eliminar pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
