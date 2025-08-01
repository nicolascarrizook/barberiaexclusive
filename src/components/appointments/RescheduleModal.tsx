import { useState } from 'react';
import { format, parseISO, addDays, isBefore, isAfter, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Calendar as CalendarIcon, AlertCircle, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { availabilityService } from '@/services/availability.service';
import { appointmentManagementService, type AppointmentListItem } from '@/services/appointment-management.service';

interface RescheduleModalProps {
  appointment: AppointmentListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onReschedule: (appointment: AppointmentListItem) => void;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

export function RescheduleModal({
  appointment,
  isOpen,
  onClose,
  onReschedule,
}: RescheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  if (!appointment) return null;

  // Calculate total duration
  const totalDuration = appointment.services.reduce(
    (sum, service) => sum + service.service.duration_minutes,
    0
  );

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;
    
    setSelectedDate(date);
    setSelectedTime(null);
    setError(null);
    
    // Load available slots for the selected date
    setIsLoadingSlots(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const slots = await availabilityService.getAvailableSlots(
        appointment.barber.id,
        dateStr,
        totalDuration
      );
      
      // Convert to TimeSlot format
      const formattedSlots: TimeSlot[] = slots.map(slot => ({
        time: slot.start_time,
        available: true,
      }));
      
      setAvailableSlots(formattedSlots);
      
      if (formattedSlots.length === 0) {
        setError('No hay horarios disponibles para esta fecha');
      }
    } catch (error) {
      console.error('Error loading slots:', error);
      setError('Error al cargar los horarios disponibles');
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) return;
    
    setIsRescheduling(true);
    setError(null);
    
    try {
      // Create new datetime string
      const newDateTime = `${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}:00`;
      
      // TODO: Implement reschedule in service
      // For now, we'll update the appointment status
      const updatedAppointment = await appointmentManagementService.updateAppointmentStatus(
        appointment.id,
        appointment.status,
        `Reagendado de ${format(parseISO(appointment.start_at), 'dd/MM/yyyy HH:mm')} a ${format(parseISO(newDateTime), 'dd/MM/yyyy HH:mm')}`
      );
      
      // Update the appointment with new time (in production, this would be done by the service)
      const rescheduledAppointment = {
        ...updatedAppointment,
        start_at: newDateTime,
        end_at: format(
          new Date(parseISO(newDateTime).getTime() + totalDuration * 60000),
          "yyyy-MM-dd'T'HH:mm:ss"
        ),
      };
      
      onReschedule(rescheduledAppointment);
      
      toast({
        title: 'Cita reagendada',
        description: `La cita se reagendó para el ${format(selectedDate, 'dd/MM/yyyy')} a las ${selectedTime}`,
      });
      
      onClose();
    } catch (error) {
      console.error('Error rescheduling:', error);
      setError('No se pudo reagendar la cita. Por favor, intenta de nuevo.');
    } finally {
      setIsRescheduling(false);
    }
  };

  // Disable past dates and dates too far in the future
  const disabledDays = (date: Date) => {
    return (
      isBefore(date, startOfDay(new Date())) ||
      isAfter(date, addDays(new Date(), 60))
    );
  };

  const currentDate = parseISO(appointment.start_at);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reagendar cita</DialogTitle>
          <DialogDescription>
            Selecciona una nueva fecha y hora para la cita
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current appointment info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">Cita actual</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{appointment.customer.full_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span>{format(currentDate, 'dd/MM/yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{format(currentDate, 'HH:mm')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Duración:</span>
                <span>{totalDuration} minutos</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date selection */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Selecciona una fecha</h4>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={disabledDays}
                locale={es}
                className="rounded-md border"
              />
            </div>

            {/* Time selection */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Selecciona un horario</h4>
              {selectedDate ? (
                <ScrollArea className="h-[300px] rounded-md border p-4">
                  {isLoadingSlots ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="space-y-2">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot.time}
                          variant={selectedTime === slot.time ? 'default' : 'outline'}
                          className="w-full justify-start"
                          onClick={() => setSelectedTime(slot.time)}
                          disabled={!slot.available}
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          {slot.time}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No hay horarios disponibles</p>
                    </div>
                  )}
                </ScrollArea>
              ) : (
                <div className="h-[300px] rounded-md border flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">
                    Selecciona una fecha primero
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Selected summary */}
          {selectedDate && selectedTime && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">Nueva fecha y hora</h4>
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="outline">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                </Badge>
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {selectedTime}
                </Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleReschedule}
            disabled={!selectedDate || !selectedTime || isRescheduling}
          >
            {isRescheduling ? 'Reagendando...' : 'Confirmar cambio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}