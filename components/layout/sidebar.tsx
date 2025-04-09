"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Package, ShoppingCart, Truck, Menu, X, ShoppingBag, FileText, Users } from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AuthButton } from "@/components/auth/auth-button"

const routes = [
  {
    label: "Dashboard",
    icon: BarChart3,
    href: "/dashboard",
    color: "text-blue-500",
  },
  {
    label: "Inventario",
    icon: Package,
    href: "/inventory",
    color: "text-violet-500",
  },
  {
    label: "Ventas",
    icon: ShoppingCart,
    href: "/sales",
    color: "text-pink-500",
  },
  {
    label: "Clientes",
    icon: Users,
    href: "/customers",
    color: "text-sky-500",
  },
  {
    label: "Pedidos",
    icon: Truck,
    href: "/orders",
    color: "text-orange-500",
  },
  {
    label: "Reportes",
    icon: FileText,
    href: "/reports/sales",
    color: "text-emerald-500",
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Evitar problemas de hidratación
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Cerrar el sidebar en dispositivos móviles cuando cambia la ruta
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  if (!isMounted) {
    return null
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X /> : <Menu />}
      </Button>

      {/* Overlay para cerrar el sidebar en móvil */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setIsOpen(false)} />}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-white shadow-xl transition-transform duration-300 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
              <ShoppingBag className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="text-xl font-bold text-emerald-600">Eco Fusion Chic</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-6">
          <nav className="grid items-start px-4 text-sm font-medium">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "group mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:bg-gray-100",
                  pathname === route.href || pathname.startsWith(route.href + "/")
                    ? "bg-emerald-50 text-emerald-600"
                    : "text-gray-600 hover:text-emerald-600",
                )}
              >
                <route.icon className={cn("h-5 w-5", route.color)} />
                <span>{route.label}</span>
                {(pathname === route.href || pathname.startsWith(route.href + "/")) && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                )}
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-t p-4">
          <AuthButton />
        </div>
      </div>
    </>
  )
}
