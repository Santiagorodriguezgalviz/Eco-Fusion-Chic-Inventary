"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar, ChevronDown } from "lucide-react"
import { CustomCalendar } from "@/components/ui/custom-calendar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DateRangePickerProps {
  startDate: Date | null
  endDate: Date | null
  onStartDateChange: (date: Date | null) => void
  onEndDateChange: (date: Date | null) => void
}

export function DateRangePicker({ startDate, endDate, onStartDateChange, onEndDateChange }: DateRangePickerProps) {
  const [isStartOpen, setIsStartOpen] = useState(false)
  const [isEndOpen, setIsEndOpen] = useState(false)

  return (
    <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicial</label>
        <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal border-emerald-200 hover:bg-emerald-50"
            >
              <Calendar className="mr-2 h-4 w-4 text-emerald-500" />
              {startDate ? (
                format(startDate, "PPP", { locale: es })
              ) : (
                <span className="text-gray-400">Seleccionar fecha inicial</span>
              )}
              <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-auto" align="start">
            <CustomCalendar
              value={startDate}
              onChange={(date) => {
                onStartDateChange(date)
                setIsStartOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha final</label>
        <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal border-emerald-200 hover:bg-emerald-50"
            >
              <Calendar className="mr-2 h-4 w-4 text-emerald-500" />
              {endDate ? (
                format(endDate, "PPP", { locale: es })
              ) : (
                <span className="text-gray-400">Seleccionar fecha final</span>
              )}
              <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-auto" align="start">
            <CustomCalendar
              value={endDate}
              onChange={(date) => {
                onEndDateChange(date)
                setIsEndOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
