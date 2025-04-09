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
import { Trash, Plus, Send, UserPlus, Check } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useRealtimeSubscription } from "@/lib/supabase/realtime"

interface Product {
  id: string
  name: string
  price: number
  sizes: {
    id: string
    name: string
    stock: number
  }[]
}

interface Customer {
  id: string
  name: string
  identification: string
  phone: string | null
}

interface SaleItem {
  product_id: string
  product_name: string
  size_id: string
  size_name: string
  price: number
  quantity: number
  subtotal: number
  available_stock: number // Agregamos el stock disponible para validaciones
}

export function SaleForm({
  products,
  customers: initialCustomers,
}: {
  products: Product[]
  customers: Customer[]
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [selectedSize, setSelectedSize] = useState<string>("")
  const [quantity, setQuantity] = useState<number>(1)
  const [items, setItems] = useState<SaleItem[]>([])
  const [customerId, setCustomerId] = useState<string>("")
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers || [])
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    identification: "",
    phone: "",
  })
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)
  const [stockError, setStockError] = useState<string | null>(null)
  const [selectedProductStock, setSelectedProductStock] = useState<number>(0)

  const supabase = createClient()

  // Suscripción en tiempo real a cambios en clientes
  useRealtimeSubscription({
    table: "customers",
    event: "INSERT",
    onEvent: (payload) => {
      // Añadir el nuevo cliente a la lista
      const newCustomer = payload.new as Customer
      setCustomers((prev) => [...prev, newCustomer])

      // Si estamos creando un cliente, seleccionarlo automáticamente
      if (isCreatingCustomer) {
        setCustomerId(newCustomer.id)
        setIsCreatingCustomer(false)

        toast({
          title: "Cliente creado",
          description: "El cliente ha sido creado y seleccionado automáticamente",
          icon: (
            <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-4 w-4 text-green-600" />
            </div>
          ),
        })
      }
    },
  })

  // Get available sizes for selected product
  const availableSizes = selectedProduct ? products.find((p) => p.id === selectedProduct)?.sizes || [] : []

  // Calculate total
  const total = items.reduce((sum, item) => sum + item.subtotal, 0)

  // Actualizar el stock disponible cuando cambia el tamaño seleccionado
  useEffect(() => {
    if (selectedProduct && selectedSize) {
      const product = products.find((p) => p.id === selectedProduct)
      if (product) {
        const size = product.sizes.find((s) => s.id === selectedSize)
        if (size) {
          setSelectedProductStock(size.stock)
          // Resetear el error de stock
          setStockError(null)

          // Si la cantidad actual es mayor que el stock disponible, ajustarla
          if (quantity > size.stock) {
            setQuantity(size.stock > 0 ? size.stock : 1)
          }
        }
      }
    }
  }, [selectedProduct, selectedSize, products])

  // Validar la cantidad cuando cambia
  useEffect(() => {
    if (selectedProduct && selectedSize) {
      if (quantity > selectedProductStock) {
        setStockError(`Solo hay ${selectedProductStock} unidades disponibles`)
      } else if (quantity <= 0) {
        setStockError("La cantidad debe ser mayor a 0")
      } else {
        setStockError(null)
      }
    }
  }, [quantity, selectedProductStock, selectedProduct, selectedSize])

  const handleAddItem = () => {
    if (!selectedProduct || !selectedSize || quantity <= 0) return

    // Validar stock antes de agregar
    if (quantity > selectedProductStock) {
      setStockError(`No hay suficiente stock. Solo hay ${selectedProductStock} unidades disponibles.`)
      return
    }

    const product = products.find((p) => p.id === selectedProduct)
    if (!product) return

    const size = product.sizes.find((s) => s.id === selectedSize)
    if (!size) return

    const newItem: SaleItem = {
      product_id: product.id,
      product_name: product.name,
      size_id: size.id,
      size_name: size.name,
      price: product.price,
      quantity,
      subtotal: product.price * quantity,
      available_stock: size.stock,
    }

    // Verificar si ya existe un item con el mismo producto y talla
    const existingItemIndex = items.findIndex(
      (item) => item.product_id === newItem.product_id && item.size_id === newItem.size_id,
    )

    if (existingItemIndex >= 0) {
      // Si existe, actualizar la cantidad y subtotal
      const updatedItems = [...items]
      const existingItem = updatedItems[existingItemIndex]

      // Validar que la nueva cantidad total no exceda el stock disponible
      const newQuantity = existingItem.quantity + newItem.quantity

      if (newQuantity > existingItem.available_stock) {
        setStockError(
          `No hay suficiente stock. Solo hay ${existingItem.available_stock} unidades disponibles y ya tienes ${existingItem.quantity} en tu carrito.`,
        )
        return
      }

      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        subtotal: existingItem.price * newQuantity,
      }

      setItems(updatedItems)
    } else {
      // Si no existe, agregar como nuevo item
      setItems((prev) => [...prev, newItem])
    }

    // Limpiar selecciones
    setSelectedProduct("")
    setSelectedSize("")
    setQuantity(1)
    setStockError(null)

    toast({
      title: "Producto agregado",
      description: `${quantity} ${product.name} (${size.name}) agregado al carrito`,
      icon: (
        <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="h-4 w-4 text-green-600" />
        </div>
      ),
    })
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCreateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.identification) return

    setIsCreatingCustomer(true)

    try {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          name: newCustomer.name,
          identification: newCustomer.identification,
          phone: newCustomer.phone || null,
        })
        .select()

      if (error) throw error

      // Si tenemos el ID del cliente recién creado, lo seleccionamos inmediatamente
      if (data && data.length > 0) {
        setCustomerId(data[0].id)

        toast({
          title: "Cliente creado",
          description: "El cliente ha sido creado y seleccionado automáticamente",
          icon: (
            <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-4 w-4 text-green-600" />
            </div>
          ),
        })
      }

      // El cliente se seleccionará automáticamente cuando se reciba el evento de inserción
      setShowNewCustomerForm(false)
      setNewCustomer({
        name: "",
        identification: "",
        phone: "",
      })
    } catch (error) {
      console.error("Error creating customer:", error)
      setIsCreatingCustomer(false)
      toast({
        title: "Error",
        description: "Ocurrió un error al crear el cliente",
        variant: "destructive",
      })
    }
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

    // Validar stock antes de procesar la venta
    let stockValid = true
    let errorMessage = ""

    for (const item of items) {
      // Obtener el stock actual del producto
      const { data, error } = await supabase
        .from("inventory")
        .select("stock")
        .eq("product_id", item.product_id)
        .eq("size_id", item.size_id)
        .single()

      if (error) {
        toast({
          title: "Error",
          description: "Error al verificar el inventario",
          variant: "destructive",
        })
        return
      }

      const currentStock = data.stock

      if (currentStock < item.quantity) {
        stockValid = false
        errorMessage = `No hay suficiente stock de ${item.product_name} (${item.size_name}). Solo quedan ${currentStock} unidades.`
        break
      }
    }

    if (!stockValid) {
      toast({
        title: "Error de inventario",
        description: errorMessage,
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`

      // Create sale
      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .insert({
          customer_id: customerId || null,
          total_amount: total,
          invoice_number: invoiceNumber,
        })
        .select()
        .single()

      if (saleError) throw saleError

      // Verificar si es una venta importante (más de 500,000)
      if (total > 500000) {
        // Importar el servicio de notificaciones
        const { notificationService } = await import("@/lib/services/notification-service")

        // Crear notificación de venta importante
        await notificationService.createImportantSaleNotification(invoiceNumber, total)
      }

      // Create sale items
      const saleItems = items.map((item) => ({
        sale_id: saleData.id,
        product_id: item.product_id,
        size_id: item.size_id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
      }))

      const { error: itemsError } = await supabase.from("sale_items").insert(saleItems)

      if (itemsError) throw itemsError

      // Update inventory using our new function
      for (const item of items) {
        const { error: updateError } = await supabase.rpc("inventory_decrement_stock", {
          product_id_param: item.product_id,
          size_id_param: item.size_id,
          quantity_param: item.quantity,
        })

        if (updateError) throw updateError
      }

      toast({
        title: "Venta registrada",
        description: `Factura ${invoiceNumber} creada exitosamente`,
      })

      router.refresh()
      router.push("/sales")
    } catch (error) {
      console.error("Error creating sale:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al registrar la venta",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendWhatsApp = async () => {
    if (items.length === 0) return

    setIsSendingWhatsApp(true)

    try {
      const customer = customers.find((c) => c.id === customerId)

      if (!customer || !customer.phone) {
        toast({
          title: "Error",
          description: "El cliente no tiene número de teléfono registrado",
          variant: "destructive",
        })
        return
      }

      // Format WhatsApp message
      let message = `*FACTURA ECO FUSION CHIC*

`
      message += `*Cliente:* ${customer.name}
`
      message += `*Identificación:* ${customer.identification}

`
      message += `*Productos:*
`

      items.forEach((item) => {
        message += `- ${item.product_name} (${item.size_name}) x${item.quantity}: ${formatCurrency(item.subtotal)}
`
      })

      message += `
*Total:* ${formatCurrency(total)}`

      // Format phone number (remove any non-digit character)
      const phone = customer.phone.replace(/\D/g, "")

      // Create WhatsApp link
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`

      // Open WhatsApp in a new tab
      window.open(whatsappUrl, "_blank")
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
                    {product.name} - {formatCurrency(product.price)}
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
                    {availableSizes.map((size) => (
                      <SelectItem key={size.id} value={size.id} disabled={size.stock <= 0}>
                        {size.name} ({size.stock} disponibles)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSize && (
                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    Cantidad <span className="text-xs text-muted-foreground">({selectedProductStock} disponibles)</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={selectedProductStock}
                    value={quantity}
                    onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
                    className={stockError ? "border-red-500" : ""}
                  />
                  {stockError && <p className="text-sm text-red-500">{stockError}</p>}
                </div>
              )}

              <Button
                onClick={handleAddItem}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={!selectedProduct || !selectedSize || quantity <= 0 || !!stockError}
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
          <CardTitle>Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showNewCustomerForm ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="identification">Identificación</Label>
                <Input
                  id="identification"
                  value={newCustomer.identification}
                  onChange={(e) => setNewCustomer({ ...newCustomer, identification: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowNewCustomerForm(false)} disabled={isCreatingCustomer}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateCustomer}
                  disabled={isCreatingCustomer || !newCustomer.name || !newCustomer.identification}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isCreatingCustomer ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Guardar cliente
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Cliente</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un cliente (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} - {customer.identification}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => setShowNewCustomerForm(true)} className="w-full">
                <UserPlus className="mr-2 h-4 w-4" />
                Nuevo cliente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Resumen de venta</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Talla</TableHead>
                <TableHead>Precio</TableHead>
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
                    <TableCell>{formatCurrency(item.price)}</TableCell>
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()} disabled={isLoading}>
              Cancelar
            </Button>
            {customerId && (
              <Button variant="outline" onClick={handleSendWhatsApp} disabled={isSendingWhatsApp || items.length === 0}>
                <Send className="mr-2 h-4 w-4" />
                Enviar por WhatsApp
              </Button>
            )}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || items.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? "Guardando..." : "Completar venta"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
