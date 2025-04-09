"use client"

import { useToast } from "@/components/ui/use-toast"
import { CheckCircle, AlertCircle, Info, XCircle } from "lucide-react"
import { useEffect } from "react"

type AlertType = "success" | "error" | "warning" | "info"

interface AlertToastProps {
  type: AlertType
  title: string
  description?: string
  duration?: number
  onAction?: () => void
  actionLabel?: string
}

export function useAlertToast() {
  const { toast } = useToast()

  const showToast = ({ type, title, description, duration = 5000, onAction, actionLabel }: AlertToastProps) => {
    const icons = {
      success: <CheckCircle className="h-5 w-5 text-green-500" />,
      error: <XCircle className="h-5 w-5 text-red-500" />,
      warning: <AlertCircle className="h-5 w-5 text-amber-500" />,
      info: <Info className="h-5 w-5 text-blue-500" />,
    }

    const bgColors = {
      success: "bg-green-50 border-green-200",
      error: "bg-red-50 border-red-200",
      warning: "bg-amber-50 border-amber-200",
      info: "bg-blue-50 border-blue-200",
    }

    toast({
      title,
      description,
      duration,
      action:
        onAction && actionLabel
          ? {
              label: actionLabel,
              onClick: onAction,
            }
          : undefined,
      className: `${bgColors[type]} border-2`,
      icon: icons[type],
    })
  }

  return {
    success: (props: Omit<AlertToastProps, "type">) => showToast({ ...props, type: "success" }),
    error: (props: Omit<AlertToastProps, "type">) => showToast({ ...props, type: "error" }),
    warning: (props: Omit<AlertToastProps, "type">) => showToast({ ...props, type: "warning" }),
    info: (props: Omit<AlertToastProps, "type">) => showToast({ ...props, type: "info" }),
  }
}

export function AlertToast({
  type = "info",
  title,
  description,
  duration = 5000,
  onAction,
  actionLabel,
  autoShow = false,
}: AlertToastProps & { autoShow?: boolean }) {
  const alertToast = useAlertToast()

  useEffect(() => {
    if (autoShow) {
      alertToast[type]({ title, description, duration, onAction, actionLabel })
    }
  }, [autoShow, type, title, description, duration, onAction, actionLabel, alertToast])

  return null
}
