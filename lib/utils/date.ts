export const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export const formatDateTime = (date: string | Date) => {
  return new Date(date).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(amount)
}

export const getDateRange = (range: "day" | "today" | "week" | "month") => {
  const now = new Date()
  let startDate = new Date()

  if (range === "day" || range === "today") {
    // Para "day" o "today", establecer la hora al inicio del día actual
    startDate.setHours(0, 0, 0, 0)

    // Para depuración
    console.log("Rango de día:", {
      start: startDate.toISOString(),
      end: now.toISOString(),
      startLocal: startDate.toString(),
      endLocal: now.toString(),
    })
  } else if (range === "week") {
    const day = startDate.getDay()
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1)
    startDate = new Date(startDate.setDate(diff))
    startDate.setHours(0, 0, 0, 0)
  } else if (range === "month") {
    startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    startDate.setHours(0, 0, 0, 0)
  }

  return {
    start: startDate.toISOString(),
    end: now.toISOString(),
  }
}
