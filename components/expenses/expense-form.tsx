"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const expenseFormSchema = z.object({
  description: z.string().min(3, {
    message: "La descripción debe tener al menos 3 caracteres.",
  }),
  amount: z.coerce.number().positive({
    message: "El monto debe ser un número positivo.",
  }),
  category: z.string().min(1, {
    message: "Selecciona una categoría.",
  }),
})

type ExpenseFormValues = z.infer<typeof expenseFormSchema>

const defaultValues: Partial<ExpenseFormValues> = {
  description: "",
  amount: 0,
  category: "",
}

interface ExpenseFormProps {
  expense?: {
    id: string
    description: string
    amount: number
    category: string
  }
}

export function ExpenseForm({ expense }: ExpenseFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: expense || defaultValues,
  })

  async function onSubmit(data: ExpenseFormValues) {
    setIsSubmitting(true)
    
    try {
      if (expense) {
        // Actualizar gasto existente
        const { error } = await supabase
          .from("expenses")
          .update({
            description: data.description,
            amount: data.amount,
            category: data.category,
          })
          .eq("id", expense.id)
          
        if (error) throw error
        
        toast({
          title: "Gasto actualizado",
          description: "El gasto ha sido actualizado correctamente.",
        })
      } else {
        // Crear nuevo gasto
        const { error } = await supabase
          .from("expenses")
          .insert({
            description: data.description,
            amount: data.amount,
            category: data.category,
            created_at: new Date().toISOString(),
          })
          
        if (error) throw error
        
        toast({
          title: "Gasto registrado",
          description: "El gasto ha sido registrado correctamente.",
        })
      }
      
      // Redirigir a la lista de gastos
      router.push("/expenses")
      router.refresh()
    } catch (error) {
      console.error("Error saving expense:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al guardar el gasto.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe el gasto..."
                  {...field}
                  rows={3}
                />
              </FormControl>
              <FormDescription>
                Describe brevemente el propósito del gasto.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="servicios">Servicios</SelectItem>
                  <SelectItem value="suministros">Suministros</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="otros">Otros</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Selecciona la categoría que mejor describe este gasto.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0.00"
                  {...field}
                  min={0}
                  step={0.01}
                />
              </FormControl>
              <FormDescription>
                Ingresa el monto del gasto en pesos.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? "Guardando..." : expense ? "Actualizar gasto" : "Registrar gasto"}
          </Button>
        </div>
      </form>
    </Form>
  )
}