import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { formatCurrency, getDateRange } from "@/lib/utils/date"
import { StatsCard } from "@/components/dashboard/stats-card"
import { SalesChart } from "@/components/dashboard/sales-chart"
import { ArrowUpRight, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { DashboardInventoryCard } from "@/components/dashboard/dashboard-inventory-card"
import { DashboardOrdersCard } from "@/components/dashboard/dashboard-orders-card"
import { TopSellingProducts } from "@/components/dashboard/top-selling-products"

export const dynamic = "force-dynamic"

async function getStats() {
  const supabase = createClient()
  const today = getDateRange("day")
  const week = getDateRange("week")
  const month = getDateRange("month")
  const lastMonth = {
    start: new Date(new Date().setMonth(new Date().getMonth() - 1, 1)).toISOString(),
    end: new Date(new Date().setDate(0)).toISOString(),
  }

  try {
    // Get total sales for today
    const { data: todaySales, error: todayError } = await supabase
      .from("sales")
      .select("total_amount")
      .gte("created_at", today.start)
      .lte("created_at", today.end)

    if (todayError) throw todayError

    // Get total sales for this week
    const { data: weekSales, error: weekError } = await supabase
      .from("sales")
      .select("total_amount")
      .gte("created_at", week.start)
      .lte("created_at", week.end)

    if (weekError) throw weekError

    // Get total sales for this month
    const { data: monthSales, error: monthError } = await supabase
      .from("sales")
      .select("total_amount")
      .gte("created_at", month.start)
      .lte("created_at", month.end)

    if (monthError) throw monthError

    // Get total sales for last month
    const { data: lastMonthSales, error: lastMonthError } = await supabase
      .from("sales")
      .select("total_amount")
      .gte("created_at", lastMonth.start)
      .lte("created_at", lastMonth.end)

    if (lastMonthError) throw lastMonthError

    // Get total products in inventory
    const { count: productsCount, error: productsError } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })

    if (productsError) throw productsError

    // Get total inventory items with low stock (less than 5)
    const { count: lowStockCount, error: lowStockError } = await supabase
      .from("inventory")
      .select("*", { count: "exact", head: true })
      .lt("stock", 5)

    if (lowStockError) throw lowStockError

    // Get pending orders
    const { count: pendingOrdersCount, error: pendingOrdersError } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")

    if (pendingOrdersError) throw pendingOrdersError

    // Get total customers
    const { count: customersCount, error: customersError } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })

    if (customersError) throw customersError

    // Get new customers this month
    const { count: newCustomersCount, error: newCustomersError } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .gte("created_at", month.start)

    if (newCustomersError) throw newCustomersError

    // Calculate totals
    const todayTotal = todaySales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
    const weekTotal = weekSales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
    const monthTotal = monthSales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
    const lastMonthTotal = lastMonthSales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0

    // Calculate month-over-month growth
    const monthGrowth = lastMonthTotal > 0 ? Math.round(((monthTotal - lastMonthTotal) / lastMonthTotal) * 100) : 0

    return {
      todayTotal,
      weekTotal,
      monthTotal,
      productsCount: productsCount || 0,
      lowStockCount: lowStockCount || 0,
      pendingOrdersCount: pendingOrdersCount || 0,
      monthGrowth,
      customersCount: customersCount || 0,
      newCustomersCount: newCustomersCount || 0,
    }
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return {
      todayTotal: 0,
      weekTotal: 0,
      monthTotal: 0,
      productsCount: 0,
      lowStockCount: 0,
      pendingOrdersCount: 0,
      monthGrowth: 0,
      customersCount: 0,
      newCustomersCount: 0,
    }
  }
}

export default async function DashboardPage() {
  const stats = await getStats()

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-500">Resumen de ventas, inventario y pedidos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/reports/download">
              <Download className="mr-2 h-4 w-4" />
              Descargar reporte
            </Link>
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" asChild>
            <Link href="/reports/analysis">
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Ver análisis
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Ventas de hoy"
          value={formatCurrency(stats.todayTotal)}
          iconName="ShoppingCart"
          iconColor="text-pink-500"
          iconBgColor="bg-pink-100"
          href="/sales?filter=today"
        />
        <StatsCard
          title="Ventas de la semana"
          value={formatCurrency(stats.weekTotal)}
          iconName="ShoppingCart"
          iconColor="text-blue-500"
          iconBgColor="bg-blue-100"
          href="/sales?filter=week"
        />
        <StatsCard
          title="Ventas del mes"
          value={formatCurrency(stats.monthTotal)}
          iconName="BarChart3"
          iconColor="text-green-500"
          iconBgColor="bg-green-100"
          trend={{
            value: stats.monthGrowth,
            isPositive: stats.monthGrowth >= 0,
          }}
          href="/sales?filter=month"
        />
        <StatsCard
          title="Clientes"
          value={stats.customersCount.toString()}
          description={`${stats.newCustomersCount} nuevos este mes`}
          iconName="Users"
          iconColor="text-purple-500"
          iconBgColor="bg-purple-100"
          href="/customers"
        />
      </div>

      <div className="grid gap-6">
        <Suspense fallback={<div className="h-[400px] rounded-lg bg-gray-100 animate-pulse"></div>}>
          <SalesChart />
        </Suspense>

        <div className="grid gap-6 md:grid-cols-2">
          <DashboardInventoryCard productsCount={stats.productsCount} lowStockCount={stats.lowStockCount} />
          <DashboardOrdersCard pendingOrdersCount={stats.pendingOrdersCount} />
        </div>

        <div className="grid gap-6">
          <Suspense fallback={<div className="h-[300px] rounded-lg bg-gray-100 animate-pulse"></div>}>
            <TopSellingProducts />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
