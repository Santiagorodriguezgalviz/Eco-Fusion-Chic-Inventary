import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { formatCurrency } from "@/lib/utils/date"
import { addCommonElements, addSectionHeader, addSummaryCard, addFooter } from "./pdf-utils"

// Función para generar PDF de inventario mejorado
export function generateInventoryReportPDF(products: any[]): jsPDF {
  const doc = new jsPDF()
  const date = new Date().toLocaleDateString()

  // Elementos comunes
  addCommonElements(doc, "INVENTARIO", date)

  // Información del reporte
  const reportInfoY = 70

  // Resumen
  let summaryY = reportInfoY
  summaryY = addSectionHeader(doc, "RESUMEN", summaryY)

  const lowStockCount = products.reduce((count, product) => {
    const lowStockItems = product.inventory.filter((item: any) => item.stock < 5)
    return count + lowStockItems.length
  }, 0)

  // Tarjeta de resumen
  const summaryInfo = [
    { label: "Total de productos:", value: products.length.toString() },
    { label: "Productos con stock bajo:", value: lowStockCount.toString() },
  ]

  summaryY = addSummaryCard(doc, summaryInfo, summaryY)

  // Título de detalle
  let detailY = summaryY + 20
  detailY = addSectionHeader(doc, "DETALLE DE PRODUCTOS", detailY)

  // Preparar datos para la tabla
  const tableData = []

  for (const product of products) {
    const inventoryInfo = product.inventory.map((item: any) => `${item.size}: ${item.stock}`).join(", ")

    tableData.push([
      product.name,
      product.category,
      formatCurrency(product.price),
      formatCurrency(product.cost_price),
      inventoryInfo,
    ])
  }

  // Tabla de productos con estilo
  autoTable(doc, {
    startY: detailY,
    head: [["Nombre", "Categoría", "Precio", "Costo", "Tallas / Stock"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [59, 130, 246], // Azul
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      fontSize: 10,
      cellPadding: 6,
    },
    alternateRowStyles: {
      fillColor: [239, 246, 255], // Azul muy claro
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 35 },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 50 },
    },
    styles: {
      fontSize: 9,
      cellPadding: 5,
      overflow: "linebreak",
    },
    margin: { left: 15, right: 15 },
  })

  // Añadir pie de página
  addFooter(doc)

  return doc
}