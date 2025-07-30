import {useEffect} from 'react';
// // // // // import { BookingFlow } from '@/components/booking/BookingFlow';
// // // // // import { Service, Barber, TimeSlot } from '@/types';
// // // // // import { useQuery } from '@tanstack/react-query';
// // // // // import { servicesService } from '@/services/services.service';
// // // // // import { barberService } from '@/services/barbers.service';
// // // // // import { availabilityService } from '@/services/availability.service';
// // // // // import { useToast } from '@/hooks/use-toast';
// // // // // import { Skeleton } from '@/components/ui/skeleton';
// // // // // import { Card, CardContent } from '@/components/ui/card';
// // // // // import { AlertCircle } from 'lucide-react';
// // // // // import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function BookingPage() {
  const { toast } = useToast();
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  // Fetch services from Supabase
  const {
    data: services,
    isLoading: servicesLoading,
    error: servicesError,
  } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const _data = await servicesService.getAll({
        filters: { active: true },
        sort: { field: 'price', direction: 'asc' },
      });
      return data;
    },
  });

  // Fetch barbers from Supabase
  const {
    data: barbers,
    isLoading: barbersLoading,
    error: barbersError,
  } = useQuery({
    queryKey: ['barbers'],
    queryFn: async () => {
      const _data = await barberService.getAll({
        filters: { active: true },
      });
      // Transform barber data to match the expected format
      return data.map((barber) => ({
        id: barber.id,
        name: barber.full_name,
        avatar:
          barber.avatar_url ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(barber.full_name)}&background=random`,
        specialties: barber.specialties || [],
        available: barber.active,
        barbershop_id: barber.barbershop_id,
      }));
    },
  });

  // Fetch available time slots when service, barber and date are selected
  useEffect(() => {
    const _fetchAvailableSlots = async () => {
      if (!selectedService || !selectedBarber || !selectedDate) {
        setAvailableSlots([]);
        return;
      }

      if (!selectedBarber.barbershop_id) {
        console.error('Barber does not have barbershop_id');
        return;
      }

      try {
        const _dayAvailability = await availabilityService.getDayAvailability({
          barber_id: selectedBarber.id,
          barbershop_id: selectedBarber.barbershop_id,
          date: selectedDate.toISOString().split('T')[0],
          service_duration: selectedService.duration,
        });

        // Transform the availability slots to the expected format
        const formattedSlots: TimeSlot[] = dayAvailability.slots.map(
          (slot) => ({
            time: slot.start.substring(0, 5), // Extract HH:MM from HH:MM:SS
            available: slot.available,
          })
        );

        setAvailableSlots(formattedSlots);
      } catch (error) {
        console.error('Error fetching available slots:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los horarios disponibles',
          variant: 'destructive',
        });
      }
    };

    fetchAvailableSlots();
  }, [selectedService, selectedBarber, selectedDate, toast]);

  // Loading state
  if (servicesLoading || barbersLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold mb-6">Reservar cita</h1>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (servicesError || barbersError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold mb-6">Reservar cita</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            No se pudieron cargar los datos necesarios. Por favor, intenta
            nuevamente más tarde.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // No data state
  if (!services?.length || !barbers?.length) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold mb-6">Reservar cita</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No hay servicios o barberos disponibles en este momento.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Custom handler to track selections for availability
  const _handleServiceSelect = (service: Service | null) => {
    setSelectedService(service);
  };

  const _handleBarberSelect = (barber: Barber | null) => {
    setSelectedBarber(barber);
  };

  const _handleDateSelect = (date: Date | null) => {
    setSelectedDate(date);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Reservar cita</h1>
      <BookingFlow
        services={services}
        barbers={barbers}
        availableSlots={availableSlots}
        onServiceSelect={handleServiceSelect}
        onBarberSelect={handleBarberSelect}
        onDateSelect={handleDateSelect}
      />
    </div>
  );
}
