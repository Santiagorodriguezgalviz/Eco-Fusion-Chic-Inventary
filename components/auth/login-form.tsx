"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, LogIn, WifiOff, AlertCircle } from "lucide-react"
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
  const [networkError, setNetworkError] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const supabase = createClient()

  // Check for network status on component mount
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    
    // Set initial state
    setIsOffline(!navigator.onLine)
    
    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          router.push("/")
        }
      } catch (error) {
        console.error("Error checking session:", error)
      }
    }
    
    if (navigator.onLine) {
      checkSession()
    }
    
    // Cleanup event listeners
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
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
    // Reset network error state when user makes changes
    if (networkError) {
      setNetworkError(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
  
    if (isLoading) {
      return
    }
    
    // Check if user is offline
    if (isOffline) {
      toast({
        title: "Sin conexión a internet",
        description: "No es posible iniciar sesión sin conexión a internet",
        variant: "destructive",
      })
      return
    }
  
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
    setNetworkError(false)
  
    try {
      // Try to sign out first to clear any existing sessions
      try {
        await supabase.auth.signOut()
      } catch (signOutError) {
        console.error("Error during sign out:", signOutError)
        // Continue with login attempt even if sign out fails
      }
  
      // Attempt to sign in with password
      try {
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
      } catch (fetchError: any) {
        // Handle network errors specifically
        if (fetchError.message === "Failed to fetch" || 
            fetchError.name === "TypeError" || 
            fetchError.message.includes("network") ||
            fetchError.message.includes("conexión")) {
          setNetworkError(true)
          throw new Error("Error de conexión. Por favor verifica tu conexión a internet o inténtalo más tarde.")
        }
        throw fetchError
      }
    } catch (error: any) {
      // Translate common error messages to Spanish
      let errorMessage = error.message || "Verifica tus credenciales e intenta nuevamente"
      
      if (errorMessage.includes("Credenciales de inicio de sesión inválida")) {
        errorMessage = "Credenciales de inicio de sesión inválidas"
      } else if (errorMessage.includes("Email not confirmed")) {
        errorMessage = "Correo electrónico no confirmado. Por favor revisa tu bandeja de entrada"
      } else if (errorMessage.includes("User not found")) {
        errorMessage = "Usuario no encontrado"
      } else if (errorMessage.includes("Failed to fetch")) {
        errorMessage = "Error de conexión. Por favor verifica tu conexión a internet"
      }
      
      toast({
        title: "Error al iniciar sesión",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const toggleShowPassword = () => {
    setShowPassword(!showPassword)
  }

  const retryConnection = () => {
    setNetworkError(false)
    handleSubmit(new Event('submit') as any)
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

          {isOffline && (
            <div className="mb-4 rounded-md bg-orange-50 p-4 text-center border border-orange-200">
              <AlertCircle className="mx-auto h-8 w-8 text-orange-500 mb-2" />
              <p className="font-medium text-orange-800">Sin conexión a internet</p>
              <p className="text-sm text-orange-700 mb-3">No es posible iniciar sesión sin conexión a internet</p>
            </div>
          )}

          {cooldownActive && (
            <div className="mb-4 rounded-md bg-amber-50 p-3 text-center text-amber-800 border border-amber-200">
              <p className="font-medium">Demasiados intentos de inicio de sesión</p>
              <p className="text-sm">Por favor espera {cooldownTime} segundos antes de intentar nuevamente</p>
            </div>
          )}

          {networkError && !isOffline && (
            <div className="mb-4 rounded-md bg-red-50 p-4 text-center border border-red-200">
              <WifiOff className="mx-auto h-8 w-8 text-red-400 mb-2" />
              <p className="font-medium text-red-800">Error de conexión</p>
              <p className="text-sm text-red-700 mb-3">No se pudo conectar con el servidor de autenticación</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={retryConnection}
                className="bg-white hover:bg-gray-50 border-red-300 text-red-700 text-xs"
              >
                Reintentar conexión
              </Button>
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
              disabled={isLoading || cooldownActive || isOffline}
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
