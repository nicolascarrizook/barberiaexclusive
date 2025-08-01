import { useState, useEffect } from "react";
import { ServiceSelectionV2 } from "./ServiceSelectionV2";
import { UnifiedDateBarberSelection } from "./UnifiedDateBarberSelection";
import { CustomerFormV2 } from "./CustomerFormV2";
import { BookingSummaryV2 } from "./BookingSummaryV2";
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
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";

const STEPS = {
  SERVICE: 1,
  DATE_BARBER_TIME: 2,
  CUSTOMER: 3,
  SUMMARY: 4,
} as const;

interface BookingFlowV2Props {
  services?: Service[];
  barbers?: Barber[];
  availableSlots?: TimeSlot[];
  onServiceSelect?: (service: Service | null) => void;
  onBarberSelect?: (barber: Barber | null) => void;
  onDateSelect?: (date: Date | null) => void;
}

export function BookingFlowV2({
  services = [],
  barbers = [],
  availableSlots = [],
  onServiceSelect,
  onBarberSelect,
  onDateSelect,
}: BookingFlowV2Props) {
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

  // Auto-progress from service selection if only one service
  useEffect(() => {
    if (services && services.length === 1 && !selectedService) {
      setSelectedService(services[0]);
      setCurrentStep(STEPS.DATE_BARBER_TIME);
    }
  }, [services, selectedService]);

  const handleServiceNext = () => {
    if (selectedService) {
      setCurrentStep(STEPS.DATE_BARBER_TIME);
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
      const dateStr = selectedDate.toISOString().split('T')[0];
      const startTimeStr = selectedTime + ':00';
      const endTimeStr = format(endTime, 'HH:mm:ss');
      
      console.log('Checking availability:', {
        barber_id: selectedBarber.id,
        barbershop_id: selectedBarber.barbershop_id,
        date: dateStr,
        start_time: startTimeStr,
        end_time: endTimeStr
      });
      
      const { available, reason } = await availabilityService.isSlotAvailable(
        selectedBarber.id,
        selectedBarber.barbershop_id,
        dateStr,
        startTimeStr,
        endTimeStr
      );

      if (!available) {
        toast({
          title: 'Horario no disponible',
          description:
            reason === 'appointment' ? 'Este horario acaba de ser reservado por otro cliente' :
            reason === 'break' ? 'El barbero está en horario de descanso' :
            reason === 'time_off' ? 'El barbero no está disponible en esta fecha' :
            reason === 'closed' ? 'La barbería está cerrada en este horario' :
            'El horario seleccionado ya no está disponible',
          variant: 'destructive',
        });
        
        // Recargar disponibilidad para actualizar la vista
        setCurrentStep(STEPS.DATE_BARBER_TIME);
        return;
      }

      // First, create or get the customer
      const customer = await customerService.createCustomer({
        full_name: data.name,
        phone: data.phone,
        email: data.email,
      });
      
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
      
      // Create the appointment
      // For guest customers, we still need to provide a customer_id
      // The guest_customers table should have been created with a UUID that can be used
      const appointmentData: any = {
        barbershop_id: selectedBarber.barbershop_id,
        barber_id: selectedBarber.id,
        customer_id: customer.id, // Always use the customer ID, whether guest or authenticated
        service_id: selectedService.id,
        start_time: appointmentDate.toISOString(),
        end_time: endTime.toISOString(),
        status: 'pending' as const,
        price: service.price,
        notes: data.notes || null,
        confirmation_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      };
      
      console.log('Creating appointment with data:', {
        ...appointmentData,
        start_time_local: appointmentDate.toString(),
        end_time_local: endTime.toString(),
        dateStr,
        startTimeStr,
        endTimeStr
      });
      
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();
        
      if (appointmentError) {
        console.error('Appointment creation error details:', {
          error: appointmentError,
          appointmentData,
          selectedDate: selectedDate.toString(),
          selectedTime,
          dayOfWeek: selectedDate.getDay(),
          dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][selectedDate.getDay()]
        });
        throw appointmentError;
      }

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
      }

      toast({
        title: '¡Reserva confirmada! 🎉',
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

  // Progress indicator - 3 steps now instead of 4
  const totalSteps = 3; // Service, Date/Barber/Time, Customer
  const progressPercentage = currentStep === STEPS.SUMMARY ? 100 : ((currentStep - 1) / totalSteps) * 100;

  return (
    <div className="max-w-4xl mx-auto p-4">
      {currentStep !== STEPS.SUMMARY && (
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Paso {currentStep} de {totalSteps}</span>
            <span>{Math.round(progressPercentage)}% completado</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
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
                <ServiceSelectionV2
                  services={services}
                  selectedService={selectedService}
                  onSelectService={(service) => {
                    setSelectedService(service);
                    onServiceSelect?.(service);
                  }}
                  onNext={handleServiceNext}
                />
              </ErrorBoundary>
            )}

            {currentStep === STEPS.DATE_BARBER_TIME && (
              <ErrorBoundary
                level="component"
                fallback={(props) => (
                  <ErrorMessage
                    title="Error al cargar disponibilidad"
                    message="No pudimos cargar los barberos y horarios disponibles."
                    severity="error"
                    onRetry={props.resetError}
                  />
                )}
              >
                <UnifiedDateBarberSelection
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
                <CustomerFormV2 
                  onSubmit={handleCustomerSubmit} 
                  onBack={goBack}
                  isSubmitting={false}
                />
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
                  <BookingSummaryV2
                    service={selectedService}
                    barber={selectedBarber}
                    date={selectedDate}
                    time={selectedTime}
                    customerName={customerData.name}
                    customerPhone={customerData.phone}
                    customerEmail={customerData.email}
                    notes={customerData.notes}
                    confirmationCode="BRB123"
                    onNewBooking={handleNewBooking}
                  />
                </ErrorBoundary>
              )}
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}