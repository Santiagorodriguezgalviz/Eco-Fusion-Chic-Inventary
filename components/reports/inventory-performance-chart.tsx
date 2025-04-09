"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

export function InventoryPerformanceChart() {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    async function fetchInventoryData() {
      setIsLoading(true)
      try {
        // Obtener datos de inventario por categoría
        const { data, error } = await supabase
          .from("inventory")
          .select(`
            stock,
            products:product_id (
              id, name, category
            )
          `)
          .order("stock", { ascending: false })

        if (error) throw error

        // Agrupar por categoría
        const categoryData = data.reduce((acc: any, item: any) => {
          const category = item.products.category || "Sin categoría"

          if (!acc[category]) {
            acc[category] = {
              category,
              totalStock: 0,
              itemCount: 0,
            }
          }

          acc[category].totalStock += item.stock
          acc[category].itemCount += 1

          return acc
        }, {})

        // Convertir a array y calcular rotación (simulada)
        const formattedData = Object.values(categoryData).map((item: any) => ({
          ...item,
          avgStock: Math.round(item.totalStock / item.itemCount),
          turnoverRate: Math.random() * 5, // Simulado - en producción usaríamos datos reales
        }))

        // Ordenar por stock total
        formattedData.sort((a: any, b: any) => b.totalStock - a.totalStock)

        setData(formattedData.slice(0, 6) || [])
      } catch (error) {
        console.error("Error fetching inventory data:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos de inventario",
          variant: "destructive",
        })
        setData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchInventoryData()
  }, [supabase, toast])

  return (
    <>
      {isLoading ? (
        <div className="flex h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : data.length > 0 ? (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 12 }} interval={0} textAnchor="end" angle={-30} height={60} />
              <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="totalStock" name="Stock total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar
                yAxisId="right"
                dataKey="turnoverRate"
                name="Índice de rotación"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-[300px] items-center justify-center">
          <p className="text-gray-500">No hay datos disponibles</p>
        </div>
      )}
    </>
  )
}
