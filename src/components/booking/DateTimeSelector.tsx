import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Clock, Calendar as CalendarIcon, User, ChevronRight, Loader2 } from 'lucide-react';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

// Services
import { availabilityEngine, type AvailabilityResponse, type DayAvailability, type BarberAvailability } from '@/services/availability-engine.service';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

interface SelectedSlot {
  barberId: string;
  barberName: string;
  barberAvatar?: string;
  date: Date;
  startTime: string;
  endTime: string;
}

interface DateTimeSelectorProps {
  barbershopId: string;
  selectedServices: Service[];
  selectedSlot: SelectedSlot | null;
  onNext: (slot: SelectedSlot) => void;
  onBack: () => void;
}

/**
 * DateTimeSelector - Professional Fresha-style date and time selection
 * Features: Calendar view, barber selection, real-time availability
 */
export function DateTimeSelector({
  barbershopId,
  selectedServices,
  selectedSlot,
  onNext,
  onBack,
}: DateTimeSelectorProps) {
  const { toast } = useToast();
  
  // Date selection state
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    selectedSlot?.date || null
  );
  
  // Availability data
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  
  // UI state
  const [selectedBarberSlot, setSelectedBarberSlot] = useState<{
    barberId: string;
    barberName: string;
    barberAvatar?: string;
    startTime: string;
    endTime: string;
  } | null>(null);

  // Load availability when date changes
  useEffect(() => {
    if (selectedDate) {
      loadAvailability(selectedDate);
    }
  }, [selectedDate, selectedServices]);

  /**
   * Load availability for selected date
   */
  const loadAvailability = async (date: Date) => {
    setLoadingAvailability(true);
    
    try {
      const response = await availabilityEngine.getAvailability({
        barbershopId,
        serviceIds: selectedServices.map(s => s.id),
        startDate: date,
        daysToCheck: 1, // Only current day
      });
      
      setAvailability(response);
    } catch (error) {
      console.error('Error loading availability:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la disponibilidad',
        variant: 'destructive',
      });
    } finally {
      setLoadingAvailability(false);
    }
  };

  /**
   * Handle date selection from calendar
   */
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    setSelectedDate(date);
    setSelectedBarberSlot(null); // Reset time selection
  };

  /**
   * Handle time slot selection
   */
  const handleSlotSelect = (barber: BarberAvailability, slot: any) => {
    setSelectedBarberSlot({
      barberId: barber.barberId,
      barberName: barber.barberName,
      barberAvatar: barber.barberAvatar,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  };

  /**
   * Handle continue to next step
   */
  const handleNext = () => {
    if (!selectedDate || !selectedBarberSlot) {
      toast({
        title: 'Selecciona fecha y hora',
        description: 'Debes elegir una fecha y horario para continuar',
        variant: 'destructive',
      });
      return;
    }

    const slot: SelectedSlot = {
      barberId: selectedBarberSlot.barberId,
      barberName: selectedBarberSlot.barberName,
      barberAvatar: selectedBarberSlot.barberAvatar,
      date: selectedDate,
      startTime: selectedBarberSlot.startTime,
      endTime: selectedBarberSlot.endTime,
    };

    onNext(slot);
  };

  /**
   * Format duration display
   */
  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  /**
   * Get available dates for calendar (disable unavailable dates)
   */
  const getDisabledDates = (date: Date) => {
    // Disable past dates
    if (date < startOfDay(new Date())) {
      return true;
    }

    // Disable dates beyond 60 days
    if (date > addDays(new Date(), 60)) {
      return true;
    }

    return false;
  };

  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Selecciona fecha y hora</h2>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>Duración: {formatDuration(totalDuration)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="font-medium">
              {new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: 'ARS',
                minimumFractionDigits: 0,
              }).format(totalPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Services Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Servicios seleccionados:</div>
        <div className="space-y-1">
          {selectedServices.map((service) => (
            <div key={service.id} className="flex justify-between items-center text-sm">
              <span>{service.name}</span>
              <span className="text-gray-500">{formatDuration(service.duration_minutes)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5" />
            <h3 className="font-semibold">Selecciona una fecha</h3>
          </div>
          
          <Calendar
            mode="single"
            selected={selectedDate || undefined}
            onSelect={handleDateSelect}
            disabled={getDisabledDates}
            locale={es}
            className="rounded-lg border shadow-sm"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: "h-7 w-7 bg-transparent p-0 hover:opacity-50",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 rounded-md",
              day_selected: "bg-black text-white hover:bg-black hover:text-white focus:bg-black focus:text-white",
              day_today: "bg-gray-100 text-black",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
              day_hidden: "invisible",
            }}
          />
        </div>

        {/* Time Slots */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <h3 className="font-semibold">Horarios disponibles</h3>
          </div>

          {!selectedDate && (
            <div className="text-center py-12 text-gray-500">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Selecciona una fecha para ver horarios disponibles</p>
            </div>
          )}

          {selectedDate && loadingAvailability && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2 text-gray-500">Cargando disponibilidad...</span>
            </div>
          )}

          {selectedDate && !loadingAvailability && availability && (
            <div className="space-y-6 max-h-96 overflow-y-auto">
              {availability.days.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    No hay horarios disponibles para {format(selectedDate, 'EEEE d \'de\' MMMM', { locale: es })}
                  </p>
                  {availability.nextAvailableSlot && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const nextDate = new Date(availability.nextAvailableSlot!.date);
                        setSelectedDate(nextDate);
                      }}
                      className="space-x-2"
                    >
                      <ChevronRight className="w-4 h-4" />
                      <span>Próxima disponibilidad</span>
                    </Button>
                  )}
                </div>
              ) : (
                availability.days[0].barbers.map((barber) => (
                  <div key={barber.barberId} className="space-y-3">
                    {/* Barber Header */}
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={barber.barberAvatar} alt={barber.barberName} />
                        <AvatarFallback>
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{barber.barberName}</div>
                        <div className="text-sm text-gray-500">
                          {barber.slots.length} horarios disponibles
                        </div>
                      </div>
                    </div>

                    {/* Time Slots Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {barber.slots.map((slot) => {
                        const isSelected = selectedBarberSlot?.barberId === barber.barberId &&
                                         selectedBarberSlot?.startTime === slot.startTime;
                        
                        return (
                          <motion.button
                            key={`${barber.barberId}-${slot.startTime}`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSlotSelect(barber, slot)}
                            className={`
                              py-2 px-3 rounded-lg border text-sm font-medium transition-all
                              ${isSelected
                                ? 'border-black bg-black text-white'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                              }
                            `}
                          >
                            {slot.startTime}
                          </motion.button>
                        );
                      })}
                    </div>

                    {barber !== availability.days[0].barbers[availability.days[0].barbers.length - 1] && (
                      <Separator className="my-4" />
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selected Summary */}
      {selectedDate && selectedBarberSlot && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black text-white rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">Resumen de tu reserva</div>
              <div className="text-sm text-gray-300">
                {format(selectedDate, 'EEEE d \'de\' MMMM', { locale: es })} a las {selectedBarberSlot.startTime}
              </div>
              <div className="text-sm text-gray-300">
                con {selectedBarberSlot.barberName}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">
                {formatDuration(totalDuration)}
              </div>
              <div className="text-sm text-gray-300">duración</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          Atrás
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={!selectedDate || !selectedBarberSlot}
          className="px-8"
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}