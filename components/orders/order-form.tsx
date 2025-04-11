"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils/date"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash, Plus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface Product {
  id: string
  name: string
  cost_price: number
  // Removed sizes property
}

interface OrderItem {
  product_id: string
  product_name: string
  // Removed size_id and size_name
  cost_price: number
  quantity: number
  subtotal: number
}

export function OrderForm({ products }: { products: Product[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  // Removed selectedSize state
  const [quantity, setQuantity] = useState<number>(1)
  const [items, setItems] = useState<OrderItem[]>([])
  const [reference, setReference] = useState<string>("")

  const supabase = createClient()

  // Removed availableSizes

  // Calculate total
  const total = items.reduce((sum, item) => sum + item.subtotal, 0)

  const handleAddItem = () => {
    if (!selectedProduct || quantity <= 0) return // Removed size check

    const product = products.find((p) => p.id === selectedProduct)
    if (!product) return

    // Removed size lookup

    const newItem: OrderItem = {
      product_id: product.id,
      product_name: product.name,
      // Removed size properties
      cost_price: product.cost_price,
      quantity,
      subtotal: product.cost_price * quantity,
    }

    setItems((prev) => [...prev, newItem])
    setSelectedProduct("")
    // Removed setSelectedSize
    setQuantity(1)
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
      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          reference: reference || null,
          total_cost: total,
          status: "pending",
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items - removed size_id
      const orderItems = items.map((item) => ({
        order_id: orderData.id,
        product_id: item.product_id,
        // Removed size_id
        quantity: item.quantity,
        cost_price: item.cost_price,
        subtotal: item.subtotal,
      }))

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems)

      if (itemsError) throw itemsError

      toast({
        title: "Pedido registrado",
        description: "El pedido ha sido registrado exitosamente",
      })

      router.refresh()
      router.push("/orders")
    } catch (error) {
      console.error("Error creating order:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al registrar el pedido",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
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
              {/* Removed size selection */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
            </>
          )}

          <Button
            onClick={handleAddItem}
            disabled={!selectedProduct || isLoading} // Removed size check
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
          <div className="space-y-2">
            <Label htmlFor="reference">Referencia</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  {/* Removed Size column */}
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No hay productos agregados
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.product_name}</TableCell>
                      {/* Removed Size cell */}
                      <TableCell className="text-right">{item.quantity}</TableCell>
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
        <CardFooter>
          <Button onClick={handleSubmit} disabled={items.length === 0 || isLoading} className="w-full">
            {isLoading ? "Guardando..." : "Guardar pedido"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
