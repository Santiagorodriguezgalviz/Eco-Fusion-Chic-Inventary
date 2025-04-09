"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { 
  RealtimeChannel, 
  RealtimePostgresChangesPayload,
  RealtimePostgresChangesFilter
} from "@supabase/supabase-js"
import { useToast } from "@/components/ui/use-toast"

// Tipos de eventos de tiempo real
export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*"

// Opciones para la suscripción
export interface SubscriptionOptions {
  table: string
  event?: RealtimeEvent | RealtimeEvent[]
  schema?: string
  filter?: string
  onEvent: (payload: RealtimePostgresChangesPayload<any>) => void
  onError?: (error: any) => void
  enableToasts?: boolean
}

// Hook para usar en componentes
export function useRealtimeSubscription(options: SubscriptionOptions) {
  const { toast } = useToast()
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const optionsRef = useRef(options)
  const [connectionStatus, setConnectionStatus] = useState<string>("disconnected")

  // Actualizar la referencia a las opciones sin causar re-renders
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  useEffect(() => {
    // Crear un canal único para esta suscripción
    const channelId = `realtime-${Math.random().toString(36).substring(2, 11)}`
    let retryCount = 0
    const maxRetries = 3
    
    // Función para manejar errores de manera consistente
    const handleError = (errorType: string, errorDetails: any) => {
      const errorMessage = errorDetails?.message || "Error desconocido"
      const errorInfo = {
        type: errorType,
        message: errorMessage,
        details: errorDetails,
        table: optionsRef.current.table,
        timestamp: new Date().toISOString()
      }
      
      console.error(`[Realtime ${errorType}]:`, errorInfo)
      
      if (optionsRef.current.onError) {
        optionsRef.current.onError(errorInfo)
      }
      
      // Solo mostrar toast si está habilitado (por defecto true)
      if (optionsRef.current.enableToasts !== false) {
        toast({
          title: "Error de conexión en tiempo real",
          description: `No se pudo establecer la conexión para ${optionsRef.current.table}. ${errorMessage}`,
          variant: "destructive",
        })
      }
    }

    const setupChannel = () => {
      try {
        // Verificar si ya existe un canal y limpiarlo
        if (channelRef.current) {
          try {
            channelRef.current.unsubscribe()
          } catch (e) {
            // Ignorar errores al desuscribirse
          }
        }
        
        // Crear un nuevo canal para cada suscripción
        const channel = supabase.channel(channelId)
        channelRef.current = channel
        setConnectionStatus("connecting")

        // Preparar eventos
        const events = Array.isArray(optionsRef.current.event)
          ? optionsRef.current.event
          : optionsRef.current.event
            ? [optionsRef.current.event]
            : ["*"]

        // Configurar el canal para cada evento
        events.forEach((event) => {
          // Crear el filtro con tipos correctos
          const filter: RealtimePostgresChangesFilter<any> = {
            event: event,
            schema: optionsRef.current.schema || "public",
            table: optionsRef.current.table,
          }
          
          // Añadir filtro adicional si existe
          if (optionsRef.current.filter) {
            filter.filter = optionsRef.current.filter
          }
          
          // Usar la API correcta con tipos adecuados
          channel.on<any>(
            'postgres_changes', 
            filter,
            (payload: RealtimePostgresChangesPayload<any>) => {
              try {
                optionsRef.current.onEvent(payload)
              } catch (error) {
                handleError("EventHandler", error)
              }
            }
          )
        })

        // Suscribirse al canal con manejo de errores
        channel.subscribe((status, err) => {
          if (status === "SUBSCRIBED") {
            setConnectionStatus("connected")
            console.log(`[Realtime] Conectado a ${optionsRef.current.table}`)
            retryCount = 0 // Resetear contador de reintentos al conectar exitosamente
          } else if (status === "CHANNEL_ERROR") {
            setConnectionStatus("error")
            handleError("ChannelError", err || { message: "Error de canal no especificado" })
            
            // Intentar reconectar si no excedimos el máximo de reintentos
            if (retryCount < maxRetries) {
              retryCount++
              console.log(`[Realtime] Reintentando conexión (${retryCount}/${maxRetries})...`)
              
              // Esperar un tiempo antes de reintentar (backoff exponencial)
              const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)
              setTimeout(setupChannel, delay)
            }
          } else if (status === "TIMED_OUT") {
            setConnectionStatus("timeout")
            handleError("Timeout", { message: "La conexión ha excedido el tiempo de espera" })
          } else if (status === "CLOSED") {
            setConnectionStatus("closed")
            console.log(`[Realtime] Conexión cerrada para ${optionsRef.current.table}`)
          }
        })
      } catch (error) {
        setConnectionStatus("error")
        handleError("SetupError", error)
      }
    }

    // Iniciar la configuración del canal
    setupChannel()

    // Limpieza al desmontar
    return () => {
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe()
          channelRef.current = null
          setConnectionStatus("disconnected")
        } catch (error) {
          console.error("[Realtime] Error al desuscribirse del canal:", error)
        }
      }
    }
  }, [supabase, toast]) // Solo se ejecuta una vez al montar el componente

  // Devolver el estado de la conexión para que los componentes puedan reaccionar
  return { connectionStatus }
}
