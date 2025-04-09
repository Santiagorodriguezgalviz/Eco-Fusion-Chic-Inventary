"use client"

import Link from "next/link"
import { 
  BarChart3, ShoppingCart, Users, 
  LucideIcon, 
} from "lucide-react"

interface StatsCardProps {
  title: string
  value: string
  description?: string
  iconName: string
  iconColor: string
  iconBgColor: string
  trend?: {
    value: number
    isPositive: boolean
  }
  href?: string
}

// Map of icon names to components
const iconMap: Record<string, LucideIcon> = {
  BarChart3,
  ShoppingCart,
  Users,
}

export function StatsCard({
  title,
  value,
  description,
  iconName,
  iconColor,
  iconBgColor,
  trend,
  href,
}: StatsCardProps) {
  const IconComponent = iconMap[iconName] || BarChart3

  const content = (
    <div className="rounded-lg border bg-white p-6 shadow-sm h-full">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <div className={`rounded-full p-2 ${iconBgColor}`}>
            <IconComponent className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
        <div className="mt-auto">
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <div className="mt-1 flex items-center">
              <span
                className={`text-xs font-medium ${
                  trend.isPositive ? "text-green-500" : "text-red-500"
                }`}
              >
                {trend.isPositive ? "+" : "-"} {Math.abs(trend.value)}%
              </span>
              <span className="ml-1 text-xs text-gray-500">(desde el mes pasado)</span>
            </div>
          )}
          {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
        </div>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href} className="block h-full">{content}</Link>
  }

  return content
}
