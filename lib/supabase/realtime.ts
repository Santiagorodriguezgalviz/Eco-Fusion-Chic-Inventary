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
    
    // Enhanced error handler with better logging
    const safeNotifyError = (type: string, details: any) => {
      try {
        // Extract message safely
        let message = "Error desconocido";
        if (details && typeof details === 'object' && 'message' in details) {
          message = String(details.message);
        }
        
        // Create a detailed error object for debugging
        const errorDetails = {
          type,
          message,
          table: optionsRef.current.table,
          timestamp: new Date().toISOString(),
          details: typeof details === 'object' ? { ...details } : details,
          channelId
        };
        
        // Log error details to a custom div for debugging
        const debugInfo = document.createElement('div');
        debugInfo.style.display = 'none';
        debugInfo.setAttribute('data-debug-realtime', 'true');
        debugInfo.textContent = JSON.stringify(errorDetails, null, 2);
        document.body.appendChild(debugInfo);
        
        // Call user's error handler if provided
        if (typeof optionsRef.current.onError === 'function') {
          optionsRef.current.onError(errorDetails);
        }
        
        // Show toast if enabled
        if (optionsRef.current.enableToasts !== false) {
          toast({
            title: "Error de conexión en tiempo real",
            description: `Problema con ${optionsRef.current.table}: ${message}. Ver consola para más detalles.`,
            variant: "destructive",
          });
        }
      } catch (_) {
        // If even our safe error handling fails, create a minimal error element
        try {
          const fallbackDebug = document.createElement('div');
          fallbackDebug.setAttribute('data-debug-realtime-fallback', type);
          fallbackDebug.style.display = 'none';
          document.body.appendChild(fallbackDebug);
        } catch {
          // Ultimate fallback - do nothing
        }
      }
    };

    const setupChannel = () => {
      try {
        // Verificar si ya existe un canal y limpiarlo
        if (channelRef.current) {
          try {
            channelRef.current.unsubscribe()
          } catch (_) {
            // Silent catch
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
                safeNotifyError("EventHandler", error)
              }
            }
          )
        })

        // Suscribirse al canal con manejo de errores
        channel.subscribe((status, err) => {
          if (status === "SUBSCRIBED") {
            setConnectionStatus("connected")
            retryCount = 0 // Resetear contador de reintentos
          } else if (status === "CHANNEL_ERROR") {
            setConnectionStatus("error")
            safeNotifyError("ChannelError", err || { message: "Error de canal" })
            
            // Intentar reconectar si no excedimos el máximo de reintentos
            if (retryCount < maxRetries) {
              retryCount++
              const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)
              setTimeout(setupChannel, delay)
            }
          } else if (status === "TIMED_OUT") {
            setConnectionStatus("timeout")
            safeNotifyError("Timeout", { message: "Tiempo de espera excedido" })
          } else if (status === "CLOSED") {
            setConnectionStatus("closed")
          }
        })
      } catch (error) {
        setConnectionStatus("error")
        safeNotifyError("SetupError", error)
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
        } catch (_) {
          // Silent catch
        }
      }
    }
  }, [supabase, toast])

  return { connectionStatus }
}
