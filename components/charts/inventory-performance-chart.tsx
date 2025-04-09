"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface ChartItem {
  category: string
  rotacion: number
  stock: number
}

interface InventoryChartProps {
  chartData: ChartItem[]
}

export default function InventoryPerformanceChart({ chartData }: InventoryChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="category" angle={-45} textAnchor="end" height={70} tick={{ fontSize: 12 }} />
        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
        <Tooltip />
        <Legend />
        <Bar yAxisId="left" dataKey="rotacion" name="Índice de Rotación" fill="#8884d8" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="right" dataKey="stock" name="Stock Promedio" fill="#82ca9d" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}