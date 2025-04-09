"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Save } from "lucide-react"

interface Customer {
  id: string
  name: string
  identification: string
  phone: string | null
  email: string | null
  created_at: string
}

export function CustomerForm({ customer }: { customer?: Customer }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: customer?.name || "",
    identification: customer?.identification || "",
    phone: customer?.phone || "",
    email: customer?.email || "",
  })

  const [errors, setErrors] = useState({
    name: "",
    identification: "",
  })

  const supabase = createClient()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Limpiar errores al cambiar el valor
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors = {
      name: "",
      identification: "",
    }

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es obligatorio"
    }

    if (!formData.identification.trim()) {
      newErrors.identification = "La identificación es obligatoria"
    }

    setErrors(newErrors)
    return !newErrors.name && !newErrors.identification
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      if (customer) {
        // Actualizar cliente existente
        const { error } = await supabase
          .from("customers")
          .update({
            name: formData.name,
            identification: formData.identification,
            phone: formData.phone || null,
            email: formData.email || null,
          })
          .eq("id", customer.id)

        if (error) throw error

        toast({
          title: "Cliente actualizado",
          description: "El cliente ha sido actualizado correctamente",
        })

        // Redirigir a la lista de clientes
        router.push("/customers")
        router.refresh()
      } else {
        // Crear nuevo cliente
        const { error } = await supabase.from("customers").insert({
          name: formData.name,
          identification: formData.identification,
          phone: formData.phone || null,
          email: formData.email || null,
        })

        if (error) throw error

        toast({
          title: "Cliente creado",
          description: "El cliente ha sido creado correctamente",
        })

        // Redirigir a la lista de clientes
        router.push("/customers")
        router.refresh()
      }
    } catch (error) {
      console.error("Error saving customer:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al guardar el cliente",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isLoading ? "Guardando..." : "Guardar cliente"}
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="identification">
                  Identificación <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="identification"
                  name="identification"
                  value={formData.identification}
                  onChange={handleChange}
                  className={errors.identification ? "border-red-500" : ""}
                />
                {errors.identification && <p className="text-sm text-red-500">{errors.identification}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/50 text-sm text-muted-foreground">
            Los campos marcados con <span className="text-red-500">*</span> son obligatorios
          </CardFooter>
        </Card>
      </div>
    </form>
  )
}
