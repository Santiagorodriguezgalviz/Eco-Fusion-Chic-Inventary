"use client"

import { useState } from "react"
import { Calendar } from "primereact/calendar"

// Importar estilos de PrimeReact
import "primereact/resources/themes/lara-light-teal/theme.css"
import "primereact/resources/primereact.min.css"
import "primeicons/primeicons.css"

// Configuración para el calendario en español
const spanishLocale = {
  firstDayOfWeek: 1,
  dayNames: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
  dayNamesShort: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
  dayNamesMin: ["D", "L", "M", "X", "J", "V", "S"],
  monthNames: [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ],
  monthNamesShort: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
  today: "Hoy",
  clear: "Limpiar",
  weekHeader: "Sm",
  dateFormat: "dd/mm/yy",
  firstDay: 1,
}

interface PrimeCalendarProps {
  value: Date | null
  onChange: (date: Date | null) => void
  placeholder?: string
  className?: string
  showIcon?: boolean
  showButtonBar?: boolean
  monthNavigator?: boolean
  yearNavigator?: boolean
  yearRange?: string
  minDate?: Date
  maxDate?: Date
  readOnlyInput?: boolean
  disabled?: boolean
  view?: "date" | "month" | "year"
  touchUI?: boolean
}

export function PrimeCalendar({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  className = "",
  showIcon = true,
  showButtonBar = true,
  monthNavigator = true,
  yearNavigator = true,
  yearRange = "2020:2030",
  minDate,
  maxDate,
  readOnlyInput = true,
  disabled = false,
  view = "date",
  touchUI = true,
}: PrimeCalendarProps) {
  // Estado para controlar la vista del calendario (fecha, mes, año)
  const [calendarView, setCalendarView] = useState<"date" | "month" | "year">(view)

  // Función para personalizar la apariencia de los días en el calendario
  const dateTemplate = (date: any) => {
    const day = date.day
    const today = new Date().getDate()
    const currentMonth = new Date().getMonth() === date.month
    const currentYear = new Date().getFullYear() === date.year

    // Destacar el día actual
    if (currentMonth && currentYear && day === today) {
      return (
        <div className="p-1 bg-emerald-100 rounded-full text-emerald-800 font-bold flex items-center justify-center w-7 h-7">
          {day}
        </div>
      )
    }

    // Destacar los fines de semana
    const dayOfWeek = new Date(date.year, date.month, date.day).getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // 0 = domingo, 6 = sábado
      return <div className="text-blue-500">{day}</div>
    }

    return day
  }

  // Función para manejar el cambio de fecha
  const handleDateChange = (e: any) => {
    onChange(e.value)
  }

  // Función para cambiar a la vista de meses
  const switchToMonthView = () => {
    setCalendarView("month")
  }

  return (
    <div className={`prime-calendar-wrapper ${className}`}>
      <Calendar
        value={value}
        onChange={handleDateChange}
        dateFormat="dd/mm/yy"
        placeholder={placeholder}
        showIcon={showIcon}
        showButtonBar={showButtonBar}
        monthNavigator={monthNavigator}
        yearNavigator={yearNavigator}
        yearRange={yearRange}
        minDate={minDate}
        maxDate={maxDate}
        readOnlyInput={readOnlyInput}
        disabled={disabled}
        dateTemplate={dateTemplate}
        panelClassName="border border-emerald-100 rounded-lg shadow-lg"
        className="w-full"
        todayButtonClassName="p-button-success"
        clearButtonClassName="p-button-danger"
        locale={spanishLocale}
        view={calendarView}
        onViewChange={(e) => setCalendarView(e.view as "date" | "month" | "year")}
        touchUI={touchUI}
        pt={{
          root: { className: "w-full" },
          input: {
            className:
              "w-full p-2 border border-emerald-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent",
          },
          dropdownButton: {
            className: "bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100",
          },
          panel: { className: "bg-white border border-emerald-100 rounded-lg shadow-lg" },
          header: { className: "bg-gradient-to-r from-emerald-50 to-teal-50 p-2 border-b border-emerald-100" },
          monthPicker: { className: "grid grid-cols-3 gap-2 p-2" },
          month: { className: "p-2 rounded-md hover:bg-emerald-50 cursor-pointer text-center" },
          yearPicker: { className: "grid grid-cols-3 gap-2 p-2" },
          year: { className: "p-2 rounded-md hover:bg-emerald-50 cursor-pointer text-center" },
          table: { className: "w-full" },
          tableHeader: { className: "border-b border-emerald-100" },
          weekHeader: { className: "text-emerald-600 font-medium" },
          weekNumber: { className: "text-emerald-400 font-light" },
          day: { className: "p-2 rounded-md hover:bg-emerald-50 cursor-pointer text-center" },
          today: { className: "bg-emerald-100 text-emerald-800 font-bold" },
          otherMonthDay: { className: "text-gray-300" },
          selectedDay: { className: "bg-emerald-500 text-white" },
          buttonBar: { className: "p-2 border-t border-emerald-100 flex justify-between" },
          todayButton: { className: "px-3 py-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600" },
          clearButton: { className: "px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600" },
        }}
      />

      {/* Botón para cambiar a vista de meses */}
      <button
        onClick={switchToMonthView}
        className="mt-2 text-xs text-emerald-600 hover:text-emerald-800 flex items-center justify-center w-full"
      >
        Ver meses
      </button>
    </div>
  )
}
