import { formatCurrency, formatDateTime } from "@/lib/utils/date"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

// Eliminamos la importación problemática de polyfills
// import "jspdf/dist/polyfills.es"

export interface SaleData {
  id: string
  invoice_number: string
  total_amount: number
  created_at: string
  customer?: {
    id: string
    name: string
    identification: string
    phone: string | null
  } | null
  items: {
    product_name: string
    size_name: string
    quantity: number
    price: number
    subtotal: number
  }[]
}

export interface OrderData {
  id: string
  reference: string | null
  total_cost: number
  status: string
  created_at: string
  arrival_date: string | null
  items: {
    product_name: string
    size_name: string
    quantity: number
    cost_price: number
    subtotal: number
  }[]
}

// Colores de la marca
const brandColors = {
  primary: [16, 185, 129], // #10b981
  primaryLight: [209, 250, 229], // #d1fae5
  secondary: [59, 130, 246], // #3b82f6
  secondaryLight: [219, 234, 254], // #dbeafe
  accent: [249, 115, 22], // #f97316
  accentLight: [255, 237, 213], // #ffedd5
  dark: [31, 41, 55], // #1f2937
  light: [249, 250, 251], // #f9fafb
  gray: [156, 163, 175], // #9ca3af
  grayLight: [243, 244, 246], // #f3f4f6
}

// Función para añadir elementos visuales comunes a todos los reportes
function addCommonElements(doc: jsPDF, title: string, date: string): void {
  // Fondo del encabezado con gradiente
  const width = doc.internal.pageSize.width
  const height = 50

  // Simplificamos el código para evitar problemas con el canvas
  doc.setFillColor(16, 185, 129) // Color verde de Eco Fusion
  doc.rect(0, 0, width, height, "F")

  // Añadir logo o texto estilizado con sombra
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont("helvetica", "bold")
  doc.text("ECO FUSION CHIC", 15, 25)

  // Subtítulo
  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text("Sistema de Inventario", 15, 35)

  // Título del reporte con estilo - CORREGIDO: Movido a la derecha para evitar superposición
  doc.setTextColor(31, 41, 55)
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text(title.toUpperCase(), width / 2 + 30, 25, { align: "center" })

  // Fecha con borde redondeado
  doc.setFillColor(209, 250, 229) // Verde claro
  doc.roundedRect(
    width - 15 - doc.getTextWidth(`Fecha: ${date}`),
    30,
    doc.getTextWidth(`Fecha: ${date}`) + 10,
    10,
    2,
    2,
    "F",
  )
  doc.setTextColor(16, 185, 129) // Color principal
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text(`Fecha: ${date}`, width - 10, 36, { align: "right" })

  // Añadir una línea decorativa
  doc.setDrawColor(16, 185, 129)
  doc.setLineWidth(0.5)
  doc.line(15, 55, width - 15, 55)

  // Simplificamos el código para evitar problemas con GState

  // Añadir numeración de página
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(156, 163, 175) // Gris
    doc.text(`Página ${i} de ${pageCount}`, width - 20, doc.internal.pageSize.height - 10)
  }
}

// Función para decorar secciones
function addSectionHeader(doc: jsPDF, title: string, y: number): number {
  const width = doc.internal.pageSize.width

  // Estilo para encabezado de sección
  doc.setFillColor(209, 250, 229) // Verde claro
  doc.roundedRect(15, y, width - 30, 12, 2, 2, "F")

  doc.setTextColor(16, 85, 69) // Verde oscuro
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text(title, 20, y + 8)

  return y + 18 // Devuelve la nueva posición Y
}

// Función para añadir tarjetas de resumen
function addSummaryCard(doc: jsPDF, info: { label: string; value: string }[], y: number): number {
  const width = doc.internal.pageSize.width
  const cardWidth = width - 30
  const cardHeight = info.length * 12 + 16

  // Fondo de la tarjeta con sombra sutil
  doc.setFillColor(249, 250, 251) // Gris muy claro
  doc.setDrawColor(229, 231, 235) // Gris claro para borde
  doc.roundedRect(15, y, cardWidth, cardHeight, 4, 4, "FD")

  // Contenido de la tarjeta
  doc.setFontSize(10)
  for (let i = 0; i < info.length; i++) {
    // Etiqueta
    doc.setTextColor(107, 114, 128) // Gris medio
    doc.setFont("helvetica", "normal")
    doc.text(info[i].label, 25, y + 16 + i * 12)

    // Valor
    doc.setTextColor(31, 41, 55) // Gris oscuro
    doc.setFont("helvetica", "bold")
    doc.text(info[i].value, cardWidth - 20, y + 16 + i * 12, { align: "right" })
  }

  return y + cardHeight + 10 // Devuelve la nueva posición Y
}

// Función para añadir totales con estilo
function addTotal(doc: jsPDF, total: string, y: number): number {
  const width = doc.internal.pageSize.width

  // Fondo con gradiente para el total
  doc.setFillColor(209, 250, 229) // Verde claro
  doc.roundedRect(width - 160, y, 145, 25, 4, 4, "F")

  // Texto del total
  doc.setTextColor(5, 150, 105) // Verde más oscuro
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("TOTAL:", width - 150, y + 16)

  // Valor del total
  doc.setTextColor(16, 85, 69) // Verde muy oscuro
  doc.setFontSize(18)
  doc.text(total, width - 25, y + 16, { align: "right" })

  return y + 35 // Devuelve la nueva posición Y
}

// Función para añadir pie de página
function addFooter(doc: jsPDF): void {
  const width = doc.internal.pageSize.width
  const height = doc.internal.pageSize.height

  // Línea superior del pie de página
  doc.setDrawColor(229, 231, 235) // Gris claro
  doc.setLineWidth(0.5)
  doc.line(15, height - 25, width - 15, height - 25)

  // Texto del pie de página
  doc.setTextColor(107, 114, 128) // Gris medio
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text("Eco Fusion Chic - Tienda de ropa sostenible", 15, height - 18)
  doc.text(`Documento generado el ${new Date().toLocaleString()}`, 15, height - 12)
}

// Función para generar PDF de factura mejorado
export function generateSaleInvoicePDF(sale: SaleData): jsPDF {
  const doc = new jsPDF()
  const date = formatDateTime(sale.created_at)

  // Elementos comunes
  addCommonElements(doc, "FACTURA", date)

  // Información de la factura con estilo
  const invoiceY = 70

  // Tarjeta de información de factura
  doc.setFillColor(219, 234, 254) // Azul claro
  doc.roundedRect(15, invoiceY, 170, 12, 4, 4, "F")

  doc.setTextColor(37, 99, 235) // Azul
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text(`Factura No: ${sale.invoice_number}`, 25, invoiceY + 8)

  // Información del cliente
  const customerY = invoiceY + 20
  doc.setFillColor(255, 237, 213) // Naranja claro
  doc.roundedRect(15, customerY, 170, 60, 4, 4, "F")

  doc.setTextColor(249, 115, 22) // Naranja
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("INFORMACIÓN DEL CLIENTE", 25, customerY + 10)

  doc.setTextColor(31, 41, 55) // Gris oscuro
  doc.setFontSize(10)

  if (sale.customer) {
    doc.text(`Nombre: ${sale.customer.name}`, 25, customerY + 25)
    doc.text(`Identificación: ${sale.customer.identification}`, 25, customerY + 35)
    if (sale.customer.phone) {
      doc.text(`Teléfono: ${sale.customer.phone}`, 25, customerY + 45)
    }
  } else {
    doc.setFont("helvetica", "italic")
    doc.text("Cliente no registrado", 25, customerY + 25)
  }

  // Título de productos
  let productsY = customerY + 70
  productsY = addSectionHeader(doc, "DETALLE DE PRODUCTOS", productsY)

  // Tabla de productos con estilo
  autoTable(doc, {
    startY: productsY,
    head: [["Producto", "Talla", "Cantidad", "Precio", "Subtotal"]],
    body: sale.items.map((item) => [
      item.product_name,
      item.size_name,
      item.quantity.toString(),
      formatCurrency(item.price),
      formatCurrency(item.subtotal),
    ]),
    theme: "grid",
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      fontSize: 10,
      cellPadding: 6,
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244], // Verde muy claro
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 25, halign: "center" },
      3: { cellWidth: 35, halign: "right" },
      4: { cellWidth: 35, halign: "right" },
    },
    styles: {
      fontSize: 9,
      cellPadding: 5,
      overflow: "linebreak",
    },
    margin: { left: 15, right: 15 },
  })

  // Añadir total con estilo
  const finalY = (doc as any).lastAutoTable.finalY + 15
  addTotal(doc, formatCurrency(sale.total_amount), finalY)

  // Información legal y de pago
  const legalY = finalY + 40
  doc.setFillColor(240, 253, 244) // Verde muy claro
  doc.roundedRect(15, legalY, 180, 50, 4, 4, "F")

  doc.setTextColor(31, 41, 55) // Gris oscuro
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.text("CONDICIONES Y POLÍTICA DE DEVOLUCIÓN", 25, legalY + 10)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.text("• Los productos pueden devolverse en un plazo de 15 días con el recibo original.", 25, legalY + 20)
  doc.text("• Las prendas deben estar en perfecto estado, con etiquetas y embalaje original.", 25, legalY + 28)
  doc.text("• El reembolso se realizará en la misma forma de pago utilizada en la compra.", 25, legalY + 36)

  // Agradecimiento
  doc.setFillColor(209, 250, 229) // Verde claro
  doc.roundedRect(15, legalY + 60, 180, 20, 4, 4, "F")

  doc.setTextColor(5, 150, 105) // Verde oscuro
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("¡Gracias por su compra en Eco Fusion Chic!", doc.internal.pageSize.width / 2, legalY + 73, {
    align: "center",
  })

  // Añadir pie de página
  addFooter(doc)

  return doc
}

// Función para generar PDF de reporte de pedido mejorado
export function generateOrderReportPDF(order: OrderData): jsPDF {
  const doc = new jsPDF()
  const date = formatDateTime(order.created_at)
  const arrivalDate = order.arrival_date ? formatDateTime(order.arrival_date) : "Pendiente"

  // Elementos comunes
  addCommonElements(doc, "PEDIDO", date)

  // Información del pedido con estilo
  const orderInfoY = 70

  // Tarjeta de información de pedido
  doc.setFillColor(219, 234, 254) // Azul claro
  doc.roundedRect(15, orderInfoY, 170, 12, 4, 4, "F")

  doc.setTextColor(37, 99, 235) // Azul
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text(`Referencia: ${order.reference || "Sin referencia"}`, 25, orderInfoY + 8)

  // Estado del pedido
  const statusY = orderInfoY + 20
  const statusColor = order.status === "pending" ? [249, 115, 22] : [16, 185, 129] // Naranja o verde
  const statusBgColor = order.status === "pending" ? [255, 237, 213] : [209, 250, 229] // Naranja claro o verde claro
  const statusText = order.status === "pending" ? "PENDIENTE" : "COMPLETADO"

  doc.setFillColor(statusBgColor[0], statusBgColor[1], statusBgColor[2])
  doc.roundedRect(15, statusY, 170, 50, 4, 4, "F")

  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("ESTADO DEL PEDIDO", 25, statusY + 10)

  // Círculo de estado
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2])
  doc.circle(25, statusY + 25, 5, "F")
  doc.setTextColor(31, 41, 55) // Gris oscuro
  doc.setFontSize(12)
  doc.text(statusText, 35, statusY + 26)

  // Fecha de llegada
  doc.setFontSize(10)
  doc.text(`Fecha de llegada: ${arrivalDate}`, 25, statusY + 40)

  // Título de productos
  let productsY = statusY + 60
  productsY = addSectionHeader(doc, "DETALLE DE PRODUCTOS", productsY)

  // Tabla de productos con estilo
  autoTable(doc, {
    startY: productsY,
    head: [["Producto", "Talla", "Cantidad", "Costo", "Subtotal"]],
    body: order.items.map((item) => [
      item.product_name,
      item.size_name,
      item.quantity.toString(),
      formatCurrency(item.cost_price),
      formatCurrency(item.subtotal),
    ]),
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
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 25, halign: "center" },
      3: { cellWidth: 35, halign: "right" },
      4: { cellWidth: 35, halign: "right" },
    },
    styles: {
      fontSize: 9,
      cellPadding: 5,
      overflow: "linebreak",
    },
    margin: { left: 15, right: 15 },
  })

  // Añadir total con estilo
  const finalY = (doc as any).lastAutoTable.finalY + 15

  doc.setFillColor(219, 234, 254) // Azul claro
  doc.roundedRect(doc.internal.pageSize.width - 160, finalY, 145, 25, 4, 4, "F")

  doc.setTextColor(37, 99, 235) // Azul
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("TOTAL:", doc.internal.pageSize.width - 150, finalY + 16)

  doc.setTextColor(30, 64, 175) // Azul oscuro
  doc.setFontSize(18)
  doc.text(formatCurrency(order.total_cost), doc.internal.pageSize.width - 25, finalY + 16, { align: "right" })

  // Información logística
  const logisticY = finalY + 40
  doc.setFillColor(239, 246, 255) // Azul muy claro
  doc.roundedRect(15, logisticY, 180, 40, 4, 4, "F")

  doc.setTextColor(31, 41, 55) // Gris oscuro
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.text("INFORMACIÓN DE RECEPCIÓN", 25, logisticY + 10)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.text("• Verifique los productos al momento de la recepción para asegurar la calidad.", 25, logisticY + 20)
  doc.text("• Cualquier discrepancia debe ser reportada dentro de las 24 horas.", 25, logisticY + 28)

  // Añadir pie de página
  addFooter(doc)

  return doc
}

// Función para generar PDF de reporte de ventas por día mejorado
export function generateSalesReportPDF(sales: SaleData[], reportTitle: string): jsPDF {
  const doc = new jsPDF()
  const totalAmount = sales.reduce((sum, sale) => sum + sale.total_amount, 0)
  const date = new Date().toLocaleDateString()

  // Elementos comunes
  addCommonElements(doc, "REPORTE DE VENTAS", date)

  // Información del reporte
  const reportInfoY = 70

  // Título específico del reporte
  doc.setFillColor(209, 250, 229) // Verde claro
  doc.roundedRect(15, reportInfoY, doc.internal.pageSize.width - 30, 16, 4, 4, "F")

  doc.setTextColor(5, 150, 105) // Verde oscuro
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text(reportTitle, doc.internal.pageSize.width / 2, reportInfoY + 10, { align: "center" })

  // Resumen
  let summaryY = reportInfoY + 26
  summaryY = addSectionHeader(doc, "RESUMEN", summaryY)

  // Tarjeta de resumen
  const summaryInfo = [
    { label: "Total de ventas:", value: sales.length.toString() },
    { label: "Monto total:", value: formatCurrency(totalAmount) },
  ]

  summaryY = addSummaryCard(doc, summaryInfo, summaryY)

  // Título de detalle
  let detailY = summaryY + 20
  detailY = addSectionHeader(doc, "DETALLE DE VENTAS", detailY)

  // Tabla de ventas con estilo
  autoTable(doc, {
    startY: detailY,
    head: [["Factura", "Hora", "Cliente", "Productos", "Total"]],
    body: sales.map((sale) => {
      const time = new Date(sale.created_at).toLocaleTimeString()
      const customerName = sale.customer ? sale.customer.name : "Cliente no registrado"
      const productCount = sale.items.length

      return [sale.invoice_number, time, customerName, `${productCount} producto(s)`, formatCurrency(sale.total_amount)]
    }),
    theme: "grid",
    headStyles: {
      fillColor: [16, 185, 129], // Verde
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      fontSize: 10,
      cellPadding: 6,
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244], // Verde muy claro
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 30, halign: "center" },
      2: { cellWidth: "auto" },
      3: { cellWidth: 30, halign: "center" },
      4: { cellWidth: 35, halign: "right" },
    },
    styles: {
      fontSize: 9,
      cellPadding: 5,
      overflow: "linebreak",
    },
    margin: { left: 15, right: 15 },
  })

  // Añadir total con estilo
  const finalY = (doc as any).lastAutoTable.finalY + 15
  addTotal(doc, formatCurrency(totalAmount), finalY)

  // Añadir pie de página
  addFooter(doc)

  return doc
}

// Función para generar PDF de inventario mejorado
export function generateInventoryReportPDF(products: any[]): jsPDF {
  const doc = new jsPDF()
  const date = new Date().toLocaleDateString()

  // Elementos comunes - CORREGIDO: Pasamos un título más corto para evitar superposición
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

// Función para generar HTML de factura
export function generateSaleInvoiceHTML(sale: SaleData): string {
  const date = formatDateTime(sale.created_at)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Factura ${sale.invoice_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    :root {
      --color-primary: #10b981;
      --color-primary-light: #d1fae5;
      --color-secondary: #3b82f6;
      --color-secondary-light: #dbeafe;
      --color-accent: #f97316;
      --color-accent-light: #ffedd5;
      --color-dark: #1f2937;
      --color-light: #f9fafb;
      --color-gray: #9ca3af;
      --color-gray-light: #f3f4f6;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: var(--color-dark);
      line-height: 1.5;
      background-color: #f5f5f5;
    }
    
    .invoice-container {
      max-width: 800px;
      margin: 40px auto;
      background: white;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      border-radius: 8px;
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(to right, var(--color-primary), #059669);
      padding: 30px;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .logo {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    
    .invoice-info {
      text-align: right;
    }
    
    .invoice-info h2 {
      font-size: 24px;
      margin-bottom: 8px;
    }
    
    .invoice-details {
      padding: 20px 30px;
      border-bottom: 1px solid var(--color-gray-light);
    }
    
    .customer-info {
      background-color: var(--color-accent-light);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .customer-info h3 {
      color: var(--color-accent);
      margin-bottom: 12px;
      font-size: 18px;
    }
    
    .products-section {
      padding: 20px 30px;
    }
    
    .section-title {
      position: relative;
      margin-bottom: 20px;
      font-size: 18px;
      color: var(--color-primary);
      padding-bottom: 10px;
    }
    
    .section-title::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      width: 60px;
      background-color: var(--color-primary);
      border-radius: 2px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    
    table th, table td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid var(--color-gray-light);
    }
    
    table th {
      background-color: var(--color-primary);
      color: white;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.5px;
    }
    
    table tr:nth-child(even) {
      background-color: var(--color-primary-light);
    }
    
    .total-section {
      text-align: right;
      padding: 0 30px 20px;
    }
    
    .total-amount {
      display: inline-block;
      background-color: var(--color-primary-light);
      padding: 15px 25px;
      border-radius: 8px;
      font-size: 20px;
      font-weight: 700;
      color: var(--color-primary);
    }
    
    .footer {
      text-align: center;
      padding: 20px 30px;
      background-color: var(--color-gray-light);
      color: var(--color-gray);
      font-size: 14px;
    }
    
    .thank-you {
      background-color: var(--color-primary-light);
      color: var(--color-primary);
      text-align: center;
      padding: 15px;
      font-size: 18px;
      font-weight: 600;
      margin: 30px;
      border-radius: 8px;
    }
    
    .legal-notes {
      padding: 0 30px 30px;
      font-size: 12px;
      color: var(--color-gray);
    }
    
    .legal-notes h4 {
      margin-bottom: 10px;
      color: var(--color-dark);
    }
    
    .legal-notes ul {
      padding-left: 20px;
    }
    
    .legal-notes li {
      margin-bottom: 5px;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div>
        <div class="logo">ECO FUSION CHIC</div>
        <div>Sistema de Inventario</div>
      </div>
      <div class="invoice-info">
        <h2>FACTURA</h2>
        <p>Nº: ${sale.invoice_number}</p>
        <p>Fecha: ${date}</p>
      </div>
    </div>
    
    <div class="invoice-details">
      <div class="customer-info">
        <h3>CLIENTE</h3>
        ${
          sale.customer
            ? `
          <p><strong>Nombre:</strong> ${sale.customer.name}</p>
          <p><strong>Identificación:</strong> ${sale.customer.identification}</p>
          ${sale.customer.phone ? `<p><strong>Teléfono:</strong> ${sale.customer.phone}</p>` : ""}
        `
            : "<p>Cliente no registrado</p>"
        }
      </div>
    </div>
    
    <div class="products-section">
      <h3 class="section-title">DETALLE DE PRODUCTOS</h3>
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Talla</th>
            <th>Cantidad</th>
            <th>Precio</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${sale.items
            .map(
              (item) => `
            <tr>
              <td>${item.product_name}</td>
              <td>${item.size_name}</td>
              <td>${item.quantity}</td>
              <td>${formatCurrency(item.price)}</td>
              <td>${formatCurrency(item.subtotal)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
    
    <div class="total-section">
      <div class="total-amount">
        Total: ${formatCurrency(sale.total_amount)}
      </div>
    </div>
    
    <div class="legal-notes">
      <h4>CONDICIONES Y POLÍTICA DE DEVOLUCIÓN</h4>
      <ul>
        <li>Los productos pueden devolverse en un plazo de 15 días con el recibo original.</li>
        <li>Las prendas deben estar en perfecto estado, con etiquetas y embalaje original.</li>
        <li>El reembolso se realizará en la misma forma de pago utilizada en la compra.</li>
      </ul>
    </div>
    
    <div class="thank-you">
      ¡Gracias por su compra en Eco Fusion Chic!
    </div>
    
    <div class="footer">
      <p>Eco Fusion Chic - Tienda de ropa sostenible</p>
      <p>Documento generado el ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
`
}

// Función para generar HTML de reporte de pedido
export function generateOrderReportHTML(order: OrderData): string {
  const date = formatDateTime(order.created_at)
  const arrivalDate = order.arrival_date ? formatDateTime(order.arrival_date) : "Pendiente"

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Pedido ${order.reference || order.id}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    :root {
      --color-primary: #10b981;
      --color-primary-light: #d1fae5;
      --color-secondary: #3b82f6;
      --color-secondary-light: #dbeafe;
      --color-accent: #f97316;
      --color-accent-light: #ffedd5;
      --color-dark: #1f2937;
      --color-light: #f9fafb;
      --color-gray: #9ca3af;
      --color-gray-light: #f3f4f6;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: var(--color-dark);
      line-height: 1.5;
      background-color: #f5f5f5;
    }
    
    .order-container {
      max-width: 800px;
      margin: 40px auto;
      background: white;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      border-radius: 8px;
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(to right, var(--color-secondary), #2563eb);
      padding: 30px;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .logo {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    
    .order-info {
      text-align: right;
    }
    
    .order-info h2 {
      font-size: 24px;
      margin-bottom: 8px;
    }
    
    .order-details {
      padding: 20px 30px;
      border-bottom: 1px solid var(--color-gray-light);
    }
    
    .status-section {
      background-color: ${order.status === "pending" ? "var(--color-accent-light)" : "var(--color-primary-light)"};
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .status-section h3 {
      color: ${order.status === "pending" ? "var(--color-accent)" : "var(--color-primary)"};
      margin-bottom: 12px;
      font-size: 18px;
    }
    
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 30px;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      background-color: ${order.status === "pending" ? "var(--color-accent)" : "var(--color-primary)"};
      color: white;
      margin-bottom: 10px;
    }
    
    .products-section {
      padding: 20px 30px;
    }
    
    .section-title {
      position: relative;
      margin-bottom: 20px;
      font-size: 18px;
      color: var(--color-secondary);
      padding-bottom: 10px;
    }
    
    .section-title::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      width: 60px;
      background-color: var(--color-secondary);
      border-radius: 2px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    
    table th, table td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid var(--color-gray-light);
    }
    
    table th {
      background-color: var(--color-secondary);
      color: white;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.5px;
    }
    
    table tr:nth-child(even) {
      background-color: var(--color-secondary-light);
    }
    
    .total-section {
      text-align: right;
      padding: 0 30px 20px;
    }
    
    .total-amount {
      display: inline-block;
      background-color: var(--color-secondary-light);
      padding: 15px 25px;
      border-radius: 8px;
      font-size: 20px;
      font-weight: 700;
      color: var(--color-secondary);
    }
    
    .footer {
      text-align: center;
      padding: 20px 30px;
      background-color: var(--color-gray-light);
      color: var(--color-gray);
      font-size: 14px;
    }
    
    .logistics-notes {
      padding: 0 30px 30px;
      font-size: 12px;
      color: var(--color-gray);
    }
    
    .logistics-notes h4 {
      margin-bottom: 10px;
      color: var(--color-dark);
    }
    
    .logistics-notes ul {
      padding-left: 20px;
    }
    
    .logistics-notes li {
      margin-bottom: 5px;
    }
  </style>
</head>
<body>
  <div class="order-container">
    <div class="header">
      <div>
        <div class="logo">ECO FUSION CHIC</div>
        <div>Sistema de Inventario</div>
      </div>
      <div class="order-info">
        <h2>PEDIDO</h2>
        <p>Ref: ${order.reference || "Sin referencia"}</p>
        <p>Fecha: ${date}</p>
      </div>
    </div>
    
    <div class="order-details">
      <div class="status-section">
        <h3>ESTADO DEL PEDIDO</h3>
        <div class="status-badge">
          ${order.status === "pending" ? "PENDIENTE" : "COMPLETADO"}
        </div>
        <p><strong>Fecha de llegada:</strong> ${arrivalDate}</p>
      </div>
    </div>
    
    <div class="products-section">
      <h3 class="section-title">DETALLE DE PRODUCTOS</h3>
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Talla</th>
            <th>Cantidad</th>
            <th>Costo</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${order.items
            .map(
              (item) => `
            <tr>
              <td>${item.product_name}</td>
              <td>${item.size_name}</td>
              <td>${item.quantity}</td>
              <td>${formatCurrency(item.cost_price)}</td>
              <td>${formatCurrency(item.subtotal)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
    
    <div class="total-section">
      <div class="total-amount">
        Total: ${formatCurrency(order.total_cost)}
      </div>
    </div>
    
    <div class="logistics-notes">
      <h4>INFORMACIÓN DE RECEPCIÓN</h4>
      <ul>
        <li>Verifique los productos al momento de la recepción para asegurar la calidad.</li>
        <li>Cualquier discrepancia debe ser reportada dentro de las 24 horas.</li>
      </ul>
    </div>
    
    <div class="footer">
      <p>Eco Fusion Chic - Reporte de Pedido</p>
      <p>Documento generado el ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
`
}

// Función para generar HTML de reporte de ventas por día
export function generateSalesReportHTML(sales: SaleData[], date: string): string {
  const totalAmount = sales.reduce((sum, sale) => sum + sale.total_amount, 0)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Reporte de Ventas - ${date}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    :root {
      --color-primary: #10b981;
      --color-primary-light: #d1fae5;
      --color-secondary: #3b82f6;
      --color-secondary-light: #dbeafe;
      --color-accent: #f97316;
      --color-accent-light: #ffedd5;
      --color-dark: #1f2937;
      --color-light: #f9fafb;
      --color-gray: #9ca3af;
      --color-gray-light: #f3f4f6;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: var(--color-dark);
      line-height: 1.5;
      background-color: #f5f5f5;
    }
    
    .report-container {
      max-width: 800px;
      margin: 40px auto;
      background: white;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      border-radius: 8px;
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(to right, var(--color-primary), #059669);
      padding: 30px;
      color: white;
      text-align: center;
    }
    
    .logo {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 10px;
    }
    
    .header h1 {
      font-size: 24px;
      margin-bottom: 5px;
    }
    
    .header h2 {
      font-size: 18px;
      font-weight: 500;
    }
    
    .summary-section {
      padding: 20px 30px;
    }
    
    .summary-card {
      background-color: var(--color-primary-light);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .summary-title {
      color: var(--color-primary);
      margin-bottom: 15px;
      font-size: 18px;
      position: relative;
      padding-bottom: 10px;
    }
    
    .summary-title::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      width: 60px;
      background-color: var(--color-primary);
      border-radius: 2px;
    }
    
    .summary-stats {
      display: flex;
      justify-content: space-between;
    }
    
    .summary-stat {
      text-align: center;
      flex: 1;
    }
    
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--color-primary);
      margin-bottom: 5px;
    }
    
    .stat-label {
      font-size: 14px;
      color: var(--color-gray);
    }
    
    .detail-section {
      padding: 20px 30px;
    }
    
    .section-title {
      position: relative;
      margin-bottom: 20px;
      font-size: 18px;
      color: var(--color-primary);
      padding-bottom: 10px;
    }
    
    .section-title::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      width: 60px;
      background-color: var(--color-primary);
      border-radius: 2px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    
    table th, table td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid var(--color-gray-light);
    }
    
    table th {
      background-color: var(--color-primary);
      color: white;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.5px;
    }
    
    table tr:nth-child(even) {
      background-color: var(--color-primary-light);
    }
    
    .total-section {
      text-align: right;
      padding: 0 30px 20px;
    }
    
    .total-amount {
      display: inline-block;
      background-color: var(--color-primary-light);
      padding: 15px 25px;
      border-radius: 8px;
      font-size: 20px;
      font-weight: 700;
      color: var(--color-primary);
    }
    
    .footer {
      text-align: center;
      padding: 20px 30px;
      background-color: var(--color-gray-light);
      color: var(--color-gray);
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="header">
      <div class="logo">ECO FUSION CHIC</div>
      <h1>Reporte de Ventas</h1>
      <h2>${date}</h2>
    </div>
    
    <div class="summary-section">
      <div class="summary-card">
        <h3 class="summary-title">RESUMEN</h3>
        
        <div class="summary-stats">
          <div class="summary-stat">
            <div class="stat-value">${sales.length}</div>
            <div class="stat-label">Total de ventas</div>
          </div>
          
          <div class="summary-stat">
            <div class="stat-value">${formatCurrency(totalAmount)}</div>
            <div class="stat-label">Monto total</div>
          </div>
          
          <div class="summary-stat">
            <div class="stat-value">${formatCurrency(totalAmount / (sales.length || 1))}</div>
            <div class="stat-label">Promedio por venta</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="detail-section">
      <h3 class="section-title">DETALLE DE VENTAS</h3>
      
      <table>
        <thead>
          <tr>
            <th>Factura</th>
            <th>Hora</th>
            <th>Cliente</th>
            <th>Productos</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${sales
            .map((sale) => {
              const time = new Date(sale.created_at).toLocaleTimeString()
              const customerName = sale.customer ? sale.customer.name : "Cliente no registrado"
              const productCount = sale.items.length

              return `
              <tr>
                <td>${sale.invoice_number}</td>
                <td>${time}</td>
                <td>${customerName}</td>
                <td>${productCount} producto(s)</td>
                <td>${formatCurrency(sale.total_amount)}</td>
              </tr>
            `
            })
            .join("")}
        </tbody>
      </table>
    </div>
    
    <div class="total-section">
      <div class="total-amount">
        Total: ${formatCurrency(totalAmount)}
      </div>
    </div>
    
    <div class="footer">
      <p>Eco Fusion Chic - Reporte de Ventas</p>
      <p>Documento generado el ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
`
}

// Función para enviar factura por WhatsApp
export function sendInvoiceToWhatsApp(sale: SaleData): string {
  if (!sale.customer || !sale.customer.phone) {
    throw new Error("El cliente no tiene número de teléfono registrado")
  }

  // Crear mensaje de WhatsApp
  let message = `*FACTURA ECO FUSION CHIC*

`
  message += `*Factura:* ${sale.invoice_number}
`
  message += `*Fecha:* ${formatDateTime(sale.created_at)}
`
  message += `*Cliente:* ${sale.customer.name}
`
  message += `*Identificación:* ${sale.customer.identification}

`
  message += `*Productos:*
`

  sale.items.forEach((item) => {
    message += `- ${item.product_name} (${item.size_name}) x${item.quantity}: ${formatCurrency(item.subtotal)}
`
  })

  message += `
*Total:* ${formatCurrency(sale.total_amount)}`

  // Formatear número de teléfono (eliminar cualquier carácter que no sea dígito)
  const phone = sale.customer.phone.replace(/\D/g, "")

  // Crear URL de WhatsApp
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

// Función para descargar PDF
export function downloadPDF(doc: jsPDF, filename: string): void {
  doc.save(filename)
}
