import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { TimeSlot, Service, Barber } from "@/types";
import { ChevronLeft, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { availabilityService } from "@/services/availability.service";
import { holidaysService } from "@/services/holidays.service";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { realtimeService } from "@/services/realtime.service";

const getReasonText = (reason: string): string => {
  const reasonTexts = {
    appointment: 'Cita reservada',
    break: 'Horario de descanso',
    time_off: 'Vacaciones',
    closed: 'Barbería cerrada',
    outside_hours: 'Fuera de horario'
  };
  return reasonTexts[reason as keyof typeof reasonTexts] || 'No disponible';
};

const getSlotDisabledStyle = (reason?: string): string => {
  const baseStyle = 'cursor-not-allowed opacity-75';
  
  switch (reason) {
    case 'appointment':
      return `${baseStyle} border-red-300 bg-red-50 text-red-700 hover:bg-red-50`;
    case 'break':
      return `${baseStyle} border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-50`;
    case 'time_off':
      return `${baseStyle} border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-50`;
    case 'closed':
      return `${baseStyle} border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-50`;
    case 'outside_hours':
      return `${baseStyle} border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-50`;
    default:
      return `${baseStyle} border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-50`;
  }
};

interface DateTimeSelectionProps {
  availableSlots: TimeSlot[];
  selectedDate?: Date;
  selectedTime?: string;
  selectedService?: Service;
  selectedBarber?: Barber;
  onSelectDate: (date: Date) => void;
  onSelectTime: (time: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function DateTimeSelection({
  availableSlots,
  selectedDate,
  selectedTime,
  selectedService,
  selectedBarber,
  onSelectDate,
  onSelectTime,
  onNext,
  onBack,
}: DateTimeSelectionProps) {
  const { toast } = useToast();
  const [month, setMonth] = useState<Date>(new Date());
  const [dynamicSlots, setDynamicSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [disabledDates, setDisabledDates] = useState<Date[]>([]);
  const [isLoadingDisabledDates, setIsLoadingDisabledDates] = useState(true);

  // Load holidays and disabled dates
  useEffect(() => {
    const loadDisabledDates = async () => {
      if (!selectedBarber?.barbershop_id) return;

      try {
        setIsLoadingDisabledDates(true);
        const currentYear = new Date().getFullYear();
        const holidays = await holidaysService.getActiveHolidays(
          selectedBarber.barbershop_id,
          `${currentYear}-01-01`,
          `${currentYear + 1}-12-31`
        );

        const holidayDates = holidays.map((holiday) => new Date(holiday.date));
        setDisabledDates(holidayDates);
      } catch (error) {
        console.error('Error loading disabled dates:', error);
      } finally {
        setIsLoadingDisabledDates(false);
      }
    };

    loadDisabledDates();
  }, [selectedBarber]);

  // Load slots when date, service, or barber changes
  useEffect(() => {
    const loadSlots = async () => {
      if (!selectedDate || !selectedService || !selectedBarber?.barbershop_id) {
        setDynamicSlots([]);
        return;
      }

      setIsLoadingSlots(true);
      try {
        const dayAvailability = await availabilityService.getDayAvailability({
          barber_id: selectedBarber.id,
          barbershop_id: selectedBarber.barbershop_id,
          date: selectedDate.toISOString().split('T')[0],
          service_duration: selectedService.duration_minutes,
        });

        const slots: TimeSlot[] = dayAvailability.slots.map((slot) => ({
          time: slot.start.substring(0, 5), // Extract HH:MM from HH:MM:SS
          available: slot.available,
          reason: slot.reason,
          reasonText: slot.reason ? getReasonText(slot.reason) : undefined,
        }));

        setDynamicSlots(slots);
      } catch (error) {
        console.error('Error loading time slots:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los horarios disponibles',
          variant: 'destructive',
        });
        setDynamicSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    loadSlots();
  }, [selectedDate, selectedService, selectedBarber, toast]);

  // Subscribe to real-time slot updates
  useEffect(() => {
    if (!selectedBarber?.id || !selectedDate) return;

    const dateString = selectedDate.toISOString().split('T')[0];
    
    // Subscribe to slot changes for this specific barber and date
    const unsubscribe = realtimeService.subscribeToSlotUpdates(
      selectedBarber.id,
      dateString,
      {
        onSlotChange: async () => {
          // Reload slots when appointments change
          if (selectedService && selectedBarber.barbershop_id) {
            try {
              const dayAvailability = await availabilityService.getDayAvailability({
                barber_id: selectedBarber.id,
                barbershop_id: selectedBarber.barbershop_id,
                date: dateString,
                service_duration: selectedService.duration_minutes,
              });

              const slots: TimeSlot[] = dayAvailability.slots.map((slot) => ({
                time: slot.start.substring(0, 5),
                available: slot.available,
                reason: slot.reason,
                reasonText: slot.reason ? getReasonText(slot.reason) : undefined,
              }));

              setDynamicSlots(slots);
              
              // Show toast notification
              toast({
                title: 'Horarios actualizados',
                description: 'Los horarios disponibles han sido actualizados',
              });
            } catch (error) {
              console.error('Error updating slots in real-time:', error);
            }
          }
        },
        onStatusChange: (status) => {
          if (status === 'error') {
            console.error('Real-time connection error');
          }
        },
      }
    );

    return () => {
      unsubscribe();
    };
  }, [selectedBarber?.id, selectedDate, selectedService, toast]);

  // Use dynamic slots if available, otherwise fall back to passed slots
  const slotsToShow =
    selectedDate && selectedService && selectedBarber
      ? dynamicSlots
      : availableSlots;

  const disabledDays = {
    before: new Date(),
    dates: disabledDates,
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Selecciona fecha y hora</h2>
        <p className="text-muted-foreground">
          Elige el día y horario de tu preferencia
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fecha</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingDisabledDates ? (
              <Skeleton className="h-64 w-full" />
            ) : (
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
            )}
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
            ) : isLoadingSlots ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : slotsToShow.length === 0 ? (
              <div className="text-center py-8">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No hay horarios disponibles para esta fecha.
                    {selectedService && selectedBarber && (
                      <span className="block mt-2 text-sm">
                        Intenta seleccionar otra fecha o barbero.
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="space-y-3">
                <TooltipProvider>
                  <div className="grid grid-cols-3 gap-2">
                    {slotsToShow.map((slot) => {
                      const SlotButton = (
                        <Button
                          key={slot.time}
                          variant={
                            selectedTime === slot.time ? 'default' : 'outline'
                          }
                          size="sm"
                          disabled={!slot.available}
                          onClick={() => slot.available && onSelectTime(slot.time)}
                          className={`w-full transition-all duration-200 ${
                            !slot.available
                              ? getSlotDisabledStyle(slot.reason)
                              : 'hover:shadow-sm'
                          }`}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {slot.time}
                        </Button>
                      );

                      if (!slot.available && slot.reasonText) {
                        return (
                          <Tooltip key={slot.time}>
                            <TooltipTrigger asChild>
                              {SlotButton}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{slot.reasonText}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      return SlotButton;
                    })}
                  </div>
                </TooltipProvider>
                <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Disponible</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-300 rounded-full"></div>
                    <span>Cita reservada</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
                    <span>Descanso</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span>No disponible</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between mt-6">
        <Button onClick={onBack} variant="outline" size="lg">
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
