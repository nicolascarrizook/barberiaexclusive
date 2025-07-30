// // // // // import { useState } from "react";
// // // // // import { ServiceSelection } from "./ServiceSelection";
// // // // // import { BarberSelection } from "./BarberSelection";
// // // // // import { DateTimeSelection } from "./DateTimeSelection";
// // // // // import { CustomerForm } from "./CustomerForm";
// // // // // import { BookingSummary } from "./BookingSummary";
// // // // // import { Card } from "@/components/ui/card";
// // // // // import { Barber, Service, TimeSlot } from "@/types";
// // // // // import { useToast } from "@/hooks/use-toast";
// // // // // import { ErrorBoundary } from "@/components/errors";
// // // // // import { ErrorMessage } from "@/components/errors";
// // // // // import { appointmentService } from "@/services/appointments.service";
// // // // // import { customerService } from "@/services/customers.service";
// // // // // import { availabilityService } from "@/services/availability.service";
// // // // // import { format, set } from "date-fns";

const _STEPS = {
  SERVICE: 1,
  BARBER: 2,
  DATETIME: 3,
  CUSTOMER: 4,
  SUMMARY: 5,
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

  const _handleServiceNext = () => {
    if (selectedService) {
      setCurrentStep(STEPS.BARBER);
    }
  };

  const _handleBarberNext = () => {
    if (selectedBarber) {
      setCurrentStep(STEPS.DATETIME);
    }
  };

  const _handleDateTimeNext = () => {
    if (selectedDate && selectedTime) {
      setCurrentStep(STEPS.CUSTOMER);
    }
  };

  const _handleCustomerSubmit = async (data: typeof customerData) => {
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
      const _appointmentDate = set(selectedDate, {
        hours,
        minutes,
        seconds: 0,
        milliseconds: 0,
      });
      const _endTime = new Date(appointmentDate);
      endTime.setMinutes(endTime.getMinutes() + selectedService.duration);

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
      const _customer = await customerService.createCustomer({
        full_name: data.name,
        phone: data.phone,
        email: data.email,
      });

      // Create the appointment using the createAppointment method
      const _appointment = await appointmentService.createAppointment({
        barbershop_id: selectedBarber.barbershop_id,
        barber_id: selectedBarber.id,
        customer_id: customer.id,
        service_id: selectedService.id,
        start_time: appointmentDate,
        notes: data.notes,
      });

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

  const _handleNewBooking = () => {
    // Reset all state
    setCurrentStep(STEPS.SERVICE);
    setSelectedService(undefined);
    setSelectedBarber(undefined);
    setSelectedDate(undefined);
    setSelectedTime(undefined);
    setCustomerData(undefined);
  };

  const _goBack = () => {
    setCurrentStep(currentStep - 1);
  };

  // Progress indicator
  const _progressPercentage = (currentStep / Object.keys(STEPS).length) * 100;

  return (
    <div className="max-w-4xl mx-auto p-4">
      {currentStep !== STEPS.SUMMARY && (
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Paso {currentStep} de 4</span>
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

        {currentStep === STEPS.BARBER && (
          <ErrorBoundary
            level="component"
            fallback={(props) => (
              <ErrorMessage
                title="Error al cargar los barberos"
                message="No pudimos cargar la lista de barberos disponibles."
                severity="error"
                onRetry={props.resetError}
              />
            )}
          >
            <BarberSelection
              barbers={barbers}
              selectedBarber={selectedBarber}
              selectedService={selectedService}
              selectedDate={selectedDate}
              onSelectBarber={(barber) => {
                setSelectedBarber(barber);
                onBarberSelect?.(barber || null);
              }}
              onNext={handleBarberNext}
              onBack={goBack}
            />
          </ErrorBoundary>
        )}

        {currentStep === STEPS.DATETIME && (
          <ErrorBoundary
            level="component"
            fallback={(props) => (
              <ErrorMessage
                title="Error al cargar horarios"
                message="No pudimos cargar los horarios disponibles."
                severity="error"
                onRetry={props.resetError}
              />
            )}
          >
            <DateTimeSelection
              availableSlots={availableSlots}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              selectedService={selectedService}
              selectedBarber={selectedBarber}
              onSelectDate={(date) => {
                setSelectedDate(date);
                onDateSelect?.(date || null);
              }}
              onSelectTime={setSelectedTime}
              onNext={handleDateTimeNext}
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
