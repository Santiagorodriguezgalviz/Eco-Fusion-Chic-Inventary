"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DatePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  className?: string
}

export function DatePicker({ date, setDate, className }: DatePickerProps) {
  const [month, setMonth] = React.useState<number>(date ? date.getMonth() : new Date().getMonth())
  const [year, setYear] = React.useState<number>(date ? date.getFullYear() : new Date().getFullYear())

  // Actualizar el mes y año cuando cambia la fecha
  React.useEffect(() => {
    if (date) {
      setMonth(date.getMonth())
      setYear(date.getFullYear())
    }
  }, [date])

  // Generar años para el selector (5 años atrás y 5 años adelante)
  const years = React.useMemo(() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)
  }, [])

  // Generar meses para el selector
  const months = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: format(new Date(2021, i, 1), "MMMM", { locale: es }),
    }))
  }, [])

  // Manejar cambio de mes
  const handleMonthChange = (value: string) => {
    setMonth(Number.parseInt(value))
    if (date) {
      const newDate = new Date(date)
      newDate.setMonth(Number.parseInt(value))
      setDate(newDate)
    }
  }

  // Manejar cambio de año
  const handleYearChange = (value: string) => {
    setYear(Number.parseInt(value))
    if (date) {
      const newDate = new Date(date)
      newDate.setFullYear(Number.parseInt(value))
      setDate(newDate)
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b border-border bg-gradient-to-r from-emerald-50 to-teal-50">
            <div className="flex justify-between items-center gap-2">
              <Select value={month.toString()} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-[140px] h-8 text-sm">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()} className="capitalize">
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={year.toString()} onValueChange={handleYearChange}>
                <SelectTrigger className="w-[90px] h-8 text-sm">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            month={new Date(year, month)}
            onMonthChange={(date) => {
              setMonth(date.getMonth())
              setYear(date.getFullYear())
            }}
            className="border-none p-3"
            locale={es}
          />
          <div className="p-3 border-t border-border bg-muted/20 flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDate(new Date())}
              className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            >
              Hoy
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDate(undefined)}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Limpiar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
