"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, LogIn } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"

export function LoginForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [cooldownActive, setCooldownActive] = useState(false)
  const [cooldownTime, setCooldownTime] = useState(0)
  const supabase = createClient()

  // Check for existing session on component mount
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        router.push("/")
      }
    }
    
    checkSession()
  }, [router, supabase])

  // Handle cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout
    
    if (cooldownActive && cooldownTime > 0) {
      timer = setTimeout(() => {
        setCooldownTime(prev => prev - 1)
      }, 1000)
    } else if (cooldownTime === 0 && cooldownActive) {
      setCooldownActive(false)
      setLoginAttempts(0)
    }
    
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [cooldownActive, cooldownTime])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
  
    if (isLoading) {
      console.log("handleSubmit bloqueado porque isLoading está activo")
      return
    }
  
    console.log("handleSubmit ejecutado")
  
    // Check if cooldown is active
    if (cooldownActive) {
      toast({
        title: "Demasiados intentos",
        description: `Por favor espera ${cooldownTime} segundos antes de intentar nuevamente`,
        variant: "destructive",
      })
      return
    }
  
    setIsLoading(true)
  
    try {
      // Clear any existing sessions first to avoid token conflicts
      await supabase.auth.signOut()
  
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })
  
      if (error) {
        // Handle rate limit error specifically
        if (error.message.includes("rate limit") || error.status === 429) {
          setCooldownActive(true)
          setCooldownTime(30) // 30 seconds cooldown
          throw new Error("Has excedido el límite de intentos. Por favor espera 30 segundos antes de intentar nuevamente.")
        }
  
        // Track failed login attempts
        setLoginAttempts(prev => {
          const newAttempts = prev + 1
          if (newAttempts >= 5) {
            setCooldownActive(true)
            setCooldownTime(60) // 1 minute cooldown after 5 attempts
          }
          return newAttempts
        })
  
        throw error
      }
  
      // Reset login attempts on successful login
      setLoginAttempts(0)
  
      toast({
        title: "Inicio de sesión exitoso",
        description: "Bienvenido a Eco Fusion Chic",
      })
  
      router.refresh()
      router.push("/")
    } catch (error: any) {
      toast({
        title: "Error al iniciar sesión",
        description: error.message || "Verifica tus credenciales e intenta nuevamente",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  

  const toggleShowPassword = () => {
    setShowPassword(!showPassword)
  }

  return (
    <div className="flex w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl">
      {/* Imagen a la izquierda */}
      <div className="relative hidden w-1/2 bg-gradient-to-br from-emerald-600 to-emerald-800 lg:block">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/90 to-emerald-600/70"></div>
        <Image src="/thrift-shop.png" alt="Eco Fusion Chic Inventory" fill className="object-contain p-8" priority />
      </div>

      {/* Formulario a la derecha */}
      <div className="w-full p-8 lg:w-1/2">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#f5f2e8] p-1 overflow-hidden">
                <div className="relative h-20 w-20 rounded-full overflow-hidden">
                  <Image
                    src="/eco-fusion-logo.png"
                    alt="Eco Fusion Chic"
                    fill
                    className="object-cover scale-[1.35]"
                    style={{ transform: "scale(1.35)" }}
                  />
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-800">Eco Fusion Chic</h2>
            <p className="mt-2 text-gray-600">Inicia sesión para acceder a tu cuenta</p>
          </div>

          {cooldownActive && (
            <div className="mb-4 rounded-md bg-amber-50 p-3 text-center text-amber-800 border border-amber-200">
              <p className="font-medium">Demasiados intentos de inicio de sesión</p>
              <p className="text-sm">Por favor espera {cooldownTime} segundos antes de intentar nuevamente</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Correo electrónico
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@correo.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="h-12 border-gray-300 bg-white/80 backdrop-blur-sm focus-visible:ring-emerald-500"
                disabled={cooldownActive}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Contraseña
                </Label>
                <Link href="/forgot-password" className="text-xs font-medium text-emerald-600 hover:text-emerald-500">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="h-12 border-gray-300 bg-white/80 pr-10 backdrop-blur-sm focus-visible:ring-emerald-500"
                  disabled={cooldownActive}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-12 w-12 text-gray-500"
                  onClick={toggleShowPassword}
                  disabled={cooldownActive}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  <span className="sr-only">{showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}</span>
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              className="h-12 w-full bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={isLoading || cooldownActive}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="mr-2 h-4 w-4 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Iniciando sesión...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <LogIn className="mr-2 h-5 w-5" />
                  Iniciar sesión
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿No tienes una cuenta?{" "}
              <Link href="/register" className="font-medium text-emerald-600 hover:text-emerald-500">
                Regístrate
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
