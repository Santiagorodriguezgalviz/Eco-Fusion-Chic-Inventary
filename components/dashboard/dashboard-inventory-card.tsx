"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRealtimeSubscription } from "@/lib/supabase/realtime"
import { useToast } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"

interface DashboardInventoryCardProps {
  productsCount: number
  lowStockCount: number
}

export function DashboardInventoryCard({
  productsCount: initialProductsCount,
  lowStockCount: initialLowStockCount,
}: DashboardInventoryCardProps) {
  const [productsCount, setProductsCount] = useState(initialProductsCount)
  const [lowStockCount, setLowStockCount] = useState(initialLowStockCount)
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([])
  const [showLowStock, setShowLowStock] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  // Actualizar los contadores cuando cambian las props
  useEffect(() => {
    setProductsCount(initialProductsCount)
    setLowStockCount(initialLowStockCount)
  }, [initialProductsCount, initialLowStockCount])

  // Memoizar las funciones de actualización para evitar recreaciones
  const updateProductCount = useCallback(async () => {
    try {
      const { count, error } = await supabase.from("products").select("*", { count: "exact", head: true })

      if (error) throw error

      if (count !== null) {
        setProductsCount(count)
      }
    } catch (error) {
      console.error("Error updating product count:", error)
    }
  }, [supabase])

  const updateLowStockCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from("inventory")
        .select("*", { count: "exact", head: true })
        .lt("stock", 5)

      if (error) throw error

      if (count !== null) {
        setLowStockCount(count)
      }
    } catch (error) {
      console.error("Error updating low stock count:", error)
    }
  }, [supabase])

  // Suscripción en tiempo real a cambios en productos
  useRealtimeSubscription({
    table: "products",
    event: "INSERT",
    onEvent: () => {
      updateProductCount()
    },
  })

  useRealtimeSubscription({
    table: "products",
    event: "DELETE",
    onEvent: () => {
      updateProductCount()
    },
  })

  // Suscripción en tiempo real a cambios en inventario
  useRealtimeSubscription({
    table: "inventory",
    event: "UPDATE",
    onEvent: () => {
      updateLowStockCount()
    },
  })

  const fetchLowStockProducts = async () => {
    if (isLoading) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select(`
          stock,
          products(id, name, category),
          sizes(name)
        `)
        .lt("stock", 5)
        .order("stock", { ascending: true })
        .limit(10)

      if (error) throw error

      setLowStockProducts(data || [])
      setShowLowStock(true)
    } catch (error) {
      console.error("Error fetching low stock products:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos con stock bajo",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-none shadow-md">
      <CardHeader>
        <CardTitle>Inventario</CardTitle>
        <CardDescription>Resumen del inventario</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
                <Package className="h-6 w-6 text-violet-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Total de productos</p>
                <motion.p
                  className="text-2xl font-bold"
                  key={productsCount}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {productsCount}
                </motion.p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/inventory">Ver todos</Link>
            </Button>
          </div>

          <div
            className="rounded-lg bg-red-50 p-4 cursor-pointer hover:bg-red-100 transition-colors"
            onClick={fetchLowStockProducts}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Package className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-800">Productos con stock bajo</p>
                <motion.p
                  className="text-xl font-bold text-red-800"
                  key={lowStockCount}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {lowStockCount}
                </motion.p>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showLowStock && lowStockProducts.length > 0 && (
              <motion.div
                className="mt-4 space-y-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-sm font-medium">Productos con stock bajo:</p>
                <div className="max-h-[200px] overflow-y-auto rounded border p-2">
                  {lowStockProducts.map((item, index) => (
                    <motion.div
                      key={index}
                      className="flex items-center justify-between border-b py-2 last:border-0"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <div>
                        <p className="font-medium">{item.products?.name}</p>
                        <p className="text-xs text-gray-500">Talla: {item.sizes?.name}</p>
                      </div>
                      <div className="flex items-center">
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                          Stock: {item.stock}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setShowLowStock(false)}>
                  Cerrar
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  )
}
