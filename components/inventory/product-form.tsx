"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"

const categories = ["Camisetas", "Pantalones", "Vestidos", "Chaquetas", "Accesorios", "Zapatos", "Otros"]

interface Size {
  id: string
  name: string
  stock: number
  selected: boolean
}

export function ProductForm({ sizes }: { sizes: { id: string; name: string }[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [productSizes, setProductSizes] = useState<Size[]>(
    sizes.map((size) => ({
      ...size,
      stock: 0,
      selected: false,
    })),
  )

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const category = formData.get("category") as string
    const description = formData.get("description") as string
    const price = Number.parseFloat(formData.get("price") as string)
    const cost_price = Number.parseFloat(formData.get("cost_price") as string)
    const image_url = (formData.get("image_url") as string) || null

    try {
      // Insert product
      const { data: productData, error: productError } = await supabase
        .from("products")
        .insert({
          name,
          category,
          description,
          price,
          cost_price,
          image_url,
        })
        .select()
        .single()

      if (productError) throw productError

      // Insert inventory for selected sizes
      const selectedSizes = productSizes.filter((size) => size.selected)

      if (selectedSizes.length > 0) {
        const inventoryItems = selectedSizes.map((size) => ({
          product_id: productData.id,
          size_id: size.id,
          stock: size.stock,
        }))

        const { error: inventoryError } = await supabase.from("inventory").insert(inventoryItems)

        if (inventoryError) throw inventoryError

        // Verificar si hay productos con stock bajo y crear notificaciones
        for (const size of selectedSizes) {
          if (size.selected && size.stock < 5) {
            // Importar el servicio de notificaciones
            const { notificationService } = await import("@/lib/services/notification-service")

            // Crear notificación de stock bajo
            await notificationService.createLowStockNotification(
              productData.name,
              sizes.find((s) => s.id === size.id)?.name || "Desconocida",
              size.stock,
            )
          }
        }
      }

      toast({
        title: "Producto creado",
        description: "El producto ha sido creado exitosamente",
      })

      router.refresh()
      router.push("/inventory")
    } catch (error) {
      console.error("Error creating product:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al crear el producto",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSizeToggle = (id: string) => {
    setProductSizes((prev) => prev.map((size) => (size.id === id ? { ...size, selected: !size.selected } : size)))
  }

  const handleStockChange = (id: string, value: string) => {
    const stock = Number.parseInt(value) || 0
    setProductSizes((prev) => prev.map((size) => (size.id === id ? { ...size, stock } : size)))
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Nuevo Producto</CardTitle>
          <CardDescription>Agrega un nuevo producto al inventario</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select name="category" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Precio de venta</Label>
              <Input id="price" name="price" type="number" min="0" step="1000" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost_price">Precio de costo</Label>
              <Input id="cost_price" name="cost_price" type="number" min="0" step="1000" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">URL de imagen (opcional)</Label>
            <Input id="image_url" name="image_url" type="url" />
          </div>

          <div className="space-y-2">
            <Label>Tallas disponibles</Label>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {productSizes.map((size) => (
                <div key={size.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`size-${size.id}`}
                      checked={size.selected}
                      onCheckedChange={() => handleSizeToggle(size.id)}
                    />
                    <Label htmlFor={`size-${size.id}`}>{size.name}</Label>
                  </div>
                  {size.selected && (
                    <div className="pt-2">
                      <Label htmlFor={`stock-${size.id}`} className="text-xs">
                        Stock
                      </Label>
                      <Input
                        id={`stock-${size.id}`}
                        type="number"
                        min="0"
                        value={size.stock}
                        onChange={(e) => handleStockChange(size.id, e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Guardando..." : "Guardar producto"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
