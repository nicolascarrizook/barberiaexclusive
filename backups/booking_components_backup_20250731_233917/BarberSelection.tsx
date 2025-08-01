import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Barber, Service } from "@/types";
import { ChevronLeft, Clock, CalendarX, Zap, User, Coffee, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from 'react';
import { availabilityService } from "@/services/availability.service";
import { useToast } from "@/hooks/use-toast";
import { realtimeService } from "@/services/realtime.service";
import { cn } from "@/lib/utils";

interface BarberSelectionProps {
  barbers: Barber[];
  selectedBarber?: Barber;
  selectedService?: Service;
  selectedDate?: Date;
  onSelectBarber: (barber: Barber) => void;
  onNext: () => void;
  onBack: () => void;
}

interface BarberAvailabilityInfo extends Barber {
  isAvailable: boolean;
  availableSlots: number;
  nextAvailable?: string;
  isWorking: boolean;
  onVacation: boolean;
  status: 'high' | 'medium' | 'low' | 'none' | 'loading';
  statusMessage: string;
  workingHours?: {
    start: string;
    end: string;
  };
}

export function BarberSelection({
  barbers,
  selectedBarber,
  selectedService,
  selectedDate,
  onSelectBarber,
  onNext,
  onBack,
}: BarberSelectionProps) {
  const { toast } = useToast();
  const [barbersWithAvailability, setBarbersWithAvailability] = useState<
    BarberAvailabilityInfo[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  // Check availability for all barbers when service or date changes
  useEffect(() => {
    const checkBarbersAvailability = async () => {
      if (!selectedService) {
        // Without service, show all barbers with basic info
        setBarbersWithAvailability(
          barbers.map((barber) => ({
            ...barber,
            isAvailable: barber.available,
            availableSlots: 0,
            isWorking: true,
            onVacation: false,
            status: 'loading' as const,
            statusMessage: 'Selecciona un servicio',
          }))
        );
        return;
      }

      // Use selected date or today as fallback
      const dateToCheck = selectedDate || new Date();

      setIsLoading(true);
      try {
        const barbersWithInfo = await Promise.all(
          barbers.map(async (barber): Promise<BarberAvailabilityInfo> => {
            if (!barber.barbershop_id) {
              return {
                ...barber,
                isAvailable: false,
                availableSlots: 0,
                isWorking: false,
                onVacation: false,
                status: 'none',
                statusMessage: 'No configurado',
              };
            }

            try {
              const dateStr = dateToCheck.toISOString().split('T')[0];
              
              // Get integrated availability info
              const integratedInfo = await availabilityService.getIntegratedAvailability(
                barber.id,
                barber.barbershop_id,
                dateStr
              );

              // If not working today
              if (!integratedInfo.is_working) {
                return {
                  ...barber,
                  isAvailable: false,
                  availableSlots: 0,
                  isWorking: false,
                  onVacation: false,
                  status: 'none',
                  statusMessage: 'No trabaja hoy',
                  workingHours: integratedInfo.working_hours || undefined,
                };
              }

              // If on vacation
              if (integratedInfo.has_time_off) {
                return {
                  ...barber,
                  isAvailable: false,
                  availableSlots: 0,
                  isWorking: true,
                  onVacation: true,
                  status: 'none',
                  statusMessage: 'De vacaciones',
                  workingHours: integratedInfo.working_hours || undefined,
                };
              }

              // Get day availability for slots
              const dayAvailability = await availabilityService.getDayAvailability({
                barber_id: barber.id,
                barbershop_id: barber.barbershop_id,
                date: dateStr,
                service_duration: selectedService.duration_minutes,
              });

              const availableSlots = dayAvailability.slots.filter(
                (slot) => slot.available
              );
              
              const nextAvailable = availableSlots.length > 0
                ? availableSlots[0].start.substring(0, 5)
                : undefined;

              // Determine status based on availability
              let status: 'high' | 'medium' | 'low' | 'none';
              let statusMessage: string;

              if (availableSlots.length === 0) {
                status = 'none';
                statusMessage = 'Sin turnos disponibles';
              } else if (availableSlots.length >= 8) {
                status = 'high';
                statusMessage = `${availableSlots.length} turnos disponibles`;
              } else if (availableSlots.length >= 3) {
                status = 'medium';
                statusMessage = `${availableSlots.length} turnos disponibles`;
              } else {
                status = 'low';
                statusMessage = `Solo ${availableSlots.length} turnos disponibles`;
              }

              return {
                ...barber,
                isAvailable: availableSlots.length > 0,
                availableSlots: availableSlots.length,
                nextAvailable,
                isWorking: true,
                onVacation: false,
                status,
                statusMessage,
                workingHours: dayAvailability.working_hours || undefined,
              };
            } catch (error) {
              console.error(
                `Error checking availability for barber ${barber.id}:`,
                error
              );
              return {
                ...barber,
                isAvailable: false,
                availableSlots: 0,
                isWorking: false,
                onVacation: false,
                status: 'none',
                statusMessage: 'Error al verificar',
              };
            }
          })
        );

        setBarbersWithAvailability(barbersWithInfo);
      } catch (error) {
        console.error('Error checking barbers availability:', error);
        toast({
          title: 'Error',
          description: 'No se pudo verificar la disponibilidad de los barberos',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkBarbersAvailability();
  }, [barbers, selectedService, selectedDate, toast]);

  // Subscribe to real-time availability updates
  useEffect(() => {
    if (!selectedService || barbers.length === 0) return;

    const barberIds = barbers.map(b => b.id);
    
    // Subscribe to availability updates for all barbers
    const unsubscribe = realtimeService.subscribeToAvailability(
      barberIds,
      {
        onUpdate: async (update) => {
          // Update the availability count and status for the specific barber
          setBarbersWithAvailability(prev => 
            prev.map(barber => {
              if (barber.id === update.barberId) {
                // Determine new status based on updated slots
                let status: 'high' | 'medium' | 'low' | 'none';
                let statusMessage: string;

                if (update.availableSlots === 0) {
                  status = 'none';
                  statusMessage = 'Sin turnos disponibles';
                } else if (update.availableSlots >= 8) {
                  status = 'high';
                  statusMessage = `${update.availableSlots} turnos disponibles`;
                } else if (update.availableSlots >= 3) {
                  status = 'medium';
                  statusMessage = `${update.availableSlots} turnos disponibles`;
                } else {
                  status = 'low';
                  statusMessage = `Solo ${update.availableSlots} turnos disponibles`;
                }

                return {
                  ...barber,
                  availableSlots: update.availableSlots,
                  isAvailable: update.availableSlots > 0,
                  status,
                  statusMessage,
                };
              }
              return barber;
            })
          );
        },
        onStatusChange: (status) => {
          if (status === 'error') {
            console.error('Real-time availability connection error');
          }
        },
      }
    );

    return () => {
      unsubscribe();
    };
  }, [barbers, selectedService]);
  // Helper function to get status styling
  const getStatusStyling = (status: BarberAvailabilityInfo['status']) => {
    switch (status) {
      case 'high':
        return {
          badgeVariant: 'default' as const,
          badgeClass: 'bg-green-100 text-green-800 border-green-200',
          cardBorder: 'border-green-200',
          icon: CheckCircle2,
          iconColor: 'text-green-600',
        };
      case 'medium':
        return {
          badgeVariant: 'secondary' as const,
          badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          cardBorder: 'border-yellow-200',
          icon: Zap,
          iconColor: 'text-yellow-600',
        };
      case 'low':
        return {
          badgeVariant: 'destructive' as const,
          badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
          cardBorder: 'border-orange-200',
          icon: AlertCircle,
          iconColor: 'text-orange-600',
        };
      case 'none':
        return {
          badgeVariant: 'outline' as const,
          badgeClass: 'bg-gray-100 text-gray-600 border-gray-300',
          cardBorder: 'border-gray-200',
          icon: CalendarX,
          iconColor: 'text-gray-500',
        };
      default:
        return {
          badgeVariant: 'outline' as const,
          badgeClass: 'bg-gray-100 text-gray-600 border-gray-300',
          cardBorder: 'border-gray-200',
          icon: Loader2,
          iconColor: 'text-gray-500',
        };
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Selecciona un barbero</h2>
          <p className="text-muted-foreground">
            Elige con quién quieres agendar tu cita
          </p>
          {selectedService && (
            <div className="mt-2 text-sm text-muted-foreground">
              {selectedDate ? (
                selectedDate.toLocaleDateString('es-AR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })
              ) : (
                new Date().toLocaleDateString('es-AR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) + ' (hoy)'
              )} • {selectedService.name} ({selectedService.duration_minutes} min)
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? // Show loading skeleton
              Array.from({ length: barbers.length }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardHeader className="text-center">
                    <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-full"></div>
                  </CardContent>
                </Card>
              ))
            : barbersWithAvailability.map((barber) => {
                const styling = getStatusStyling(barber.status);
                const StatusIcon = styling.icon;
                
                return (
                  <Tooltip key={barber.id}>
                    <TooltipTrigger asChild>
                      <Card
                        className={cn(
                          "cursor-pointer transition-all duration-200 relative",
                          selectedBarber?.id === barber.id
                            ? 'ring-2 ring-primary shadow-lg'
                            : 'hover:shadow-lg hover:scale-[1.02]',
                          !barber.isAvailable && 'opacity-60',
                          styling.cardBorder,
                          barber.isAvailable ? 'hover:bg-accent/5' : 'cursor-not-allowed'
                        )}
                        onClick={() => barber.isAvailable && onSelectBarber(barber)}
                      >
                        {/* Status indicator badge in top-right corner */}
                        <div className="absolute top-3 right-3 z-10">
                          <Badge
                            variant={styling.badgeVariant}
                            className={cn(
                              "text-xs font-medium border",
                              styling.badgeClass
                            )}
                          >
                            <StatusIcon className={cn("h-3 w-3 mr-1", styling.iconColor)} />
                            {barber.status === 'loading' ? 'Cargando...' : 
                             barber.onVacation ? 'Vacaciones' :
                             !barber.isWorking ? 'No trabaja' :
                             barber.availableSlots > 0 ? barber.availableSlots.toString() : 'Sin turnos'}
                          </Badge>
                        </div>

                        <CardHeader className="text-center pb-3">
                          <div className="relative">
                            <Avatar className="w-20 h-20 mx-auto mb-3 ring-2 ring-offset-2 ring-gray-100">
                              <AvatarImage src={barber.avatar} alt={barber.name} />
                              <AvatarFallback className="text-lg font-semibold">
                                {barber.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
                              </AvatarFallback>
                            </Avatar>
                            
                            {/* Working status indicator */}
                            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                              {barber.isWorking && !barber.onVacation ? (
                                <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                              ) : barber.onVacation ? (
                                <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                                  <Coffee className="h-2 w-2 text-white" />
                                </div>
                              ) : (
                                <div className="w-4 h-4 bg-gray-400 rounded-full border-2 border-white shadow-sm"></div>
                              )}
                            </div>
                          </div>
                          
                          <CardTitle className="text-lg mb-1">{barber.name}</CardTitle>
                          
                          {/* Working hours */}
                          {barber.workingHours && selectedService && (
                            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                              <Clock className="h-3 w-3" />
                              {barber.workingHours.start} - {barber.workingHours.end}
                            </div>
                          )}
                        </CardHeader>

                        <CardContent className="pt-0">
                          {/* Specialties */}
                          <div className="flex flex-wrap gap-1 justify-center mb-3">
                            {barber.specialties.slice(0, 3).map((specialty, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs"
                              >
                                {specialty}
                              </Badge>
                            ))}
                            {barber.specialties.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{barber.specialties.length - 3}
                              </Badge>
                            )}
                          </div>

                          {/* Availability status */}
                          {selectedService && (
                            <div className="space-y-2">
                              <div className={cn(
                                "text-center text-sm font-medium px-3 py-2 rounded-lg border",
                                styling.badgeClass
                              )}>
                                <div className="flex items-center justify-center gap-2">
                                  <StatusIcon className={cn("h-4 w-4", styling.iconColor)} />
                                  <span>{barber.statusMessage}</span>
                                </div>
                              </div>

                              {/* Next available time */}
                              {barber.isAvailable && barber.nextAvailable && (
                                <div className="text-center text-xs text-muted-foreground">
                                  Próximo turno: {barber.nextAvailable}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Default message when no service selected */}
                          {!selectedService && (
                            <div className="text-center text-sm text-muted-foreground py-2">
                              <User className="h-4 w-4 mx-auto mb-1" />
                              Selecciona un servicio para ver disponibilidad
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-1">
                        <div className="font-medium">{barber.name}</div>
                        {barber.onVacation && (
                          <div className="text-blue-400">🏖️ De vacaciones</div>
                        )}
                        {!barber.isWorking && !barber.onVacation && (
                          <div className="text-gray-400">📅 No trabaja hoy</div>
                        )}
                        {barber.isWorking && !barber.onVacation && selectedService && (
                          <>
                            <div>{barber.statusMessage}</div>
                            {barber.workingHours && (
                              <div className="text-muted-foreground">
                                Horario: {barber.workingHours.start} - {barber.workingHours.end}
                              </div>
                            )}
                            {barber.nextAvailable && (
                              <div className="text-green-400">
                                ⏰ Próximo: {barber.nextAvailable}
                              </div>
                            )}
                          </>
                        )}
                        <div className="text-muted-foreground text-xs">
                          Especialidades: {barber.specialties.join(', ')}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
        </div>

        <div className="flex justify-between mt-6">
          <Button onClick={onBack} variant="outline" size="lg">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Atrás
          </Button>
          <Button onClick={onNext} disabled={!selectedBarber} size="lg">
            Siguiente
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
