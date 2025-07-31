import { useState, useEffect } from 'react';
import { BookingFlowV2 } from '@/components/booking/BookingFlowV2';
import { useToast } from '@/hooks/use-toast';
import { Service, Barber, TimeSlot } from '@/types';
import { servicesService } from '@/services/services.service';
import { barberService } from '@/services/barbers.service';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

export function BookingPage() {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Get barbershop (using first one for now)
      const { data: barbershops, error: barbershopError } = await supabase
        .from('barbershops')
        .select('*')
        .limit(1)
        .single();

      if (barbershopError || !barbershops) {
        throw new Error('No se pudo cargar la información de la barbería');
      }

      // Load services
      const servicesData = await servicesService.getServicesByBarbershop(barbershops.id);
      // Map database services to match the Service interface
      const mappedServices: Service[] = (servicesData || []).map(service => ({
        id: service.id,
        name: service.name,
        duration_minutes: service.duration_minutes,
        price: service.price,
        description: service.description || undefined,
      }));
      setServices(mappedServices);

      // Load barbers
      const barbersData = await barberService.getBarbersByBarbershop(barbershops.id);
      // Map database barbers to match the Barber interface
      const mappedBarbers: Barber[] = (barbersData || []).map(barber => ({
        id: barber.id,
        name: barber.display_name || barber.profile?.full_name || 'Barbero',
        avatar: barber.profile?.avatar_url || undefined,
        specialties: barber.specialties || [],
        available: barber.is_active === true,
        barbershop_id: barber.barbershop_id,
      }));
      setBarbers(mappedBarbers);

      // Initially empty slots - will be loaded when date/barber are selected
      setAvailableSlots([]);
    } catch (error) {
      console.error('Error loading booking data:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información de reserva',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <BookingFlowV2 
        services={services}
        barbers={barbers}
        availableSlots={availableSlots}
      />
    </motion.div>
  );
}