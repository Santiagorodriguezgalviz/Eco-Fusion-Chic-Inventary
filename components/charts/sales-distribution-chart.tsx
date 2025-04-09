"use client"

import { useState, useEffect } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { formatCurrency } from "@/lib/utils/date"

interface ChartDataItem {
  name: string
  value: number
  color: string
}

interface SalesDistributionChartProps {
  chartData: ChartDataItem[]
}

export default function SalesDistributionChart({ chartData }: SalesDistributionChartProps) {
  // Use client-side only rendering to avoid SSR issues with Recharts
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  if (!isMounted) {
    return <div className="flex h-[400px] items-center justify-center">Cargando gráfico...</div>
  }
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={true}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          labelFormatter={(label) => `Categoría: ${label}`}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}