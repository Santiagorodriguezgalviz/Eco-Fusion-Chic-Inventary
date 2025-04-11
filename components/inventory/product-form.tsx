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
import { useToast } from "@/components/ui/use-toast"

const categories = ["Camisetas", "Pantalones", "Vestidos", "Chaquetas", "Accesorios", "Zapatos", "Otros"]

// Update the ProductForm component to accept product data for editing
export function ProductForm({ 
  sizes, 
  product, 
  existingInventory = [], 
  isEditing = false 
}: { 
  sizes: { id: string; name: string }[];
  product?: any;
  existingInventory?: any[];
  isEditing?: boolean;
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

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
    const stock = Number.parseInt(formData.get("stock") as string) || 0

    try {
      if (isEditing && product) {
        // Update existing product
        const { error: productError } = await supabase
          .from("products")
          .update({
            name,
            category,
            description,
            price,
            cost_price,
            image_url,
            stock,
          })
          .eq("id", product.id)

        if (productError) throw productError

        toast({
          title: "Producto actualizado",
          description: "El producto ha sido actualizado exitosamente",
        })
      } else {
        // Insert new product
        const { data: productData, error: productError } = await supabase
          .from("products")
          .insert({
            name,
            category,
            description,
            price,
            cost_price,
            image_url,
            stock,
          })
          .select()
          .single()

        if (productError) throw productError

        // Check if total stock is low and create notification
        if (stock < 5) {
          // Import notification service
          const { notificationService } = await import("@/lib/services/notification-service")

          // Create low stock notification for the product
          await notificationService.createLowStockNotification(
            productData.id,
            productData.name,
            "General", // No specific size
            stock
          )
        }

        toast({
          title: "Producto creado",
          description: "El producto ha sido creado exitosamente",
        })
      }

      router.refresh()
      router.push("/inventory")
    } catch (error) {
      console.error("Error saving product:", error)
      toast({
        title: "Error",
        description: `Ocurrió un error al ${isEditing ? 'actualizar' : 'crear'} el producto`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{isEditing ? "Editar Producto" : "Nuevo Producto"}</CardTitle>
          <CardDescription>
            {isEditing ? "Actualiza la información del producto" : "Agrega un nuevo producto al inventario"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" defaultValue={product?.name || ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select name="category" defaultValue={product?.category || ""} required>
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
            <Textarea id="description" name="description" rows={3} defaultValue={product?.description || ""} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Precio de venta</Label>
              <Input 
                id="price" 
                name="price" 
                type="number" 
                min="0" 
                step="1000" 
                defaultValue={product?.price || ""} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost_price">Precio de costo</Label>
              <Input 
                id="cost_price" 
                name="cost_price" 
                type="number" 
                min="0" 
                step="1000" 
                defaultValue={product?.cost_price || ""} 
                required 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock">Cantidad en stock</Label>
            <Input 
              id="stock" 
              name="stock" 
              type="number" 
              min="0" 
              defaultValue={product?.stock || "0"} 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">URL de imagen (opcional)</Label>
            <Input 
              id="image_url" 
              name="image_url" 
              type="url" 
              defaultValue={product?.image_url || ""} 
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (isEditing ? "Actualizando..." : "Guardando...") : (isEditing ? "Actualizar producto" : "Guardar producto")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
