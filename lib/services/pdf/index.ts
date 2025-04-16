// Export all PDF services
export * from './pdf-interfaces'
export * from './pdf-utils'
export * from './sales-report-service'
export * from './order-report-service'
export * from './inventory-report-service'
export * from './invoice-service'

// Helper function to download PDF
export function downloadPDF(doc: any, filename: string) {
  doc.save(filename)
}