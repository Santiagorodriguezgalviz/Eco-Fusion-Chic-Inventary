"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils/date"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash, Plus, ArrowLeft } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useNotifications } from "@/components/ui/notifications"

interface Product {
  id: string
  name: string
  cost_price: number
  sizes: {
    id: string
    name: string
  }[]
}

interface OrderItem {
  id?: string
  product_id: string
  product_name: string
  size_id: string
  size_name: string
  cost_price: number
  quantity: number
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

export function OrderEditForm({ order, products }: { order: Order; products: Product[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const { addNotification } = useNotifications()
  const [isLoading, setIsLoading] = useState(false)
  const [reference, setReference] = useState(order.reference || "")
  const [items, setItems] = useState<OrderItem[]>(order.items)
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [selectedSize, setSelectedSize] = useState<string>("")
  const [quantity, setQuantity] = useState<number>(1)
  const [costPrice, setCostPrice] = useState<number>(0)
  const supabase = createClient()

  // Calculate total
  const total = items.reduce((sum, item) => sum + item.subtotal, 0)

  // Update cost price when product changes
  useEffect(() => {
    if (selectedProduct) {
      const product = products.find((p) => p.id === selectedProduct)
      if (product) {
        setCostPrice(product.cost_price)
      }
    } else {
      setCostPrice(0)
    }
  }, [selectedProduct, products])

  const handleAddItem = () => {
    if (!selectedProduct || !selectedSize || quantity <= 0) return

    const product = products.find((p) => p.id === selectedProduct)
    if (!product) return

    const size = product.sizes.find((s) => s.id === selectedSize)
    if (!size) return

    const newItem: OrderItem = {
      product_id: product.id,
      product_name: product.name,
      size_id: size.id,
      size_name: size.name,
      cost_price: costPrice,
      quantity,
      subtotal: costPrice * quantity,
    }

    setItems((prev) => [...prev, newItem])
    setSelectedProduct("")
    setSelectedSize("")
    setQuantity(1)
    setCostPrice(0)
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast({
        title: "Error",
        description: "Debes agregar al menos un producto",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Update order
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          reference: reference || null,
          total_cost: total,
        })
        .eq("id", order.id)

      if (orderError) throw orderError

      // Delete existing order items
      const { error: deleteError } = await supabase.from("order_items").delete().eq("order_id", order.id)

      if (deleteError) throw deleteError

      // Create new order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        size_id: item.size_id,
        quantity: item.quantity,
        cost_price: item.cost_price,
        subtotal: item.subtotal,
      }))

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems)

      if (itemsError) throw itemsError

      addNotification("Pedido actualizado", "El pedido ha sido actualizado exitosamente", "success")

      router.refresh()
      router.push(`/orders/${order.id}`)
    } catch (error) {
      console.error("Error updating order:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al actualizar el pedido",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold">Editar pedido</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Agregar productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product">Producto</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - {formatCurrency(product.cost_price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProduct && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="size">Talla</Label>
                  <Select value={selectedSize} onValueChange={setSelectedSize}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una talla" />
                    </SelectTrigger>
                    <SelectContent>
                      {products
                        .find((p) => p.id === selectedProduct)
                        ?.sizes.map((size) => (
                          <SelectItem key={size.id} value={size.id}>
                            {size.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Cantidad</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost_price">Costo unitario</Label>
                    <Input
                      id="cost_price"
                      type="number"
                      min="0"
                      step="1000"
                      value={costPrice}
                      onChange={(e) => setCostPrice(Number.parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleAddItem}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={!selectedProduct || !selectedSize || quantity <= 0 || costPrice <= 0}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar producto
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalles del pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reference">Referencia (opcional)</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej: Pedido proveedor X"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Resumen del pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Talla</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No hay productos agregados
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>{item.size_name}</TableCell>
                      <TableCell>{formatCurrency(item.cost_price)}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.subtotal)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                          <Trash className="h-4 w-4" />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="mt-4 flex justify-end text-lg font-bold">Total: {formatCurrency(total)}</div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => router.back()} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || items.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isLoading ? "Guardando..." : "Actualizar pedido"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
