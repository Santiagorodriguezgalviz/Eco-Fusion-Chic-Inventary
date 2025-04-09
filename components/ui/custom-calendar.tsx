"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface CustomCalendarProps {
  value: Date | null
  onChange: (date: Date) => void
  className?: string
}

export function CustomCalendar({ value, onChange, className }: CustomCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(value || new Date())
  const [showMonthSelector, setShowMonthSelector] = useState(false)

  // Actualizar el mes actual cuando cambia el valor
  useEffect(() => {
    if (value) {
      setCurrentMonth(value)
    }
  }, [value])

  // Navegar al mes anterior
  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  // Navegar al mes siguiente
  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  // Seleccionar un día
  const handleDayClick = (day: Date) => {
    onChange(day)
  }

  // Obtener los días del mes actual
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Obtener el primer día de la semana (0 = domingo, 1 = lunes, etc.)
  const startDay = monthStart.getDay()

  // Nombres de los días de la semana en español
  const weekDays = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"]

  // Nombres de los meses en español
  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ]

  // Renderizar selector de meses
  const renderMonthSelector = () => {
    return (
      <div className="absolute top-12 left-0 right-0 bg-white border border-emerald-100 rounded-lg shadow-lg z-10 p-2">
        <div className="grid grid-cols-3 gap-2">
          {months.map((month, index) => (
            <button
              key={month}
              onClick={() => {
                const newDate = new Date(currentMonth)
                newDate.setMonth(index)
                setCurrentMonth(newDate)
                setShowMonthSelector(false)
              }}
              className={cn(
                "p-2 rounded-md text-sm hover:bg-emerald-50",
                currentMonth.getMonth() === index ? "bg-emerald-100 text-emerald-800 font-bold" : "",
              )}
            >
              {month}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("custom-calendar bg-white rounded-lg shadow-md overflow-hidden", className)}>
      {/* Cabecera del calendario */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-3 flex items-center justify-between border-b border-emerald-100">
        <button onClick={prevMonth} className="p-1 rounded-full hover:bg-white/50 transition-colors">
          <ChevronLeft className="h-5 w-5 text-emerald-600" />
        </button>

        <button
          onClick={() => setShowMonthSelector(!showMonthSelector)}
          className="font-bold text-emerald-800 hover:text-emerald-600 flex items-center gap-1"
        >
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </button>

        <button onClick={nextMonth} className="p-1 rounded-full hover:bg-white/50 transition-colors">
          <ChevronRight className="h-5 w-5 text-emerald-600" />
        </button>
      </div>

      {/* Selector de meses */}
      <div className="relative">{showMonthSelector && renderMonthSelector()}</div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 text-center py-2 border-b border-emerald-50">
        {weekDays.map((day) => (
          <div key={day} className="text-xs font-medium text-emerald-600">
            {day}
          </div>
        ))}
      </div>

      {/* Días del mes */}
      <div className="grid grid-cols-7 gap-1 p-2">
        {/* Espacios vacíos para alinear el primer día */}
        {Array.from({ length: startDay }).map((_, index) => (
          <div key={`empty-${index}`} className="h-8 w-8" />
        ))}

        {/* Días del mes */}
        {daysInMonth.map((day) => {
          const isSelected = value ? isSameDay(day, value) : false
          const isTodayDate = isToday(day)
          const isCurrentMonth = isSameMonth(day, currentMonth)

          return (
            <button
              key={day.toString()}
              onClick={() => handleDayClick(day)}
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-sm transition-colors",
                isSelected ? "bg-emerald-500 text-white" : "",
                !isSelected && isTodayDate ? "bg-emerald-100 text-emerald-800 font-bold" : "",
                !isSelected && !isTodayDate && isCurrentMonth ? "hover:bg-emerald-50" : "",
                !isCurrentMonth ? "text-gray-300" : "",
              )}
            >
              {format(day, "d")}
            </button>
          )
        })}
      </div>

      {/* Botones de acción */}
      <div className="p-2 border-t border-emerald-100 flex justify-between">
        <button
          onClick={() => onChange(new Date())}
          className="px-3 py-1 text-xs bg-emerald-500 text-white rounded-md hover:bg-emerald-600"
        >
          Hoy
        </button>

        <button
          onClick={() => onChange(new Date())}
          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        >
          Limpiar
        </button>
      </div>
    </div>
  )
}
