"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"

interface ModernCalendarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDateSelect: (date: Date) => void
  title?: string
  actionLabel?: string
}

export function ModernCalendar({
  open,
  onOpenChange,
  onDateSelect,
  title = "Seleccionar fecha",
  actionLabel = "Generar reporte",
}: ModernCalendarProps) {
  const [date, setDate] = useState<Date | undefined>(new Date())

  // Reiniciar la fecha cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      setDate(new Date())
    }
  }, [open])

  const handleConfirm = () => {
    if (date) {
      onDateSelect(date)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="py-6">
          <div className="flex justify-center p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="border-none shadow-none"
              showOutsideDays
            />
          </div>

          <div className="mt-4 text-center text-sm text-gray-500">
            {date ? (
              <p>
                Fecha seleccionada:{" "}
                {date.toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </p>
            ) : (
              <p>Selecciona una fecha para continuar</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!date} className="bg-emerald-600 hover:bg-emerald-700">
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
