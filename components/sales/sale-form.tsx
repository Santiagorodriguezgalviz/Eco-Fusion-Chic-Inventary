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
import { Trash, Plus, Send, UserPlus, Check, Search, Package } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useRealtimeSubscription } from "@/lib/supabase/realtime"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// Modificar la interfaz de producto para que no incluya tallas
interface Product {
  id: string
  name: string
  price: number
  stock: number
}

interface Customer {
  id: string
  name: string
  identification: string
  phone: string | null
}

// Modificar la interfaz SaleItem para incluir información de descuento
interface SaleItem {
  product_id: string
  product_name: string
  price: number
  quantity: number
  subtotal: number
  available_stock: number // Stock disponible para validaciones
  discount_percentage: number // Nuevo campo para el porcentaje de descuento
  final_price: number // Precio después del descuento
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [discountPercentage, setDiscountPercentage] = useState<number>(0)
  const [customFinalPrice, setCustomFinalPrice] = useState<string>("") // Nuevo campo para precio final personalizado
  const [useFinalPrice, setUseFinalPrice] = useState<boolean>(false) // Toggle para usar precio final o descuento
  
  // Add these new state variables for the searchable dropdown
  const [open, setOpen] = useState(false)
  const [productSearch, setProductSearch] = useState("")
  
  const supabase = createClient()
  
  // Add this function to filter products based on search
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(productSearch.toLowerCase())
  )
  
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
          variant: "default", // Replace icon with variant
        })
      }
    },
  })

  // Get available sizes for selected product
  // Remove this line completely as the comment above the Product interface indicates
  // "Modificar la interfaz de producto para que no incluya tallas"
  // const availableSizes = selectedProduct ? products.find((p) => p.id === selectedProduct)?.sizes || [] : []

  // Keep the total calculation
  const total = items.reduce((sum, item) => sum + item.subtotal, 0)

  // Actualizar el stock disponible cuando cambia el producto seleccionado
  useEffect(() => {
    if (selectedProduct) {
      const product = products.find((p) => p.id === selectedProduct)
      if (product) {
        setSelectedProductStock(product.stock)
        // Resetear el error de stock
        setStockError(null)

        // Si la cantidad actual es mayor que el stock disponible, ajustarla
        if (quantity > product.stock) {
          setQuantity(product.stock > 0 ? product.stock : 1)
        }
      }
    }
  }, [selectedProduct, products, quantity])

  // Validar la cantidad cuando cambia
  useEffect(() => {
    if (selectedProduct) {
      if (quantity > selectedProductStock) {
        setStockError(`Solo hay ${selectedProductStock} unidades disponibles`)
      } else if (quantity <= 0) {
        setStockError("La cantidad debe ser mayor a 0")
      } else {
        setStockError(null)
      }
    }
  }, [quantity, selectedProductStock, selectedProduct])

  // Modificar handleAddItem para manejar precio final personalizado
  const handleAddItem = () => {
    if (!selectedProduct || quantity <= 0) return

    // Validar stock antes de agregar
    if (quantity > selectedProductStock) {
      setStockError(`No hay suficiente stock. Solo hay ${selectedProductStock} unidades disponibles.`)
      return
    }

    const product = products.find((p) => p.id === selectedProduct)
    if (!product) return

    // Determinar precio final y descuento
    let finalPrice: number
    let discountPercent: number = discountPercentage
    
    if (useFinalPrice && customFinalPrice) {
      // Usar precio final personalizado
      finalPrice = parseFloat(customFinalPrice)
      // Calcular el porcentaje de descuento para almacenarlo
      const discountAmount = product.price - finalPrice
      discountPercent = Math.round((discountAmount / product.price) * 100)
    } else {
      // Usar descuento porcentual
      finalPrice = product.price * (1 - discountPercentage / 100)
    }

    const newItem: SaleItem = {
      product_id: product.id,
      product_name: product.name,
      price: product.price, // Precio original
      quantity,
      subtotal: finalPrice * quantity, // Subtotal con precio final
      available_stock: product.stock,
      discount_percentage: discountPercent,
      final_price: finalPrice
    }

    // Verificar si ya existe un item con el mismo producto y mismo precio final
    const existingItemIndex = items.findIndex(
      (item) => item.product_id === newItem.product_id && 
                Math.abs(item.final_price - newItem.final_price) < 0.01 // Comparación con tolerancia para decimales
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
        subtotal: existingItem.final_price * newQuantity,
      }

      setItems(updatedItems)
    } else {
      // Si no existe, agregar como nuevo item
      setItems((prev) => [...prev, newItem])
    }

    // Limpiar selecciones
    setSelectedProduct("")
    setQuantity(1)
    setDiscountPercentage(0)
    setCustomFinalPrice("")
    setUseFinalPrice(false)
    setStockError(null)

    // Mensaje de toast con información de descuento
    toast({
      title: "Producto agregado",
      description: `${quantity} ${product.name} ${discountPercentage > 0 ? `con ${discountPercentage}% de descuento` : ''} agregado al carrito`,
      variant: "default",
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
      // In handleCreateCustomer
      if (data && data.length > 0) {
        setCustomerId(data[0].id)
      
        toast({
          title: "Cliente creado",
          description: "El cliente ha sido creado y seleccionado automáticamente",
          variant: "default", // Use variant instead of icon
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Generate a unique invoice number (timestamp-based)
      const invoiceNumber = `INV-${Date.now()}`

      // Crear la venta
      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .insert({
          customer_id: customerId || null,
          total_amount: total,
          invoice_number: invoiceNumber, // Add the invoice number
        })
        .select()
        .single()

      if (saleError) throw saleError

      // Crear los items de la venta con información de descuento
      const saleItems = items.map((item) => ({
        sale_id: saleData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price, // Precio original
        discount_percentage: item.discount_percentage,
        final_price: item.final_price, // Precio después del descuento
        subtotal: item.subtotal,
      }))

      const { error: itemsError } = await supabase.from("sale_items").insert(saleItems)

      if (itemsError) throw itemsError

      // Actualizar el stock de los productos
      for (const item of items) {
        const product = products.find((p) => p.id === item.product_id)
        if (product) {
          const newStock = Math.max(0, product.stock - item.quantity)
          
          const { error: stockError } = await supabase
            .from("products")
            .update({ stock: newStock })
            .eq("id", item.product_id)
            
          if (stockError) {
            console.error("Error updating stock:", stockError.message || JSON.stringify(stockError))
          }
        }
      }

      toast({
        title: "Venta registrada",
        description: `Venta #${saleData.invoice_number} registrada exitosamente`,
      })

      // Redireccionar a la página de ventas
      router.push("/sales")
    } catch (error) {
      // Improved error logging
      console.error("Error creating sale:", error instanceof Error ? error.message : JSON.stringify(error))
      toast({
        title: "Error",
        description: "Ocurrió un error al registrar la venta",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
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
        message += `- ${item.product_name} x${item.quantity}: ${formatCurrency(item.subtotal)}
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

  // Modify the product selection UI to improve search functionality
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Agregar productos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product">Producto</Label>
            
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between h-10 px-3 py-2 text-sm"
                >
                  {selectedProduct
                    ? products.find(product => product.id === selectedProduct)?.name
                    : "Selecciona un producto"}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start" side="bottom" sideOffset={5}>
                <Command shouldFilter={false}>
                  <CommandInput 
                    placeholder="Buscar producto..." 
                    className="h-10 border-b border-border/50"
                    value={productSearch}
                    onValueChange={setProductSearch}
                    autoFocus={true}
                  />
                  <CommandEmpty>
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <Search className="h-10 w-10 text-muted-foreground mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">No se encontraron productos.</p>
                    </div>
                  </CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-auto p-1">
                    {filteredProducts.map(product => (
                      <div
                        key={product.id}
                        onClick={() => {
                          setSelectedProduct(product.id);
                          setOpen(false);
                          setProductSearch("");
                        }}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-md transition-colors duration-200 cursor-pointer",
                          "hover:bg-accent hover:text-accent-foreground",
                          "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                          product.stock <= 0 ? "opacity-50 cursor-not-allowed bg-muted/50" : "hover:bg-accent"
                        )}
                        style={{ pointerEvents: product.stock <= 0 ? 'none' : 'auto' }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                            <Package className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{product.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {product.stock} {product.stock === 1 ? "disponible" : "disponibles"}
                            </span>
                          </div>
                        </div>
                        <span className="font-medium text-emerald-600">{formatCurrency(product.price)}</span>
                      </div>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selectedProduct && (
            <>
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

              {/* Selector de tipo de descuento */}
              <div className="flex items-center space-x-2">
                <Button 
                  type="button" 
                  variant={useFinalPrice ? "outline" : "default"} 
                  onClick={() => setUseFinalPrice(false)}
                  className="flex-1"
                >
                  Descuento (%)
                </Button>
                <Button 
                  type="button" 
                  variant={useFinalPrice ? "default" : "outline"} 
                  onClick={() => setUseFinalPrice(true)}
                  className="flex-1"
                >
                  Precio final
                </Button>
              </div>

              {/* Campo condicional según la opción seleccionada */}
              {useFinalPrice ? (
                <div className="space-y-2">
                  <Label htmlFor="finalPrice">
                    Precio final
                  </Label>
                  <Input
                    id="finalPrice"
                    type="number"
                    min="0"
                    max={products.find(p => p.id === selectedProduct)?.price}
                    value={customFinalPrice}
                    onChange={(e) => setCustomFinalPrice(e.target.value)}
                  />
                  {customFinalPrice && (
                    <div className="text-sm text-green-600">
                      Precio original: {formatCurrency(products.find(p => p.id === selectedProduct)?.price || 0)}
                      <br />
                      Ahorro: {formatCurrency((products.find(p => p.id === selectedProduct)?.price || 0) - parseFloat(customFinalPrice || "0"))}
                      <br />
                      Descuento aproximado: {Math.round(((products.find(p => p.id === selectedProduct)?.price || 0) - parseFloat(customFinalPrice || "0")) / (products.find(p => p.id === selectedProduct)?.price || 1) * 100)}%
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="discount">
                    Descuento (%)
                  </Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  />
                  {discountPercentage > 0 && (
                    <div className="text-sm text-green-600">
                      Precio original: {formatCurrency(products.find(p => p.id === selectedProduct)?.price || 0)}
                      <br />
                      Precio con descuento: {formatCurrency((products.find(p => p.id === selectedProduct)?.price || 0) * (1 - discountPercentage/100))}
                      <br />
                      Ahorro: {formatCurrency((products.find(p => p.id === selectedProduct)?.price || 0) * (discountPercentage/100))}
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handleAddItem}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={!selectedProduct || quantity <= 0 || !!stockError || (useFinalPrice && !customFinalPrice)}
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
                <TableHead>Precio Original</TableHead>
                <TableHead>Descuento</TableHead>
                <TableHead>Precio Final</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No hay productos agregados
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>{formatCurrency(item.price)}</TableCell>
                    <TableCell>{item.discount_percentage > 0 ? `${item.discount_percentage}%` : '-'}</TableCell>
                    <TableCell>{formatCurrency(item.final_price)}</TableCell>
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
            onClick={(e) => {
              // Create a synthetic form event to pass to handleSubmit
              const formEvent = { preventDefault: () => {} } as React.FormEvent<HTMLFormElement>;
              handleSubmit(formEvent);
            }}
            disabled={isSubmitting || items.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSubmitting ? "Guardando..." : "Completar venta"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
