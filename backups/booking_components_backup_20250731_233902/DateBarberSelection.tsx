import React, { useState, useEffect, useMemo } from 'react';
import { format, isToday, isPast, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, CalendarDays, Clock, User, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { Calendar as UICalendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { availabilityService, TimeSlot as AvailabilityTimeSlot } from '@/services/availability.service';
import { useRealtimeAvailability } from '@/hooks/useRealtimeAvailability';
import { Service, Barber } from '@/types';

interface DateBarberSelectionProps {
  services: Service[];
  barbers: Barber[];
  selectedService: Service;
  onSelectBarberAndTime: (barber: Barber, date: Date, time: string) => void;
  onBack: () => void;
}

interface BarberAvailability {
  barber: Barber;
  totalSlots: number;
  availableSlots: number;
  timeSlots: AvailabilityTimeSlot[];
  isLoading: boolean;
  error?: string;
  workingHours?: { start: string; end: string };
}

interface AvailabilityLevel {
  level: 'high' | 'medium' | 'low' | 'none';
  color: string;
  bgColor: string;
  borderColor: string;
  text: string;
}

export function DateBarberSelection({
  services,
  barbers,
  selectedService,
  onSelectBarberAndTime,
  onBack,
}: DateBarberSelectionProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [expandedBarberId, setExpandedBarberId] = useState<string | null>(null);
  const [barberAvailabilities, setBarberAvailabilities] = useState<Map<string, BarberAvailability>>(new Map());
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // Real-time availability updates
  const { availability: realtimeAvailability } = useRealtimeAvailability({
    barberIds: barbers.map(b => b.id),
    onUpdate: (update) => {
      setBarberAvailabilities(prev => {
        const updated = new Map(prev);
        const existing = updated.get(update.barberId);
        if (existing) {
          updated.set(update.barberId, {
            ...existing,
            availableSlots: update.availableSlots,
          });
        }
        return updated;
      });
    },
  });

  // Get availability level styling
  const getAvailabilityLevel = (availableSlots: number, totalSlots: number): AvailabilityLevel => {
    if (totalSlots === 0 || availableSlots === 0) {
      return {
        level: 'none',
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-200',
        text: 'Sin turnos',
      };
    }

    const ratio = availableSlots / totalSlots;
    if (ratio >= 0.7) {
      return {
        level: 'high',
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        text: `${availableSlots} turnos`,
      };
    } else if (ratio >= 0.3) {
      return {
        level: 'medium',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        text: `${availableSlots} turnos`,
      };
    } else {
      return {
        level: 'low',
        color: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        text: `${availableSlots} turno${availableSlots === 1 ? '' : 's'}`,
      };
    }
  };

  // Load availability for all barbers when date changes
  const loadBarbersAvailability = async (date: Date) => {
    if (!selectedService) return;

    setIsLoadingAvailability(true);
    const dateString = format(date, 'yyyy-MM-dd');

    // Create initial loading state for all barbers
    const loadingAvailabilities = new Map<string, BarberAvailability>();
    barbers.forEach(barber => {
      loadingAvailabilities.set(barber.id, {
        barber,
        totalSlots: 0,
        availableSlots: 0,
        timeSlots: [],
        isLoading: true,
      });
    });
    setBarberAvailabilities(loadingAvailabilities);

    try {
      // Use the optimized multi-barber availability method
      const availabilities = await availabilityService.getMultiBarberAvailability({
        barber_ids: barbers.map(b => b.id),
        barbershop_id: barbers[0]?.barbershop_id || '',
        date: dateString,
        service_duration: selectedService.duration_minutes,
      });

      const updatedAvailabilities = new Map<string, BarberAvailability>();
      
      availabilities.forEach(({ barber_id, availability }) => {
        const barber = barbers.find(b => b.id === barber_id);
        if (!barber) return;

        const availableSlots = availability.slots.filter(slot => slot.available).length;
        const timeSlots: AvailabilityTimeSlot[] = availability.slots;

        updatedAvailabilities.set(barber_id, {
          barber,
          totalSlots: availability.slots.length,
          availableSlots,
          timeSlots,
          isLoading: false,
          workingHours: availability.working_hours,
        });
      });

      setBarberAvailabilities(updatedAvailabilities);
    } catch (error) {
      console.error('Error loading barber availabilities:', error);
      
      // Set error state for all barbers
      const errorAvailabilities = new Map<string, BarberAvailability>();
      barbers.forEach(barber => {
        errorAvailabilities.set(barber.id, {
          barber,
          totalSlots: 0,
          availableSlots: 0,
          timeSlots: [],
          isLoading: false,
          error: 'Error al cargar horarios',
        });
      });
      setBarberAvailabilities(errorAvailabilities);
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  // Load availability when component mounts or date changes
  useEffect(() => {
    loadBarbersAvailability(selectedDate);
  }, [selectedDate, selectedService, barbers]);

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setExpandedBarberId(null); // Collapse all barbers when date changes
  };

  // Handle barber expansion
  const handleBarberToggle = (barberId: string) => {
    setExpandedBarberId(expandedBarberId === barberId ? null : barberId);
  };

  // Handle time slot selection
  const handleTimeSelect = (barber: Barber, time: string) => {
    onSelectBarberAndTime(barber, selectedDate, time);
  };

  // Filter past dates
  const isDateDisabled = (date: Date) => {
    return isPast(date) && !isToday(date);
  };

  // Sort barbers by availability (most available first)
  const sortedBarberAvailabilities = useMemo(() => {
    return Array.from(barberAvailabilities.values()).sort((a, b) => {
      // Put working barbers first
      if (a.availableSlots > 0 && b.availableSlots === 0) return -1;
      if (a.availableSlots === 0 && b.availableSlots > 0) return 1;
      
      // Then sort by number of available slots (descending)
      return b.availableSlots - a.availableSlots;
    });
  }, [barberAvailabilities]);

  // Format time for display
  const formatTimeSlot = (time: string) => {
    return format(new Date(`2000-01-01T${time}`), 'HH:mm');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Selecciona fecha y barbero</h2>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Star className="h-4 w-4" />
          <span>{selectedService.name}</span>
          <span>•</span>
          <span>{selectedService.duration_minutes} min</span>
          <span>•</span>
          <span>${selectedService.price}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar Column */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Seleccionar fecha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UICalendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={isDateDisabled}
              locale={es}
              className="w-full"
              modifiers={{
                today: (date) => isToday(date),
              }}
              modifiersClassNames={{
                today: 'bg-blue-100 text-blue-900 font-semibold',
              }}
            />
            
            {/* Selected date info */}
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                </span>
                {isToday(selectedDate) && (
                  <Badge variant="secondary" className="text-xs">
                    Hoy
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Barbers Column */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Barberos disponibles
            </CardTitle>
            {isLoadingAvailability && (
              <div className="text-sm text-muted-foreground">
                Cargando disponibilidad...
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedBarberAvailabilities.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {sortedBarberAvailabilities.map((barberAvailability) => {
                  const { barber, totalSlots, availableSlots, timeSlots, isLoading, error, workingHours } = barberAvailability;
                  const availabilityLevel = getAvailabilityLevel(availableSlots, totalSlots);
                  const isExpanded = expandedBarberId === barber.id;

                  return (
                    <Collapsible key={barber.id} open={isExpanded} onOpenChange={() => handleBarberToggle(barber.id)}>
                      <Card className={cn(
                        "transition-all duration-200",
                        availabilityLevel.borderColor,
                        isExpanded && "ring-2 ring-primary/20"
                      )}>
                        <CollapsibleTrigger asChild>
                          <div className={cn(
                            "flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                            availabilityLevel.bgColor
                          )}>
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={barber.avatar} alt={barber.name} />
                              <AvatarFallback>
                                {barber.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{barber.name}</h3>
                              {barber.specialties && barber.specialties.length > 0 && (
                                <p className="text-sm text-muted-foreground truncate">
                                  {barber.specialties.join(', ')}
                                </p>
                              )}
                              {workingHours && (
                                <p className="text-xs text-muted-foreground">
                                  {formatTimeSlot(workingHours.start)} - {formatTimeSlot(workingHours.end)}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {isLoading ? (
                                <Skeleton className="h-6 w-16" />
                              ) : error ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="destructive" className="text-xs">
                                        Error
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{error}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <Badge 
                                  variant={availableSlots > 0 ? "secondary" : "outline"}
                                  className={cn(
                                    "text-xs",
                                    availabilityLevel.color,
                                    availableSlots > 0 && availabilityLevel.bgColor
                                  )}
                                >
                                  {availabilityLevel.text}
                                </Badge>
                              )}
                              
                              {availableSlots > 0 && (
                                <div className="text-muted-foreground">
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </div>
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        {availableSlots > 0 && (
                          <CollapsibleContent>
                            <Separator />
                            <div className="p-4 pt-3">
                              <div className="flex items-center gap-2 mb-3">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Horarios disponibles</span>
                              </div>
                              
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {timeSlots
                                  .filter(slot => slot.available)
                                  .map((slot) => (
                                    <Button
                                      key={slot.start}
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs hover:bg-primary hover:text-primary-foreground"
                                      onClick={() => handleTimeSelect(barber, slot.start)}
                                    >
                                      {formatTimeSlot(slot.start)}
                                    </Button>
                                  ))}
                              </div>

                              {timeSlots.filter(slot => slot.available).length === 0 && (
                                <Alert>
                                  <AlertDescription>
                                    No hay horarios disponibles para este día.
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>
                          </CollapsibleContent>
                        )}
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            )}

            {/* No barbers available message */}
            {sortedBarberAvailabilities.length > 0 && 
             sortedBarberAvailabilities.every(ba => ba.availableSlots === 0) && (
              <Alert>
                <CalendarDays className="h-4 w-4" />
                <AlertDescription>
                  No hay barberos disponibles para el {format(selectedDate, "d 'de' MMMM", { locale: es })}.
                  Intenta seleccionar otra fecha.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Back Button */}
      <div className="flex justify-start">
        <Button variant="outline" onClick={onBack}>
          Volver a servicios
        </Button>
      </div>
    </div>
  );
}