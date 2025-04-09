"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { PlusCircle, MinusCircle } from "lucide-react"

interface InventoryAdjustmentDialogProps {
  productId: string
  productName: string
  sizeId: string
  sizeName: string
  currentStock: number
  onAdjustment: (newStock: number) => void
}

export function InventoryAdjustmentDialog({
  productId,
  productName,
  sizeId,
  sizeName,
  currentStock,
  onAdjustment,
}: InventoryAdjustmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [quantity, setQuantity] = useState(0)
  const [reason, setReason] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add")
  const { toast } = useToast()
  const supabase = createClient()

  const handleAdjustment = async () => {
    if (quantity <= 0) {
      toast({
        title: "Cantidad inválida",
        description: "La cantidad debe ser mayor a cero",
        variant: "destructive",
      })
      return
    }

    if (!reason.trim()) {
      toast({
        title: "Razón requerida",
        description: "Debe proporcionar una razón para el ajuste",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Calcular el nuevo stock
      const adjustment = adjustmentType === "add" ? quantity : -quantity
      const newStock = currentStock + adjustment

      if (newStock < 0) {
        toast({
          title: "Stock insuficiente",
          description: "No puede reducir el stock por debajo de cero",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Actualizar el stock en la tabla de inventario
      const { error: updateError } = await supabase
        .from("inventory")
        .update({ stock: newStock })
        .eq("product_id", productId)
        .eq("size_id", sizeId)

      if (updateError) throw updateError

      // Registrar el ajuste en el historial
      const { error: historyError } = await supabase.from("inventory_history").insert({
        product_id: productId,
        size_id: sizeId,
        previous_stock: currentStock,
        new_stock: newStock,
        adjustment,
        reason,
      })

      if (historyError) throw historyError

      // Notificar al componente padre
      onAdjustment(newStock)

      toast({
        title: "Stock actualizado",
        description: `El stock ha sido ${adjustmentType === "add" ? "incrementado" : "reducido"} exitosamente`,
      })

      // Cerrar el diálogo
      setOpen(false)
      setQuantity(0)
      setReason("")
    } catch (error) {
      console.error("Error adjusting inventory:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al ajustar el inventario",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full">
          <PlusCircle className="h-4 w-4 text-gray-500" />
          <span className="sr-only">Ajustar stock</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajustar Inventario</DialogTitle>
          <DialogDescription>
            Ajuste el stock del producto {productName} (Talla: {sizeName})
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              type="button"
              variant={adjustmentType === "add" ? "default" : "outline"}
              onClick={() => setAdjustmentType("add")}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Agregar
            </Button>
            <Button
              type="button"
              variant={adjustmentType === "remove" ? "default" : "outline"}
              onClick={() => setAdjustmentType("remove")}
              className="flex items-center gap-2"
            >
              <MinusCircle className="h-4 w-4" />
              Reducir
            </Button>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="stock" className="text-right">
              Stock actual
            </Label>
            <Input id="stock" value={currentStock} disabled className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Cantidad
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 0)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reason" className="text-right">
              Razón
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ingrese la razón del ajuste"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-stock" className="text-right">
              Nuevo stock
            </Label>
            <Input
              id="new-stock"
              value={Math.max(0, currentStock + (adjustmentType === "add" ? quantity : -quantity))}
              disabled
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleAdjustment} disabled={isLoading}>
            {isLoading ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
