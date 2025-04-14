import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { formatCurrency, getDateRange } from "@/lib/utils/date"
import { StatsCard } from "@/components/dashboard/stats-card"
import { SalesChart } from "@/components/dashboard/sales-chart"
import { ArrowUpRight, Download, DollarSign } from "lucide-react"
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

    // Get total expenses for today
    const { data: todayExpenses, error: todayExpensesError } = await supabase
      .from("expenses")
      .select("amount")
      .gte("created_at", today.start)
      .lte("created_at", today.end)

    if (todayExpensesError) throw todayExpensesError

    // Get total sales for this week
    const { data: weekSales, error: weekError } = await supabase
      .from("sales")
      .select("total_amount")
      .gte("created_at", week.start)
      .lte("created_at", week.end)

    if (weekError) throw weekError

    // Get total expenses for this week
    const { data: weekExpenses, error: weekExpensesError } = await supabase
      .from("expenses")
      .select("amount")
      .gte("created_at", week.start)
      .lte("created_at", week.end)

    if (weekExpensesError) throw weekExpensesError

    // Get total sales for this month
    const { data: monthSales, error: monthError } = await supabase
      .from("sales")
      .select("total_amount")
      .gte("created_at", month.start)
      .lte("created_at", month.end)

    if (monthError) throw monthError

    // Get total expenses for this month
    const { data: monthExpenses, error: monthExpensesError } = await supabase
      .from("expenses")
      .select("amount")
      .gte("created_at", month.start)
      .lte("created_at", month.end)

    if (monthExpensesError) throw monthExpensesError

    // Get total sales for last month
    const { data: lastMonthSales, error: lastMonthError } = await supabase
      .from("sales")
      .select("total_amount")
      .gte("created_at", lastMonth.start)
      .lte("created_at", lastMonth.end)

    if (lastMonthError) throw lastMonthError

    // Get total expenses for last month
    const { data: lastMonthExpenses, error: lastMonthExpensesError } = await supabase
      .from("expenses")
      .select("amount")
      .gte("created_at", lastMonth.start)
      .lte("created_at", lastMonth.end)

    if (lastMonthExpensesError) throw lastMonthExpensesError

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
    const todayExpensesTotal = todayExpenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0
    const todayNetIncome = todayTotal - todayExpensesTotal

    const weekTotal = weekSales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
    const weekExpensesTotal = weekExpenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0
    const weekNetIncome = weekTotal - weekExpensesTotal

    const monthTotal = monthSales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
    const monthExpensesTotal = monthExpenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0
    const monthNetIncome = monthTotal - monthExpensesTotal

    const lastMonthTotal = lastMonthSales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
    const lastMonthExpensesTotal = lastMonthExpenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0
    const lastMonthNetIncome = lastMonthTotal - lastMonthExpensesTotal

    // Calculate month-over-month growth
    const monthGrowth = lastMonthTotal > 0 ? Math.round(((monthTotal - lastMonthTotal) / lastMonthTotal) * 100) : 0
    const netIncomeGrowth = lastMonthNetIncome > 0 ? Math.round(((monthNetIncome - lastMonthNetIncome) / lastMonthNetIncome) * 100) : 0

    return {
      todayTotal,
      todayExpensesTotal,
      todayNetIncome,
      weekTotal,
      weekExpensesTotal,
      weekNetIncome,
      monthTotal,
      monthExpensesTotal,
      monthNetIncome,
      productsCount: productsCount || 0,
      lowStockCount: lowStockCount || 0,
      pendingOrdersCount: pendingOrdersCount || 0,
      monthGrowth,
      netIncomeGrowth,
      customersCount: customersCount || 0,
      newCustomersCount: newCustomersCount || 0,
    }
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return {
      todayTotal: 0,
      todayExpensesTotal: 0,
      todayNetIncome: 0,
      weekTotal: 0,
      weekExpensesTotal: 0,
      weekNetIncome: 0,
      monthTotal: 0,
      monthExpensesTotal: 0,
      monthNetIncome: 0,
      productsCount: 0,
      lowStockCount: 0,
      pendingOrdersCount: 0,
      monthGrowth: 0,
      netIncomeGrowth: 0,
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
          title="Gastos de hoy"
          value={formatCurrency(stats.todayExpensesTotal)}
          iconName="DollarSign"
          iconColor="text-red-500"
          iconBgColor="bg-red-100"
          href="/expenses?filter=today"
        />
        <StatsCard
          title="Ingresos netos (hoy)"
          value={formatCurrency(stats.todayNetIncome)}
          iconName="TrendingUp"
          iconColor="text-emerald-500"
          iconBgColor="bg-emerald-100"
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
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Gastos del mes"
          value={formatCurrency(stats.monthExpensesTotal)}
          iconName="DollarSign"
          iconColor="text-red-500"
          iconBgColor="bg-red-100"
          href="/expenses?filter=month"
        />
        <StatsCard
          title="Ingresos netos (mes)"
          value={formatCurrency(stats.monthNetIncome)}
          iconName="TrendingUp"
          iconColor="text-emerald-500"
          iconBgColor="bg-emerald-100"
          trend={{
            value: stats.netIncomeGrowth,
            isPositive: stats.netIncomeGrowth >= 0,
          }}
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
