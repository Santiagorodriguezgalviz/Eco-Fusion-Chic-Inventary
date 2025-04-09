"use client"

import { ReactNode } from "react"
import { toast as showToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { ToastAction } from "@/components/ui/toast"

// Define our own action element type
type ToastActionElement = React.ReactElement<typeof ToastAction>

interface CustomToastProps {
  title: string
  description?: string
  icon?: ReactNode
  variant?: "default" | "destructive" | "success" | "warning" | null
  action?: ToastActionElement
  duration?: number
}

export function useCustomToast() {
  const showCustomToast = ({ 
    title, 
    description, 
    icon, 
    variant = "default", 
    action,
    duration = 5000
  }: CustomToastProps) => {
    // Mapear variantes personalizadas a las estándar
    let toastVariant: "default" | "destructive" | undefined = undefined;
    let variantClass = "";
    
    switch (variant) {
      case "success":
        variantClass = "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800";
        break;
      case "warning":
        variantClass = "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800";
        break;
      case "destructive":
        toastVariant = "destructive";
        break;
      default:
        toastVariant = "default";
    }
    
    // Crear el toast con o sin icono
    return showToast({
      title: title, // Usar el título como string simple
      variant: toastVariant,
      action,
      duration,
      className: cn(
        icon ? "pl-0 pr-0" : "", // Sin padding cuando hay icono
        variantClass
      ),
      // Usar un estilo personalizado para mostrar el icono
      style: {
        display: "flex",
        flexDirection: "column",
      },
      // Combinar el icono y la descripción en un solo elemento
      description: (
        <>
          {icon && (
            <div className="flex items-start gap-3 mb-2">
              <div className="flex-shrink-0">{icon}</div>
              <div className="font-medium">{title}</div>
            </div>
          )}
          {description && <div className={icon ? "ml-8" : ""}>{description}</div>}
        </>
      ),
    })
  }
  
  return { showToast: showCustomToast }
}