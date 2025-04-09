"use client"

import dynamic from "next/dynamic"
import { useState, useEffect } from "react"

const InventoryChart = dynamic(() => import("./inventory-performance-chart"), {
  ssr: false,
  loading: () => <div className="flex h-[400px] items-center justify-center">Cargando gráfico...</div>,
})

interface ChartItem {
  category: string
  rotacion: number
  stock: number
}

export default function InventoryChartWrapper({ chartData }: { chartData: ChartItem[] }) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <div className="flex h-[400px] items-center justify-center">Cargando gráfico...</div>
  }

  return <InventoryChart chartData={chartData} />
}