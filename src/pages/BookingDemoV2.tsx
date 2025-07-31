import { BookingFlowV2 } from "@/components/booking";
import { useState } from "react";
import { Service, Barber, TimeSlot } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { servicesService } from "@/services/services.service";
import { barbersService } from "@/services/barbers.service";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "@/components/errors";
import { ErrorMessage } from "@/components/errors";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function BookingDemoV2() {
  const { toast } = useToast();
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Fetch services from Supabase
  const {
    data: services,
    isLoading: servicesLoading,
    error: servicesError,
  } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      console.log('Loading services...');
      try {
        const data = await servicesService.getAll({
          filters: { active: true },
        });
        console.log('Services loaded:', data);
        if (!data || data.length === 0) {
          console.warn('No active services found in database');
        }
        return data;
      } catch (error) {
        console.error('Error loading services:', error);
        throw error;
      }
    },
    onError: (error) => {
      console.error('Services query failed:', error);
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
      console.log('Loading barbers...');
      try {
        const data = await barbersService.getAll({
          filters: { active: true },
        });
        console.log('Raw barbers data:', data);
        
        if (!data || data.length === 0) {
          console.warn('No active barbers found in database');
          return [];
        }
        
        // Transform barber data to match the expected format
        const transformedData = data.map((barber) => ({
          id: barber.id,
          name: barber.display_name || barber.full_name,
          avatar:
            barber.avatar_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(barber.display_name || barber.full_name)}&background=random`,
          specialties: barber.specialties || [],
          available: barber.active,
          barbershop_id: barber.barbershop_id,
        }));
        
        console.log('Transformed barbers:', transformedData);
        return transformedData;
      } catch (error) {
        console.error('Error loading barbers:', error);
        throw error;
      }
    },
    onError: (error) => {
      console.error('Barbers query failed:', error);
    },
  });

  // Loading state
  if (servicesLoading || barbersLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (servicesError || barbersError) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              No se pudieron cargar los datos necesarios. Por favor, intenta
              nuevamente más tarde.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // No data state
  if (!services?.length || !barbers?.length) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No hay servicios o barberos disponibles en este momento.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="container mx-auto py-8">
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-3xl font-bold">
            Reserva tu turno
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Selecciona tu servicio preferido y encuentra el horario perfecto para ti
          </p>
        </div>

        {/* Booking Flow */}
        <ErrorBoundary
          level="page"
          fallback={(props) => (
            <ErrorMessage
              title="Error al cargar el sistema de reservas"
              message="Ha ocurrido un error inesperado. Por favor, recarga la página."
              severity="error"
              onRetry={props.resetError}
            />
          )}
        >
          <BookingFlowV2
            services={services}
            barbers={barbers}
            availableSlots={[]}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}