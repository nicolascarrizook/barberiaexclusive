import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, Star, ChevronLeft, ChevronRight, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays, isSameDay, isToday, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Barber, Service } from "@/types";
import { availabilityService, AvailabilityData } from "@/services/availability.service";
import { useRealtimeAvailability } from "@/hooks/useRealtimeAvailability";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface UnifiedDateBarberSelectionProps {
  services: Service[];
  barbers: Barber[];
  selectedService: Service;
  onSelectBarberAndTime: (barber: Barber, date: Date, time: string) => void;
  onBack: () => void;
}

interface TimeSlot {
  time: string;
  available: boolean;
  popular?: boolean;
  nextAvailable?: boolean;
}

const DAYS_TO_SHOW = 7;
const POPULAR_TIMES = ["10:00", "11:00", "15:00", "16:00", "17:00"];

export function UnifiedDateBarberSelection({
  barbers,
  selectedService,
  onSelectBarberAndTime,
  onBack,
}: UnifiedDateBarberSelectionProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availabilityData, setAvailabilityData] = useState<Record<string, AvailabilityData>>({});
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: 0, end: DAYS_TO_SHOW });
  const { toast } = useToast();

  // Real-time availability updates
  const { availability: realtimeAvailability } = useRealtimeAvailability(
    barbers.map(b => b.id),
    selectedDate
  );

  // Generate date array for the current view
  const dates = useMemo(() => {
    return Array.from({ length: DAYS_TO_SHOW }, (_, i) => 
      addDays(new Date(), dateRange.start + i)
    );
  }, [dateRange]);

  // Load availability for all barbers on the selected date
  useEffect(() => {
    const loadAvailability = async () => {
      if (!selectedService || barbers.length === 0) return;
      
      setLoading(true);
      try {
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        const availabilityPromises = barbers.map(barber =>
          availabilityService.getDayAvailability({
            barber_id: barber.id,
            barbershop_id: barber.barbershop_id,
            date: dateString,
            service_duration: selectedService.duration_minutes,
          }).then(data => ({ barberId: barber.id, data }))
        );

        const results = await Promise.all(availabilityPromises);
        const availabilityMap: Record<string, AvailabilityData> = {};
        
        results.forEach(({ barberId, data }) => {
          availabilityMap[barberId] = data;
          console.log(`Availability for barber ${barberId}:`, {
            is_available: data.is_available,
            working_hours: data.working_hours,
            break_hours: data.break_hours,
            total_slots: data.slots.length,
            // Mostrar TODOS los slots con break reason para debugging
            break_slots: data.slots.filter(s => s.reason === 'break').map(s => ({
              time: s.start,
              available: s.available,
              reason: s.reason
            })),
            // Mostrar slots que deberían estar disponibles pero no lo están
            unavailable_slots: data.slots.filter(s => !s.available).map(s => ({
              time: s.start,
              reason: s.reason
            }))
          });
        });

        setAvailabilityData(availabilityMap);
      } catch (error) {
        console.error('Error loading availability:', error);
        toast({
          title: 'Error',
          description: 'No se pudo cargar la disponibilidad',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadAvailability();
  }, [selectedDate, selectedService, barbers, toast]);

  // Merge real-time updates with local data
  useEffect(() => {
    if (realtimeAvailability && Object.keys(realtimeAvailability).length > 0) {
      setAvailabilityData(prev => ({
        ...prev,
        ...realtimeAvailability,
      }));
    }
  }, [realtimeAvailability]);

  // Get time slots for a specific barber
  const getBarberTimeSlots = (barberId: string): TimeSlot[] => {
    const barberAvailability = availabilityData[barberId];
    if (!barberAvailability || !barberAvailability.slots) return [];

    const now = new Date();
    const isToday = isSameDay(selectedDate, now);
    const currentTime = format(now, 'HH:mm');

    // Debug: ver qué slots vienen del servicio
    const allSlots = barberAvailability.slots.map(s => ({
      time: s.start.slice(0, 5),
      available: s.available,
      reason: s.reason
    }));
    
    // Mostrar el servicio seleccionado
    console.log(`Service duration: ${selectedService?.duration_minutes} minutes`);
    console.log(`All unavailable slots for barber ${barberId}:`, allSlots.filter(s => !s.available));

    let firstAvailable = true;
    return barberAvailability.slots
      .filter(slot => {
        // IMPORTANTE: El slot debe estar marcado como available: true
        // Si available es false, no importa la razón, no se muestra
        if (!slot.available) {
          // Debug para ver qué slots se están filtrando
          console.log(`Filtering out slot ${slot.start.slice(0, 5)} - reason: ${slot.reason}`);
          return false;
        }
        
        // Si es hoy, filtrar los horarios que ya pasaron
        if (isToday) {
          const slotTime = slot.start.slice(0, 5);
          return slotTime > currentTime;
        }
        
        return true;
      })
      .map(slot => ({
        time: slot.start.slice(0, 5),
        available: true, // Todos los slots que llegan aquí están disponibles
        popular: POPULAR_TIMES.includes(slot.start.slice(0, 5)),
        nextAvailable: firstAvailable ? (firstAvailable = false, true) : false,
      }));
  };

  // Calculate availability level for a barber
  const getAvailabilityLevel = (barberId: string): { level: string; color: string; percentage: number; isWorking: boolean } => {
    const barberAvailability = availabilityData[barberId];
    if (!barberAvailability || !barberAvailability.slots) {
      return { level: 'Sin disponibilidad', color: 'text-muted-foreground', percentage: 0, isWorking: false };
    }

    // Verificar si el barbero trabaja ese día
    if (!barberAvailability.is_available) {
      // Buscar la razón en los slots
      const firstSlot = barberAvailability.slots[0];
      if (firstSlot && firstSlot.reason === 'outside_hours') {
        return { level: 'No trabaja este día', color: 'text-muted-foreground', percentage: 0, isWorking: false };
      }
      return { level: 'Sin disponibilidad', color: 'text-muted-foreground', percentage: 0, isWorking: false };
    }

    const now = new Date();
    const isToday = isSameDay(selectedDate, now);
    const currentTime = format(now, 'HH:mm');

    // Contar solo los slots válidos (futuros si es hoy)
    const validSlots = barberAvailability.slots.filter(slot => {
      if (isToday) {
        const slotTime = slot.start.slice(0, 5);
        return slotTime > currentTime;
      }
      return true;
    });

    const availableCount = validSlots.filter(slot => slot.available).length;
    const totalCount = validSlots.length;
    const percentage = totalCount > 0 ? (availableCount / totalCount) * 100 : 0;

    if (percentage >= 70) return { level: 'Alta disponibilidad', color: 'text-muted-foreground', percentage, isWorking: true };
    if (percentage >= 40) return { level: 'Disponibilidad media', color: 'text-muted-foreground', percentage, isWorking: true };
    if (percentage > 0) return { level: 'Poca disponibilidad', color: 'text-muted-foreground', percentage, isWorking: true };
    return { level: 'Sin disponibilidad', color: 'text-muted-foreground', percentage: 0, isWorking: true };
  };

  // Auto-select next available slot when a barber is selected
  useEffect(() => {
    if (selectedBarber && !selectedTime) {
      const slots = getBarberTimeSlots(selectedBarber.id);
      const nextAvailable = slots.find(s => s.available);
      if (nextAvailable) {
        setSelectedTime(nextAvailable.time);
      }
    }
  }, [selectedBarber, selectedTime]);

  const handleConfirm = () => {
    if (selectedBarber && selectedTime) {
      onSelectBarberAndTime(selectedBarber, selectedDate, selectedTime);
    }
  };

  const navigateDates = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && dateRange.start > 0) {
      setDateRange(prev => ({ 
        start: Math.max(0, prev.start - DAYS_TO_SHOW), 
        end: prev.start 
      }));
    } else if (direction === 'next') {
      setDateRange(prev => ({ 
        start: prev.end, 
        end: prev.end + DAYS_TO_SHOW 
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Elige fecha y barbero</h2>
          <p className="text-muted-foreground mt-1">
            {selectedService.name} • {selectedService.duration_minutes} min • ${selectedService.price}
          </p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Cambiar servicio
        </Button>
      </div>

      {/* Date selector with week view */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Selecciona una fecha
          </h3>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigateDates('prev')}
              disabled={dateRange.start === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigateDates('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {dates.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            const isCurrentDay = isToday(date);
            
            return (
              <motion.button
                key={date.toISOString()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "flex flex-col items-center p-3 rounded-lg border transition-all",
                  isSelected 
                    ? "ring-2 ring-primary border-primary" 
                    : "hover:bg-accent",
                  isCurrentDay && !isSelected && "border-primary"
                )}
              >
                <span className="text-xs opacity-70">
                  {format(date, 'EEE', { locale: es })}
                </span>
                <span className="text-lg font-semibold mt-1">
                  {format(date, 'd')}
                </span>
                {isCurrentDay && (
                  <Badge variant="secondary" className="mt-1 text-[10px] px-1">
                    Hoy
                  </Badge>
                )}
              </motion.button>
            );
          })}
        </div>
      </Card>

      {/* Barbers with integrated time slots */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <User className="h-4 w-4" />
          Selecciona barbero y horario
        </h3>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-20 w-full" />
              </Card>
            ))}
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <AnimatePresence>
              {barbers.map((barber) => {
                const availability = getAvailabilityLevel(barber.id);
                const timeSlots = getBarberTimeSlots(barber.id);
                const isSelected = selectedBarber?.id === barber.id;
                const hasAvailability = availability.percentage > 0 && availability.isWorking;

                return (
                  <motion.div
                    key={barber.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mb-4"
                  >
                    <Card 
                      className={cn(
                        "p-4 cursor-pointer transition-all",
                        isSelected && "ring-2 ring-primary",
                        !hasAvailability && "opacity-60"
                      )}
                      onClick={() => hasAvailability && setSelectedBarber(barber)}
                    >
                      <div className="flex items-start gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage 
                            src={barber.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${barber.name}`} 
                            alt={barber.name}
                          />
                          <AvatarFallback>{barber.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-lg">{barber.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span className="text-sm font-medium">4.8</span>
                                  <span className="text-sm text-muted-foreground">(127)</span>
                                </div>
                                {barber.specialties && (
                                  <>
                                    <Separator orientation="vertical" className="h-4" />
                                    <div className="flex gap-1">
                                      {barber.specialties.slice(0, 2).map((specialty) => (
                                        <Badge key={specialty} variant="secondary" className="text-xs">
                                          {specialty}
                                        </Badge>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={cn("ml-2", availability.color)}
                            >
                              {availability.level}
                            </Badge>
                          </div>

                          {/* Time slots grid */}
                          {isSelected && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4"
                            >
                              {timeSlots.length > 0 ? (
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                  {timeSlots.map((slot) => (
                                    <Button
                                      key={slot.time}
                                      size="sm"
                                      variant={selectedTime === slot.time ? "default" : "outline"}
                                      className={cn(
                                        "relative",
                                        !slot.available && "opacity-50 cursor-not-allowed"
                                      )}
                                      disabled={!slot.available}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (slot.available) {
                                          setSelectedTime(slot.time);
                                        }
                                      }}
                                    >
                                      {slot.time}
                                    </Button>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-4 text-muted-foreground">
                                  {isSameDay(selectedDate, new Date()) 
                                    ? "No hay horarios disponibles para hoy"
                                    : "No hay horarios disponibles para este día"}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </ScrollArea>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-4">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="flex-1"
        >
          Atrás
        </Button>
        <Button 
          onClick={handleConfirm}
          disabled={!selectedBarber || !selectedTime}
          className="flex-1"
        >
          <Clock className="mr-2 h-4 w-4" />
          Confirmar {selectedTime && `a las ${selectedTime}`}
        </Button>
      </div>
    </div>
  );
}