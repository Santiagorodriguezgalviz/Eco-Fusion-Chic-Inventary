"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils/date"
import { Loader2, ShoppingBag } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

export function TopSellingProducts() {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    async function fetchTopProducts() {
      setIsLoading(true)
      try {
        // Usar una consulta SQL directa en lugar de la función RPC
        const { data, error } = await supabase
          .from("sale_items")
          .select(`
            quantity, subtotal,
            products:product_id (
              id, name, category, price
            )
          `)
          .order("quantity", { ascending: false })
          .limit(10)

        if (error) throw error

        // Transformar los datos para que coincidan con el formato esperado
        const formattedData = data.reduce((acc: any[], item: any) => {
          const existingProduct = acc.find((p) => p.product_id === item.products.id)

          if (existingProduct) {
            existingProduct.quantity += item.quantity
            existingProduct.total_sales += item.subtotal
          } else {
            acc.push({
              product_id: item.products.id,
              product_name: item.products.name,
              category: item.products.category,
              price: item.products.price,
              quantity: item.quantity,
              total_sales: item.subtotal,
            })
          }

          return acc
        }, [])

        // Ordenar por cantidad vendida
        formattedData.sort((a, b) => b.quantity - a.quantity)

        // Limitar a 5 productos
        setData(formattedData.slice(0, 5) || [])
      } catch (error) {
        console.error("Error fetching top products:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los productos más vendidos",
          variant: "destructive",
        })
        // Establecer datos vacíos para evitar errores en la visualización
        setData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchTopProducts()
  }, [supabase, toast])

  // Colores para el gráfico de pastel
  const COLORS = ["#FF8042", "#FFBB28", "#00C49F", "#0088FE", "#8884D8"]

  // Formatear datos para el gráfico
  const pieData = data.map((item, index) => ({
    name: item.product_name,
    value: item.quantity,
    sales: item.total_sales,
    color: COLORS[index % COLORS.length],
  }))

  // Renderizar etiqueta personalizada para mostrar el nombre completo
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  // Componente personalizado para el tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-md shadow-md">
          <p className="font-bold text-sm">{payload[0].name}</p>
          <p className="text-sm">
            Unidades: <span className="font-medium">{payload[0].value}</span>
          </p>
          <p className="text-sm">
            Ventas: <span className="font-medium">{formatCurrency(payload[0].payload.sales)}</span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="border-none shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Productos más vendidos</CardTitle>
            <CardDescription>Top 5 productos por cantidad vendida</CardDescription>
          </div>
          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-amber-600" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        ) : data.length > 0 ? (
          <div className="h-[300px] flex flex-col md:flex-row items-center">
            <div className="w-full md:w-1/2 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 mt-4 md:mt-0">
              <div className="space-y-3">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: entry.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={entry.name}>
                        {entry.name}
                      </p>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{entry.value} unidades</span>
                        <span>{formatCurrency(entry.sales)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-gray-500">No hay datos disponibles</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
