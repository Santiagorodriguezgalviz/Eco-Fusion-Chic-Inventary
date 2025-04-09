"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowUp, RefreshCw, ShoppingCart, Package, AlertCircle } from "lucide-react"

interface InventoryHistoryItem {
  id: string
  product_name: string
  size_name: string
  previous_stock: number
  new_stock: number
  change_amount: number
  change_type: string
  reference_type: string | null
  reference_id: string | null
  notes: string | null
  created_at: string
}

export function InventoryHistoryTable({ productId }: { productId?: string }) {
  const [history, setHistory] = useState<InventoryHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true)
      try {
        let query = supabase
          .from("inventory_history")
          .select(`
            id,
            previous_stock,
            new_stock,
            change_amount,
            change_type,
            reference_type,
            reference_id,
            notes,
            created_at,
            products(name),
            sizes(name)
          `)
          .order("created_at", { ascending: false })

        if (productId) {
          query = query.eq("product_id", productId)
        }

        const { data, error } = await query.limit(100)

        if (error) throw error

        if (data) {
          const formattedData = data.map((item) => ({
            id: item.id,
            product_name: item.products?.name || "Desconocido",
            size_name: item.sizes?.name || "Desconocido",
            previous_stock: item.previous_stock || 0,
            new_stock: item.new_stock,
            change_amount: item.change_amount,
            change_type: item.change_type,
            reference_type: item.reference_type,
            reference_id: item.reference_id,
            notes: item.notes,
            created_at: item.created_at,
          }))
          setHistory(formattedData)
        }
      } catch (error) {
        console.error("Error al cargar el historial de inventario:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [supabase, productId])

  // Función para renderizar el icono según el tipo de cambio
  const renderChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case "venta":
        return <ShoppingCart className="h-4 w-4 text-red-500" />
      case "compra":
        return <Package className="h-4 w-4 text-green-500" />
      case "ajuste":
        return <RefreshCw className="h-4 w-4 text-amber-500" />
      case "devolución":
        return <ArrowUp className="h-4 w-4 text-blue-500" />
      case "inicial":
        return <AlertCircle className="h-4 w-4 text-purple-500" />
      default:
        return <RefreshCw className="h-4 w-4 text-gray-500" />
    }
  }

  // Función para renderizar el badge según el tipo de cambio
  const renderChangeTypeBadge = (changeType: string) => {
    switch (changeType) {
      case "venta":
        return <Badge variant="destructive">Venta</Badge>
      case "compra":
        return (
          <Badge variant="success" className="bg-green-600">
            Compra
          </Badge>
        )
      case "ajuste":
        return <Badge variant="outline">Ajuste</Badge>
      case "devolución":
        return <Badge variant="secondary">Devolución</Badge>
      case "inicial":
        return <Badge variant="default">Inicial</Badge>
      default:
        return <Badge variant="outline">{changeType}</Badge>
    }
  }

  // Función para formatear la fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Skeleton className="h-4 w-full" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-full" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-full" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-full" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-full" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-full" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Anterior</TableHead>
              <TableHead className="text-right">Cambio</TableHead>
              <TableHead className="text-right">Nuevo</TableHead>
              <TableHead>Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No hay registros de cambios en el inventario
                </TableCell>
              </TableRow>
            ) : (
              history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(item.created_at)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{item.product_name}</div>
                    <div className="text-xs text-muted-foreground">Talla: {item.size_name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {renderChangeTypeIcon(item.change_type)}
                      {renderChangeTypeBadge(item.change_type)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">{item.previous_stock}</TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={item.change_amount > 0 ? "text-green-600" : "text-red-600"}>
                      {item.change_amount > 0 ? "+" : ""}
                      {item.change_amount}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">{item.new_stock}</TableCell>
                  <TableCell className="max-w-xs truncate">{item.notes || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
