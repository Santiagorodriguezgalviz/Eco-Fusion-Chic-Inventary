"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRealtimeSubscription } from "@/lib/supabase/realtime"
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency, formatDateTime } from "@/lib/utils/date"
import { motion, AnimatePresence } from "framer-motion"

interface DashboardOrdersCardProps {
  pendingOrdersCount: number
}

export function DashboardOrdersCard({ pendingOrdersCount: initialPendingOrdersCount }: DashboardOrdersCardProps) {
  const [pendingOrdersCount, setPendingOrdersCount] = useState(initialPendingOrdersCount)
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const [showPendingOrders, setShowPendingOrders] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  // Actualizar el contador cuando cambia la prop
  useEffect(() => {
    setPendingOrdersCount(initialPendingOrdersCount)
  }, [initialPendingOrdersCount])

  // Memoizar la función de actualización para evitar recreaciones
  const updatePendingOrdersCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")

      if (error) throw error

      if (count !== null) {
        setPendingOrdersCount(count)
      }
    } catch (error) {
      console.error("Error updating pending orders count:", error)
    }
  }, [supabase])

  // Suscripción en tiempo real a cambios en pedidos
  useRealtimeSubscription({
    table: "orders",
    event: "INSERT",
    onEvent: (payload) => {
      if (payload.new.status === "pending") {
        updatePendingOrdersCount()
      }
    },
  })

  useRealtimeSubscription({
    table: "orders",
    event: "UPDATE",
    onEvent: (payload) => {
      if (payload.old.status === "pending" || payload.new.status === "pending") {
        updatePendingOrdersCount()
      }
    },
  })

  useRealtimeSubscription({
    table: "orders",
    event: "DELETE",
    onEvent: (payload) => {
      if (payload.old.status === "pending") {
        updatePendingOrdersCount()
      }
    },
  })

  const fetchPendingOrders = async () => {
    if (isLoading) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          reference,
          total_cost,
          created_at
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5)

      if (error) throw error

      setPendingOrders(data || [])
      setShowPendingOrders(true)
    } catch (error) {
      console.error("Error fetching pending orders:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los pedidos pendientes",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-none shadow-md">
      <CardHeader>
        <CardTitle>Pedidos pendientes</CardTitle>
        <CardDescription>Tienes {pendingOrdersCount} pedidos pendientes</CardDescription>
      </CardHeader>
      <CardContent>
        {pendingOrdersCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Truck className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-sm text-gray-500">No hay pedidos pendientes</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
              onClick={fetchPendingOrders}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                  <Truck className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Pedidos pendientes</p>
                  <motion.p
                    className="text-2xl font-bold"
                    key={pendingOrdersCount}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {pendingOrdersCount}
                  </motion.p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/orders?filter=pending">Ver todos</Link>
              </Button>
            </div>

            <AnimatePresence>
              {showPendingOrders && pendingOrders.length > 0 && (
                <motion.div
                  className="mt-4 space-y-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-sm font-medium">Pedidos pendientes recientes:</p>
                  <div className="max-h-[200px] overflow-y-auto rounded border p-2">
                    {pendingOrders.map((order, index) => (
                      <motion.div
                        key={order.id}
                        className="flex items-center justify-between border-b py-2 last:border-0"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                      >
                        <div>
                          <p className="font-medium">{order.reference || `Pedido #${order.id.substring(0, 8)}`}</p>
                          <p className="text-xs text-gray-500">{formatDateTime(order.created_at)}</p>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium text-sm">{formatCurrency(order.total_cost)}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setShowPendingOrders(false)}>
                      Cerrar
                    </Button>
                    <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700" asChild>
                      <Link href="/orders?filter=pending">Ver todos</Link>
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
