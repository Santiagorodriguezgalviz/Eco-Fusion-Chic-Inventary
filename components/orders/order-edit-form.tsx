"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils/date"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash, Plus, ArrowLeft } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"

interface Product {
  id: string
  name: string
  cost_price: number
}

interface OrderItem {
  id?: string
  product_id: string
  product_name: string
  cost_price: number
  quantity: number
  subtotal: number
}

interface Order {
  id: string
  reference: string | null
  total_cost: number
  status: string
  items: {
    id: string
    product_id: string
    product: {
      id: string
      name: string
      cost_price: number
    } | null
    quantity: number
    cost_price: number
    subtotal: number
  }[]
}

export function OrderEditForm({ order, products }: { order: Order; products: Product[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [quantity, setQuantity] = useState<number>(1)
  const [reference, setReference] = useState<string>(order.reference || "")
  
  // Convert order items to the format we need
  const initialItems = order.items.map(item => ({
    id: item.id,
    product_id: item.product_id,
    product_name: item.product?.name || "Unknown Product",
    cost_price: item.cost_price,
    quantity: item.quantity,
    subtotal: item.subtotal
  }))
  
  const [items, setItems] = useState<OrderItem[]>(initialItems)

  const supabase = createClient()

  // Calculate total
  const total = items.reduce((sum, item) => sum + item.subtotal, 0)

  const handleAddItem = () => {
    if (!selectedProduct || quantity <= 0) return

    const product = products.find((p) => p.id === selectedProduct)
    if (!product) return

    const newItem: OrderItem = {
      product_id: product.id,
      product_name: product.name,
      cost_price: product.cost_price,
      quantity,
      subtotal: product.cost_price * quantity,
    }

    setItems((prev) => [...prev, newItem])
    setSelectedProduct("")
    setQuantity(1)
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // New function to update item quantity
  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) return
    
    setItems(prev => 
      prev.map((item, i) => {
        if (i === index) {
          const updatedSubtotal = item.cost_price * newQuantity
          return {
            ...item,
            quantity: newQuantity,
            subtotal: updatedSubtotal
          }
        }
        return item
      })
    )
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

      if (orderError) {
        console.error("Order update error:", orderError)
        throw orderError
      }

      // Delete existing items
      const { error: deleteError } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", order.id)

      if (deleteError) {
        console.error("Delete items error:", deleteError)
        throw deleteError
      }

      // Create new order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        cost_price: item.cost_price,
        subtotal: item.subtotal,
      }))

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems)

      if (itemsError) {
        console.error("Insert items error:", itemsError)
        throw itemsError
      }

      toast({
        title: "Pedido actualizado",
        description: "El pedido ha sido actualizado exitosamente",
      })

      router.refresh()
      router.push("/orders")
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
    <div className="space-y-6">
      <Link href="/orders" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a pedidos
      </Link>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Agregar productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="reference" className="text-sm font-medium">
                Referencia
              </label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="product" className="text-sm font-medium">
                Producto
              </label>
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
              <div className="space-y-2">
                <label htmlFor="quantity" className="text-sm font-medium">
                  Cantidad
                </label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
            )}

            <Button
              onClick={handleAddItem}
              disabled={!selectedProduct || isLoading}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar producto
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalles del pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No hay productos agregados
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
                            className="w-16 text-right inline-block"
                          />
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.cost_price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleRemoveItem(index)}
                            variant="ghost"
                            size="icon"
                            disabled={isLoading}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="text-right font-medium">Total: {formatCurrency(total)}</div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" asChild>
              <Link href="/orders">Cancelar</Link>
            </Button>
            <Button onClick={handleSubmit} disabled={items.length === 0 || isLoading} className="bg-emerald-600 hover:bg-emerald-700">
              {isLoading ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin">⏳</span>
                  Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
