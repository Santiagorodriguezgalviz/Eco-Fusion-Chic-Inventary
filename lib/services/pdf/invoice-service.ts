import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { formatCurrency, formatDateTime } from "@/lib/utils/date"
import { SaleData } from "./pdf-interfaces"
import { addFooter } from "./pdf-utils"

// Función para generar PDF de factura mejorado
export function generateSaleInvoicePDF(sale: SaleData): jsPDF {
  const doc = new jsPDF()
  const date = formatDateTime(sale.created_at)

  // Encabezado con logo y datos de la empresa
  doc.setFillColor(16, 185, 129) // Verde
  doc.rect(0, 0, doc.internal.pageSize.width, 40, "F")

  // Título de la factura
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.text("FACTURA", 15, 20)

  // Número de factura
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Nº: ${sale.invoice_number}`, 15, 30)

  // Nombre de la empresa
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text("ECO FUSION CHIC", doc.internal.pageSize.width - 15, 20, { align: "right" })

  // Fecha
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Fecha: ${date}`, doc.internal.pageSize.width - 15, 30, { align: "right" })

  // Información del cliente
  const clientY = 60
  doc.setFillColor(209, 250, 229) // Verde claro
  doc.roundedRect(15, clientY, doc.internal.pageSize.width - 30, sale.customer ? 40 : 25, 4, 4, "F")

  doc.setTextColor(16, 185, 129) // Verde
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("CLIENTE", 25, clientY + 10)

  doc.setTextColor(31, 41, 55) // Gris oscuro
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")

  if (sale.customer) {
    doc.text(`Nombre: ${sale.customer.name}`, 25, clientY + 20)
    doc.text(`Identificación: ${sale.customer.identification}`, 25, clientY + 30)
    if (sale.customer.phone) {
      doc.text(`Teléfono: ${sale.customer.phone}`, 25, clientY + 40)
    }
  } else {
    doc.text("Cliente no registrado", 25, clientY + 20)
  }

  // Tabla de productos
  const productsY = sale.customer ? clientY + 50 : clientY + 35
  doc.setTextColor(16, 185, 129) // Verde
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("DETALLE DE PRODUCTOS", 15, productsY)

  autoTable(doc, {
    startY: productsY + 10,
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
      0: { cellWidth: "auto" },
      1: { cellWidth: 25, halign: "center" },
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

  // Total
  const finalY = (doc as any).lastAutoTable.finalY + 15
  doc.setFillColor(209, 250, 229) // Verde claro
  doc.roundedRect(doc.internal.pageSize.width - 100, finalY, 85, 25, 4, 4, "F")

  doc.setTextColor(16, 185, 129) // Verde
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("TOTAL:", doc.internal.pageSize.width - 90, finalY + 16)

  doc.setTextColor(5, 150, 105) // Verde oscuro
  doc.setFontSize(16)
  doc.text(formatCurrency(sale.total_amount), doc.internal.pageSize.width - 25, finalY + 16, { align: "right" })

  // Términos y condiciones
  const legalY = finalY + 40
  doc.setTextColor(31, 41, 55) // Gris oscuro
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("CONDICIONES Y POLÍTICA DE DEVOLUCIÓN", 15, legalY)

  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text("• Los productos pueden devolverse en un plazo de 15 días con el recibo original.", 25, legalY + 10)
  doc.text("• Las prendas deben estar en perfecto estado, con etiquetas y embalaje original.", 25, legalY + 18)
  doc.text("• El reembolso se realizará en la misma forma de pago utilizada en la compra.", 25, legalY + 26)

  // Agradecimiento
  doc.setFillColor(209, 250, 229) // Verde claro
  doc.roundedRect(15, legalY + 40, 180, 20, 4, 4, "F")

  doc.setTextColor(5, 150, 105) // Verde oscuro
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("¡Gracias por su compra en Eco Fusion Chic!", doc.internal.pageSize.width / 2, legalY + 53, {
    align: "center",
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