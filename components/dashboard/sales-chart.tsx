"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { getDateRange, formatCurrency } from "@/lib/utils/date"
import { Loader2, BarChart3 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useRealtimeSubscription } from "@/lib/supabase/realtime"
import { cn } from "@/lib/utils"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"

interface SalesChartProps {
  className?: string
}

export function SalesChart({ className }: SalesChartProps) {
  const [activeTab, setActiveTab] = useState("week")
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const { toast } = useToast()

  // Memoizar la función fetchData para evitar recreaciones
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const { start, end } = getDateRange(activeTab as "day" | "week" | "month")

    try {
      const { data: salesData, error } = await supabase
        .from("sales")
        .select("created_at, total_amount")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: true })

      if (error) {
        throw error
      }

      // Process data for chart
      const processedData = processDataForChart(salesData, activeTab as "day" | "week" | "month")
      setData(processedData)
    } catch (error) {
      console.error("Error fetching sales data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de ventas",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, supabase, toast])

  useEffect(() => {
    fetchData()
  }, [activeTab, fetchData])

  // Función para verificar si una venta está dentro del rango de fechas actual
  const isSaleInCurrentRange = useCallback(
    (saleDate: string) => {
      const { start, end } = getDateRange(activeTab as "day" | "week" | "month")
      const date = new Date(saleDate)
      const startDate = new Date(start)
      const endDate = new Date(end)
      return date >= startDate && date <= endDate
    },
    [activeTab],
  )

  // Suscripción en tiempo real a cambios en ventas
  useRealtimeSubscription({
    table: "sales",
    event: "INSERT",
    onEvent: (payload) => {
      if (isSaleInCurrentRange(payload.new.created_at)) {
        fetchData()
      }
    },
  })

  useRealtimeSubscription({
    table: "sales",
    event: "UPDATE",
    onEvent: (payload) => {
      if (isSaleInCurrentRange(payload.new.created_at)) {
        fetchData()
      }
    },
  })

  useRealtimeSubscription({
    table: "sales",
    event: "DELETE",
    onEvent: (payload) => {
      if (isSaleInCurrentRange(payload.old.created_at)) {
        fetchData()
      }
    },
  })

  const processDataForChart = (salesData: any[], period: "day" | "week" | "month") => {
    if (!salesData || salesData.length === 0) {
      // Generar datos de ejemplo si no hay datos
      if (period === "day") {
        return Array.from({ length: 24 }, (_, i) => ({
          name: `${i}:00`,
          total: 0,
        }))
      } else if (period === "week") {
        const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
        return days.map((day) => ({
          name: day,
          total: 0,
        }))
      } else {
        return Array.from({ length: 30 }, (_, i) => ({
          name: (i + 1).toString(),
          total: 0,
        }))
      }
    }

    const groupedData: Record<string, number> = {}

    salesData.forEach((sale) => {
      const date = new Date(sale.created_at)
      let key = ""

      if (period === "day") {
        // Group by hour
        key = `${date.getHours()}:00`
      } else if (period === "week") {
        // Group by day of week
        const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
        key = days[date.getDay()]
      } else if (period === "month") {
        // Group by day of month
        key = date.getDate().toString()
      }

      if (!groupedData[key]) {
        groupedData[key] = 0
      }

      groupedData[key] += sale.total_amount
    })

    // Sort data properly
    let sortedData: [string, number][] = []

    if (period === "day") {
      // Generate all hours of the day
      sortedData = Array.from({ length: 24 }, (_, i) => {
        const hour = `${i}:00`
        return [hour, groupedData[hour] || 0]
      })
    } else if (period === "week") {
      // Sort by day of week
      const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

      sortedData = days.map((day) => [day, groupedData[day] || 0])
    } else if (period === "month") {
      // Generate all days of the month
      sortedData = Array.from({ length: 31 }, (_, i) => {
        const day = (i + 1).toString()
        return [day, groupedData[day] || 0]
      })
    }

    // Calculate average for reference line
    const values = sortedData.map(([_, value]) => value)
    const average = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0

    // Format data for chart
    return sortedData.map(([name, value]) => ({
      name,
      total: value,
      average,
    }))
  }

  // Calculate total for the current period
  const totalAmount = useMemo(() => {
    return data.reduce((sum, item) => sum + item.total, 0)
  }, [data])

  // Calculate average for the current period
  const averageAmount = useMemo(() => {
    return data.length > 0 ? totalAmount / data.length : 0
  }, [data, totalAmount])

  const chartContent = () => {
    if (isLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      )
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: "#4b5563" }}
            axisLine={{ stroke: "#E5E7EB", strokeWidth: 1 }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(value) => formatCurrency(value).replace("COP", "")}
            tick={{ fontSize: 12, fill: "#4b5563" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), "Ventas"]}
            contentStyle={{
              borderRadius: "10px",
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              color: "#333",
              border: "1px solid #e5e7eb",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
              padding: "10px",
            }}
            labelStyle={{ fontWeight: "bold", marginBottom: "5px" }}
            itemStyle={{ padding: "2px 0" }}
          />
          <ReferenceLine
            y={averageAmount}
            stroke="#f59e0b"
            strokeDasharray="3 3"
            label={{
              value: "Promedio",
              position: "insideBottomRight",
              fill: "#f59e0b",
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorTotal)"
            animationDuration={1500}
            animationEasing="ease-in-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  return (
    <Card className={cn("border-none shadow-lg overflow-hidden", className)}>
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 pb-2 border-b border-emerald-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl text-emerald-800 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
              Ventas
            </CardTitle>
            <CardDescription className="text-emerald-600">Resumen de ventas por período</CardDescription>
          </div>
          <div className="mt-4 sm:mt-0">
            <Tabs defaultValue="week" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-white/50">
                <TabsTrigger value="day" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                  Hoy
                </TabsTrigger>
                <TabsTrigger value="week" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                  Esta semana
                </TabsTrigger>
                <TabsTrigger
                  value="month"
                  className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                >
                  Este mes
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="text-2xl font-bold text-emerald-800">{formatCurrency(totalAmount)}</div>
        </div>
      </CardHeader>
      <CardContent className="h-[300px] w-full p-0">{chartContent()}</CardContent>
    </Card>
  )
}
