import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { formatCurrency, formatDateTime } from "@/lib/utils/date"
import { OrderData } from "./pdf-interfaces"
// Import the utility function
import { addCommonElements, addSectionHeader, addStyledTotal, addFooter } from "./pdf-utils"

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
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      fontSize: 10,
      cellPadding: 6,
    },
    alternateRowStyles: {
      fillColor: [239, 246, 255],
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
    margin: { left: 15, right: 15, top: 0, bottom: 40 } // 👈 Aquí está el margen correcto
  })
  

  // Añadir total con estilo mejorado
  const finalY = (doc as any).lastAutoTable?.finalY + 30 || 200 // Aumentar espacio
  
  // Verificar si hay suficiente espacio en la página actual
  const pageHeight = doc.internal.pageSize.height;
  const remainingSpace = pageHeight - finalY;
  
  // Si no hay suficiente espacio para el total, añadir una nueva página
  if (remainingSpace < 60) {
    doc.addPage();
    addStyledTotal(doc, "TOTAL:", order.total_cost, 40, "secondary");
  } else {
    addStyledTotal(doc, "TOTAL:", order.total_cost, finalY, "secondary");
  }

  // Eliminar este código duplicado que dibuja otro total
  // doc.setFillColor(219, 234, 254) // Azul claro
  // doc.roundedRect(doc.internal.pageSize.width - 160, finalY, 145, 25, 4, 4, "F")
  // doc.setTextColor(37, 99, 235) // Azul
  // doc.setFontSize(16)
  // doc.setFont("helvetica", "bold")
  // doc.text("TOTAL:", doc.internal.pageSize.width - 150, finalY + 16)
  // doc.setTextColor(30, 64, 175) // Azul oscuro
  // doc.setFontSize(18)
  // doc.text(formatCurrency(order.total_cost), doc.internal.pageSize.width - 25, finalY + 16, { align: "right" })

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
    
    .order-info {
      padding: 20px 30px;
      border-bottom: 1px solid var(--color-gray-light);
    }
    
    .reference-card {
      background-color: var(--color-secondary-light);
      border-radius: 8px;
      padding: 15px 20px;
      margin-bottom: 20px;
      color: var(--color-secondary);
      font-weight: 600;
    }
    
    .status-card {
      background-color: ${order.status === "pending" ? "var(--color-accent-light)" : "var(--color-primary-light)"};
      color: ${order.status === "pending" ? "var(--color-accent)" : "var(--color-primary)"};
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .status-card h3 {
      margin-bottom: 15px;
      font-size: 18px;
    }
    
    .status-indicator {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
    }
    
    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: ${order.status === "pending" ? "var(--color-accent)" : "var(--color-primary)"};
      margin-right: 10px;
    }
    
    .arrival-date {
      font-size: 14px;
      opacity: 0.8;
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
    
    .logistics-info {
      margin: 0 30px 30px;
      background-color: var(--color-secondary-light);
      border-radius: 8px;
      padding: 20px;
    }
    
    .logistics-info h4 {
      color: var(--color-secondary);
      margin-bottom: 12px;
      font-size: 16px;
    }
    
    .logistics-info ul {
      list-style-type: none;
    }
    
    .logistics-info li {
      position: relative;
      padding-left: 20px;
      margin-bottom: 8px;
      font-size: 14px;
    }
    
    .logistics-info li::before {
      content: '•';
      position: absolute;
      left: 0;
      color: var(--color-secondary);
      font-weight: bold;
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
  <div class="order-container">
    <div class="header">
      <div class="logo">ECO FUSION CHIC</div>
      <h1>PEDIDO</h1>
      <h2>${date}</h2>
    </div>
    
    <div class="order-info">
      <div class="reference-card">
        Referencia: ${order.reference || "Sin referencia"}
      </div>
      
      <div class="status-card">
        <h3>ESTADO DEL PEDIDO</h3>
        
        <div class="status-indicator">
          <div class="status-dot"></div>
          <div class="status-text">${order.status === "pending" ? "PENDIENTE" : "COMPLETADO"}</div>
        </div>
        
        <div class="arrival-date">
          Fecha de llegada: ${arrivalDate}
        </div>
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
            `
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
    
    <div class="logistics-info">
      <h4>INFORMACIÓN DE RECEPCIÓN</h4>
      <ul>
        <li>Verifique los productos al momento de la recepción para asegurar la calidad.</li>
        <li>Cualquier discrepancia debe ser reportada dentro de las 24 horas.</li>
      </ul>
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