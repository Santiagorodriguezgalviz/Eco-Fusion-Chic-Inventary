"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"

// Ahora podemos usar ssr: false de forma segura en un componente cliente
const RechartsComponent = dynamic(
  () => import("@/components/charts/sales-distribution-chart").catch(() => 
    import("@/components/charts/fallback-chart")
  ), 
  {
    ssr: false,
    loading: () => <div className="flex h-[400px] items-center justify-center">Cargando gráfico...</div>
  }
)

interface ChartDataItem {
  name: string
  value: number
  color: string
}

interface ChartContainerProps {
  chartData: ChartDataItem[]
}

export default function ChartContainer({ chartData }: ChartContainerProps) {
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  if (!isMounted) {
    return <div className="flex h-[400px] items-center justify-center">Cargando gráfico...</div>
  }
  
  return <RechartsComponent chartData={chartData} />
}