"use client"

import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, icon, ...props }) => (
        <Toast key={id} {...props} className={`${props.className || ""} shadow-lg border border-gray-100`}>
          <div className="flex">
            {icon && <div className="mr-3 mt-0.5">{icon}</div>}
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                {title && <ToastTitle>{title}</ToastTitle>}
                <ToastClose />
              </div>
              {description && <ToastDescription className="mt-1">{description}</ToastDescription>}
            </div>
          </div>
          {action && <div className="mt-2">{action}</div>}
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
