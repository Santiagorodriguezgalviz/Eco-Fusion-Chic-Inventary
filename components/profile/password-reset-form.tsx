"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"

const passwordResetSchema = z.object({
  email: z.string().email({
    message: "Por favor ingresa un correo electrónico válido.",
  }),
})

type PasswordResetValues = z.infer<typeof passwordResetSchema>

export function PasswordResetForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const form = useForm<PasswordResetValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      email: "",
    },
  })

  async function onSubmit(data: PasswordResetValues) {
    try {
      setIsSubmitting(true)

      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        throw error
      }

      setResetSent(true)
      toast({
        title: "Correo enviado",
        description: "Se ha enviado un enlace para restablecer tu contraseña",
      })
    } catch (error: any) {
      console.error("Error sending reset email:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el correo de restablecimiento",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seguridad de la cuenta</CardTitle>
        <CardDescription>Gestiona la seguridad de tu cuenta</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {resetSent ? (
          <Alert>
            <AlertTitle>Correo enviado</AlertTitle>
            <AlertDescription>
              Hemos enviado un enlace para restablecer tu contraseña a tu correo electrónico. Por favor, revisa tu
              bandeja de entrada y sigue las instrucciones.
            </AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input placeholder="tu@email.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      Ingresa tu correo electrónico para recibir un enlace de restablecimiento de contraseña.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Enviando..." : "Restablecer contraseña"}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  )
}
