import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
// Import the formatCurrency function
import { formatCurrency, formatDateTime } from "@/lib/utils/date"
import { SaleData } from "./pdf-interfaces"
import { addCommonElements, addSectionHeader, addSummaryCard, addStyledTotal, addFooter } from "./pdf-utils"

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
  
      return [
        sale.invoice_number,
        time,
        customerName,
        `${productCount} producto(s)`,
        formatCurrency(sale.total_amount),
      ]
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
    margin: { left: 15, right: 15 } // ✅ Esto está bien aquí
  })  

  // Añadir total con estilo mejorado
  const finalY = (doc as any).lastAutoTable?.finalY + 30 || 200 // Aumentar espacio
  
  // Verificar si hay suficiente espacio en la página actual
  const pageHeight = doc.internal.pageSize.height;
  const remainingSpace = pageHeight - finalY;
  
  // Si no hay suficiente espacio para el total, añadir una nueva página
  if (remainingSpace < 60) {
    doc.addPage();
    addStyledTotal(doc, "TOTAL:", totalAmount, 40, "primary");
  } else {
    addStyledTotal(doc, "TOTAL:", totalAmount, finalY, "primary");
  }

  // Añadir pie de página
  addFooter(doc)

  return doc
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