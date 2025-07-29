import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { TimeSlot } from "@/types";
import { ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DateTimeSelectionProps {
  availableSlots: TimeSlot[];
  selectedDate?: Date;
  selectedTime?: string;
  onSelectDate: (date: Date) => void;
  onSelectTime: (time: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function DateTimeSelection({ 
  availableSlots,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  onNext,
  onBack 
}: DateTimeSelectionProps) {
  const [month, setMonth] = useState<Date>(new Date());

  const disabledDays = {
    before: new Date(),
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Selecciona fecha y hora</h2>
        <p className="text-muted-foreground">Elige el día y horario de tu preferencia</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fecha</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && onSelectDate(date)}
              month={month}
              onMonthChange={setMonth}
              disabled={disabledDays}
              locale={es}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Horarios disponibles
              {selectedDate && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {format(selectedDate, "d 'de' MMMM", { locale: es })}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <p className="text-center text-muted-foreground py-8">
                Selecciona una fecha para ver los horarios disponibles
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={selectedTime === slot.time ? "default" : "outline"}
                    size="sm"
                    disabled={!slot.available}
                    onClick={() => onSelectTime(slot.time)}
                    className="w-full"
                  >
                    {slot.time}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between mt-6">
        <Button 
          onClick={onBack}
          variant="outline"
          size="lg"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Atrás
        </Button>
        <Button 
          onClick={onNext}
          disabled={!selectedDate || !selectedTime}
          size="lg"
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}