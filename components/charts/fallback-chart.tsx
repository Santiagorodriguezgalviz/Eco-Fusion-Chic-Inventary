"use client"

import { formatCurrency } from "@/lib/utils/date"

interface ChartDataItem {
  name: string
  value: number
  color: string
}

interface FallbackChartProps {
  chartData: ChartDataItem[]
}

export default function FallbackChart({ chartData }: FallbackChartProps) {
  const total = chartData.reduce((sum, item) => sum + item.value, 0)
  
  return (
    <div className="h-full w-full flex flex-col justify-center">
      <div className="space-y-4">
        {chartData.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: item.color }} />
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="font-medium">{item.name}</span>
                <span>{formatCurrency(item.value)}</span>
              </div>
              <div className="mt-1 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full" 
                  style={{ 
                    width: `${(item.value / total) * 100}%`,
                    backgroundColor: item.color 
                  }} 
                />
              </div>
              <div className="text-xs text-right mt-1">
                {((item.value / total) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}