import { jsPDF } from "jspdf"
import { formatCurrency } from "@/lib/utils/date"

// Colores de la marca
export const brandColors = {
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
export function addCommonElements(doc: jsPDF, title: string, date: string): void {
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

  // Añadir numeración de página
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(156, 163, 175) // Gris
    doc.text(`Página ${i} de ${pageCount}`, width - 20, doc.internal.pageSize.height - 10)
  }
}

// Función para decorar secciones
export function addSectionHeader(doc: jsPDF, title: string, y: number): number {
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
export function addSummaryCard(doc: jsPDF, info: { label: string; value: string }[], y: number): number {
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
export function addTotal(doc: jsPDF, total: string, y: number): number {
  const width = doc.internal.pageSize.width

  // Fondo con gradiente para el total
  doc.setFillColor(209, 250, 229) // Verde claro
  doc.roundedRect(width - 160, y, 145, 25, 4, 4, "F")
  
  // Add a darker border for emphasis
  doc.setDrawColor(16, 185, 129) // Emerald green border
  doc.setLineWidth(0.8)
  doc.roundedRect(width - 160, y, 145, 25, 4, 4, "S")

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

// Función para añadir total estilizado con borde y fondo especial
export function addStyledTotal(doc: jsPDF, label: string, value: number, y: number, colorScheme: string): number {
  const width = doc.internal.pageSize.width
  const totalFormatted = formatCurrency(value)

  // Lógica para aplicar el esquema de colores dependiendo del valor de colorScheme
  if (colorScheme === "primary") {
    doc.setFillColor(209, 250, 229) // Verde claro
    doc.setDrawColor(16, 185, 129) // Borde verde
  }

  // Contenedor del total estilizado
  doc.setLineWidth(0.8)
  doc.roundedRect(15, y, width - 30, 25, 4, 4, "FD") // Fondo + Borde

  // Etiqueta
  doc.setTextColor(5, 150, 105) // Verde oscuro
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text(label.toUpperCase(), 25, y + 17)

  // Valor del total
  doc.setTextColor(16, 85, 69) // Verde más oscuro
  doc.setFontSize(16)
  doc.text(totalFormatted, width - 25, y + 17, { align: "right" })

  return y + 35
}


// Función para añadir pie de página
export function addFooter(doc: jsPDF): void {
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
