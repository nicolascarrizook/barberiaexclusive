// // // // // import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// // // // // import { Button } from "@/components/ui/button";
// // // // // import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// // // // // import { Badge } from "@/components/ui/badge";
// // // // // import { Barber, Service } from "@/types";
// // // // // import { ChevronLeft, Clock } from "lucide-react";
import {useEffect} from 'react';
// // // // // import { availabilityService } from "@/services/availability.service";
// // // // // import { useToast } from "@/hooks/use-toast";

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
    const _checkBarbersAvailability = async () => {
      if (!selectedService || !selectedDate) {
        // Without service or date, show all barbers as potentially available
        setBarbersWithAvailability(
          barbers.map((barber) => ({
            ...barber,
            isAvailable: barber.available,
            availableSlots: 0,
          }))
        );
        return;
      }

      setIsLoading(true);
      try {
        const _barbersWithInfo = await Promise.all(
          barbers.map(async (barber): Promise<BarberAvailabilityInfo> => {
            if (!barber.barbershop_id) {
              return {
                ...barber,
                isAvailable: false,
                availableSlots: 0,
              };
            }

            try {
              const _dayAvailability =
                await availabilityService.getDayAvailability({
                  barber_id: barber.id,
                  barbershop_id: barber.barbershop_id,
                  date: selectedDate.toISOString().split('T')[0],
                  service_duration: selectedService.duration,
                });

              const _availableSlots = dayAvailability.slots.filter(
                (slot) => slot.available
              );
              const _nextAvailable =
                availableSlots.length > 0
                  ? availableSlots[0].start.substring(0, 5)
                  : undefined;

              return {
                ...barber,
                isAvailable: availableSlots.length > 0,
                availableSlots: availableSlots.length,
                nextAvailable,
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
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Selecciona un barbero</h2>
        <p className="text-muted-foreground">
          Elige con quién quieres agendar tu cita
        </p>
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
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </CardContent>
              </Card>
            ))
          : barbersWithAvailability.map((barber) => (
              <Card
                key={barber.id}
                className={`cursor-pointer transition-all ${
                  selectedBarber?.id === barber.id
                    ? 'ring-2 ring-primary'
                    : 'hover:shadow-lg'
                } ${!barber.isAvailable ? 'opacity-50' : ''}`}
                onClick={() => barber.isAvailable && onSelectBarber(barber)}
              >
                <CardHeader className="text-center">
                  <Avatar className="w-20 h-20 mx-auto mb-2">
                    <AvatarImage src={barber.avatar} alt={barber.name} />
                    <AvatarFallback>
                      {barber.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-lg">{barber.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1 justify-center mb-2">
                    {barber.specialties.map((specialty, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs"
                      >
                        {specialty}
                      </Badge>
                    ))}
                  </div>

                  {selectedService && selectedDate && (
                    <div className="text-center text-xs text-muted-foreground">
                      {barber.isAvailable ? (
                        <div className="flex items-center justify-center gap-1 text-green-600">
                          <Clock className="h-3 w-3" />
                          {barber.availableSlots} horarios disponibles
                          {barber.nextAvailable && (
                            <span className="ml-1">
                              desde {barber.nextAvailable}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-red-500">
                          Sin horarios disponibles
                        </span>
                      )}
                    </div>
                  )}

                  {!barber.isAvailable && !selectedService && (
                    <p className="text-center text-sm text-muted-foreground mt-2">
                      No disponible
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
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
  );
}
