import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { NotificationProvider } from "@/contexts/notification-context"
import { NotificationToast } from "@/components/notifications/notification-toast"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Eco Fusion Chic",
  description: "Sistema de gestión de inventario para tienda de moda sostenible",
  generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <NotificationProvider>
            {children}
            <Toaster />
            <NotificationToast />
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}


import './globals.css'