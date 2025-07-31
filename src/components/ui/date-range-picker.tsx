import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  className?: string
  date?: DateRange
  onDateChange?: (date: DateRange | undefined) => void
  disabled?: boolean
  placeholder?: string
  minDate?: Date
  maxDate?: Date
}

export function DateRangePicker({
  className,
  date,
  onDateChange,
  disabled = false,
  placeholder = "Selecciona un rango de fechas",
  minDate,
  maxDate,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (newDate: DateRange | undefined) => {
    onDateChange?.(newDate)
    // Solo cerrar si ambas fechas están seleccionadas
    if (newDate?.from && newDate?.to) {
      setOpen(false)
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "d 'de' MMM", { locale: es })} -{" "}
                  {format(date.to, "d 'de' MMM, yyyy", { locale: es })}
                </>
              ) : (
                format(date.from, "d 'de' MMM, yyyy", { locale: es })
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
            locale={es}
            disabled={(day) => {
              if (minDate && day < minDate) return true
              if (maxDate && day > maxDate) return true
              return false
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}