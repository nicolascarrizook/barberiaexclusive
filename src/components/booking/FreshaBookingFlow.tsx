import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check } from 'lucide-react';

// Components (will create these next)
import { ServiceSelector } from './ServiceSelector';
import { DateTimeSelector } from './DateTimeSelector';
import { CustomerInfo } from './CustomerInfo';
import { BookingConfirmation } from './BookingConfirmation';

// Services
import { bookingService } from '@/services/booking.service';
import { availabilityEngine } from '@/services/availability-engine.service';

// Types
interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  description?: string;
}

interface SelectedSlot {
  barberId: string;
  barberName: string;
  barberAvatar?: string;
  date: Date;
  startTime: string;
  endTime: string;
}

interface CustomerData {
  fullName: string;
  phone: string;
  email?: string;
  notes?: string;
}

interface CompletedBooking {
  id: string;
  confirmationCode: string;
  services: Service[];
  barber: {
    name: string;
    avatar?: string;
  };
  slot: SelectedSlot;
  customer: CustomerData;
  totalPrice: number;
}

const STEPS = {
  SERVICES: 1,
  DATETIME: 2,
  CUSTOMER: 3,
  CONFIRMATION: 4,
} as const;

type Step = typeof STEPS[keyof typeof STEPS];

interface FreshaBookingFlowProps {
  barbershopId: string;
  onComplete?: (booking: CompletedBooking) => void;
}

/**
 * FreshaBookingFlow - Professional booking flow like Fresha
 * Clean, fast, and error-free booking experience
 */
export function FreshaBookingFlow({ barbershopId, onComplete }: FreshaBookingFlowProps) {
  const { toast } = useToast();
  
  // Current step state
  const [currentStep, setCurrentStep] = useState<Step>(STEPS.SERVICES);
  
  // Booking data state
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [completedBooking, setCompletedBooking] = useState<CompletedBooking | null>(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step titles for progress display
  const stepTitles = {
    [STEPS.SERVICES]: 'Selecciona servicios',
    [STEPS.DATETIME]: 'Elige fecha y hora',
    [STEPS.CUSTOMER]: 'Información personal',
    [STEPS.CONFIRMATION]: '¡Reserva confirmada!',
  };

  // Calculate progress percentage
  const progressPercentage = currentStep === STEPS.CONFIRMATION 
    ? 100 
    : ((currentStep - 1) / 3) * 100;

  /**
   * Handle service selection and move to next step
   */
  const handleServicesNext = (services: Service[]) => {
    setSelectedServices(services);
    setCurrentStep(STEPS.DATETIME);
    setError(null);
  };

  /**
   * Handle date/time selection and move to next step
   */
  const handleDateTimeNext = (slot: SelectedSlot) => {
    setSelectedSlot(slot);
    setCurrentStep(STEPS.CUSTOMER);
    setError(null);
  };

  /**
   * Handle customer info submission and create booking
   */
  const handleCustomerSubmit = async (customer: CustomerData) => {
    if (!selectedServices.length || !selectedSlot) {
      toast({
        title: 'Error',
        description: 'Información de reserva incompleta',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create booking with guest customer data
      const booking = await bookingService.createBooking({
        barbershopId,
        barberId: selectedSlot.barberId,
        serviceIds: selectedServices.map(s => s.id),
        startAt: new Date(`${selectedSlot.date.toISOString().split('T')[0]}T${selectedSlot.startTime}:00`),
        notes: customer.notes,
        customerRequests: customer.notes,
        guestCustomer: {
          fullName: customer.fullName,
          phone: customer.phone,
          email: customer.email,
        },
      });

      // Create completed booking object
      const completed: CompletedBooking = {
        id: booking.id,
        confirmationCode: booking.confirmation_code,
        services: selectedServices,
        barber: {
          name: selectedSlot.barberName,
          avatar: selectedSlot.barberAvatar,
        },
        slot: selectedSlot,
        customer,
        totalPrice: selectedServices.reduce((sum, s) => sum + s.price, 0),
      };

      setCompletedBooking(completed);
      setCustomerData(customer);
      setCurrentStep(STEPS.CONFIRMATION);

      // Success toast
      toast({
        title: '¡Reserva confirmada! 🎉',
        description: `Código de confirmación: ${booking.confirmation_code}`,
      });

      // Call completion callback
      onComplete?.(completed);

    } catch (error) {
      console.error('❌ Booking creation failed:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Error al crear la reserva';
        
      setError(errorMessage);
      
      toast({
        title: 'Error al crear la reserva',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Go back to previous step
   */
  const handleBack = () => {
    if (currentStep > STEPS.SERVICES) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  /**
   * Start a new booking
   */
  const handleNewBooking = () => {
    setCurrentStep(STEPS.SERVICES);
    setSelectedServices([]);
    setSelectedSlot(null);
    setCustomerData(null);
    setCompletedBooking(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Progress Header */}
      {currentStep !== STEPS.CONFIRMATION && (
        <div className="space-y-4">
          {/* Step indicator */}
          <div className="flex items-center justify-center space-x-2">
            {Object.values(STEPS).slice(0, 3).map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                    ${currentStep >= step
                      ? 'bg-black text-white'
                      : 'bg-gray-200 text-gray-500'
                    }
                  `}
                >
                  {currentStep > step ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    step
                  )}
                </div>
                
                {index < 2 && (
                  <div
                    className={`
                      w-12 h-0.5 mx-2 transition-all
                      ${currentStep > step ? 'bg-black' : 'bg-gray-200'}
                    `}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">{stepTitles[currentStep]}</span>
              <span className="text-gray-500">{Math.round(progressPercentage)}% completado</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <p className="text-red-700 font-medium">Error</p>
          </div>
          <p className="text-red-600 mt-1">{error}</p>
        </Card>
      )}

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="overflow-hidden">
            {/* Services Selection */}
            {currentStep === STEPS.SERVICES && (
              <ServiceSelector
                barbershopId={barbershopId}
                selectedServices={selectedServices}
                onNext={handleServicesNext}
              />
            )}

            {/* Date & Time Selection */}
            {currentStep === STEPS.DATETIME && (
              <DateTimeSelector
                barbershopId={barbershopId}
                selectedServices={selectedServices}
                selectedSlot={selectedSlot}
                onNext={handleDateTimeNext}
                onBack={handleBack}
              />
            )}

            {/* Customer Information */}
            {currentStep === STEPS.CUSTOMER && (
              <CustomerInfo
                selectedServices={selectedServices}
                selectedSlot={selectedSlot!}
                customerData={customerData}
                isLoading={isLoading}
                onSubmit={handleCustomerSubmit}
                onBack={handleBack}
              />
            )}

            {/* Booking Confirmation */}
            {currentStep === STEPS.CONFIRMATION && completedBooking && (
              <BookingConfirmation
                booking={completedBooking}
                onNewBooking={handleNewBooking}
              />
            )}
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Back button for non-first steps (except confirmation) */}
      {currentStep > STEPS.SERVICES && currentStep !== STEPS.CONFIRMATION && (
        <div className="flex justify-start">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="space-x-2"
            disabled={isLoading}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Atrás</span>
          </Button>
        </div>
      )}
    </div>
  );
}

export default FreshaBookingFlow;