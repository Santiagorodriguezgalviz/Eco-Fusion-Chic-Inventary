import { DashboardReportDownload } from "@/components/reports/dashboard-report-download"

export default function DownloadReportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Descargar reportes</h1>
        <p className="text-gray-500">Genera y descarga reportes de ventas, inventario y pedidos</p>
      </div>

      <DashboardReportDownload />
    </div>
  )
}
