import { useState } from "react";
import { ServiceSelection } from "./ServiceSelection";
import { DateBarberSelection } from "./DateBarberSelection";
import { CustomerForm } from "./CustomerForm";
import { BookingSummary } from "./BookingSummary";
import { Card } from "@/components/ui/card";
import { Barber, Service, TimeSlot } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "@/components/errors";
import { ErrorMessage } from "@/components/errors";
import { appointmentService } from "@/services/appointments.service";
import { customerService } from "@/services/customers.service";
import { availabilityService } from "@/services/availability.service";
import { realtimeService } from "@/services/realtime.service";
import { supabase } from "@/lib/supabase";
import { format, set } from "date-fns";

const STEPS = {
  SERVICE: 1,
  DATE_BARBER: 2,
  CUSTOMER: 3,
  SUMMARY: 4,
} as const;

interface BookingFlowProps {
  services: Service[];
  barbers: Barber[];
  availableSlots: TimeSlot[];
  onServiceSelect?: (service: Service | null) => void;
  onBarberSelect?: (barber: Barber | null) => void;
  onDateSelect?: (date: Date | null) => void;
}

export function BookingFlow({
  services,
  barbers,
  availableSlots,
  onServiceSelect,
  onBarberSelect,
  onDateSelect,
}: BookingFlowProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(STEPS.SERVICE);
  const [selectedService, setSelectedService] = useState<Service>();
  const [selectedBarber, setSelectedBarber] = useState<Barber>();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [customerData, setCustomerData] = useState<{
    name: string;
    phone: string;
    email?: string;
    notes?: string;
  }>();

  const handleServiceNext = () => {
    if (selectedService) {
      setCurrentStep(STEPS.DATE_BARBER);
    }
  };

  const handleBarberAndTimeSelect = (barber: Barber, date: Date, time: string) => {
    setSelectedBarber(barber);
    setSelectedDate(date);
    setSelectedTime(time);
    setCurrentStep(STEPS.CUSTOMER);
  };

  const handleCustomerSubmit = async (data: typeof customerData) => {
    setCustomerData(data);

    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime) {
      toast({
        title: 'Error',
        description: 'Por favor, completa todos los pasos de la reserva',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedBarber.barbershop_id) {
      toast({
        title: 'Error',
        description: 'No se pudo identificar la barbería',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Construct the appointment date and time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const appointmentDate = set(selectedDate, {
        hours,
        minutes,
        seconds: 0,
        milliseconds: 0,
      });
      const endTime = new Date(appointmentDate);
      endTime.setMinutes(endTime.getMinutes() + selectedService.duration_minutes);

      // Double-check availability before creating appointment
      const { available, reason } = await availabilityService.isSlotAvailable(
        selectedBarber.id,
        selectedBarber.barbershop_id,
        selectedDate.toISOString().split('T')[0],
        selectedTime + ':00',
        endTime.toTimeString().split(' ')[0]
      );

      if (!available) {
        toast({
          title: 'Horario no disponible',
          description:
            reason || 'El horario seleccionado ya no está disponible',
          variant: 'destructive',
        });
        return;
      }

      // First, create or get the customer
      console.log('👤 Creating customer:', {
        full_name: data.name,
        phone: data.phone,
        email: data.email,
      });
      
      const customer = await customerService.createCustomer({
        full_name: data.name,
        phone: data.phone,
        email: data.email,
      });
      
      console.log('✅ Customer created/found:', customer);
      
      if (!customer || !customer.id) {
        throw new Error('No se pudo crear o encontrar el cliente');
      }

      // Determine if it's a guest customer or authenticated user
      const isGuestCustomer = !('role' in customer);
      
      // Get service details for price
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('price')
        .eq('id', selectedService.id)
        .single();
        
      if (serviceError) throw serviceError;
      
      // Create the appointment using the createAppointment method
      console.log('📅 Preparing appointment data:', {
        barbershop_id: selectedBarber.barbershop_id,
        barber_id: selectedBarber.id,
        customer_id: isGuestCustomer ? null : customer.id,
        guest_customer_id: isGuestCustomer ? customer.id : null,
        service_id: selectedService.id,
        start_time: appointmentDate,
      });
      
      // We need to modify the appointment service to handle guest customers
      // For now, let's use a direct Supabase call
      const appointmentData = {
        barbershop_id: selectedBarber.barbershop_id,
        barber_id: selectedBarber.id,
        customer_id: isGuestCustomer ? null : customer.id,
        guest_customer_id: isGuestCustomer ? customer.id : null,
        service_id: selectedService.id,
        start_time: appointmentDate.toISOString(),
        end_time: endTime.toISOString(),
        status: 'pending',
        price: service.price,
        notes: data.notes || null,
        confirmation_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      };
      
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();
        
      if (appointmentError) throw appointmentError;

      // Broadcast availability update after successful appointment creation
      try {
        const dateString = selectedDate.toISOString().split('T')[0];
        const dayAvailability = await availabilityService.getDayAvailability({
          barber_id: selectedBarber.id,
          barbershop_id: selectedBarber.barbershop_id,
          date: dateString,
          service_duration: selectedService.duration_minutes,
        });

        const availableSlots = dayAvailability.slots.filter(slot => slot.available).length;
        
        await realtimeService.broadcastAvailabilityUpdate({
          barberId: selectedBarber.id,
          date: dateString,
          availableSlots,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('Error broadcasting availability update:', error);
        // Don't fail the appointment creation if broadcast fails
      }

      toast({
        title: 'Reserva confirmada',
        description: 'Te hemos enviado los detalles por SMS',
      });

      setCurrentStep(STEPS.SUMMARY);
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: 'Error al crear la reserva',
        description:
          error instanceof Error
            ? error.message
            : 'Por favor, intenta nuevamente',
        variant: 'destructive',
      });
    }
  };

  const handleNewBooking = () => {
    // Reset all state
    setCurrentStep(STEPS.SERVICE);
    setSelectedService(undefined);
    setSelectedBarber(undefined);
    setSelectedDate(undefined);
    setSelectedTime(undefined);
    setCustomerData(undefined);
  };

  const goBack = () => {
    setCurrentStep(currentStep - 1);
  };

  // Progress indicator
  const progressPercentage = (currentStep / Object.keys(STEPS).length) * 100;

  return (
    <div className="max-w-4xl mx-auto p-4">
      {currentStep !== STEPS.SUMMARY && (
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Paso {currentStep} de 3</span>
            <span>{Math.round(progressPercentage)}% completado</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      <Card className="p-6">
        {currentStep === STEPS.SERVICE && (
          <ErrorBoundary
            level="component"
            fallback={(props) => (
              <ErrorMessage
                title="Error al cargar los servicios"
                message="No pudimos cargar la lista de servicios. Por favor, intenta de nuevo."
                severity="error"
                onRetry={props.resetError}
              />
            )}
          >
            <ServiceSelection
              services={services}
              selectedService={selectedService}
              onSelectService={(service) => {
                setSelectedService(service);
                onServiceSelect?.(service || null);
              }}
              onNext={handleServiceNext}
            />
          </ErrorBoundary>
        )}

        {currentStep === STEPS.DATE_BARBER && (
          <ErrorBoundary
            level="component"
            fallback={(props) => (
              <ErrorMessage
                title="Error al cargar barberos y horarios"
                message="No pudimos cargar los barberos y horarios disponibles."
                severity="error"
                onRetry={props.resetError}
              />
            )}
          >
            <DateBarberSelection
              services={services}
              barbers={barbers}
              selectedService={selectedService!}
              onSelectBarberAndTime={handleBarberAndTimeSelect}
              onBack={goBack}
            />
          </ErrorBoundary>
        )}

        {currentStep === STEPS.CUSTOMER && (
          <ErrorBoundary
            level="component"
            fallback={(props) => (
              <ErrorMessage
                title="Error en el formulario"
                message="Ha ocurrido un error al procesar el formulario."
                severity="error"
                onRetry={props.resetError}
              />
            )}
          >
            <CustomerForm onSubmit={handleCustomerSubmit} onBack={goBack} />
          </ErrorBoundary>
        )}

        {currentStep === STEPS.SUMMARY &&
          customerData &&
          selectedService &&
          selectedBarber &&
          selectedDate &&
          selectedTime && (
            <ErrorBoundary
              level="component"
              fallback={(props) => (
                <ErrorMessage
                  title="Error al mostrar el resumen"
                  message="No pudimos mostrar el resumen de tu reserva."
                  severity="error"
                  onRetry={props.resetError}
                />
              )}
            >
              <BookingSummary
                service={selectedService}
                barber={selectedBarber}
                date={selectedDate}
                time={selectedTime}
                customerName={customerData.name}
                customerPhone={customerData.phone}
                customerEmail={customerData.email}
                notes={customerData.notes}
                onNewBooking={handleNewBooking}
              />
            </ErrorBoundary>
          )}
      </Card>
    </div>
  );
}
