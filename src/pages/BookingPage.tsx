import { useState, useEffect } from 'react';
import { FreshaBookingFlow } from '@/components/booking/FreshaBookingFlow';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export function BookingPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBarbershopId();
  }, []);

  const loadBarbershopId = async () => {
    try {
      setLoading(true);
      
      // Get barbershop (using first active one for now)
      const { data: barbershops, error: barbershopError } = await supabase
        .from('barbershops')
        .select('id, name, is_active')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (barbershopError || !barbershops) {
        throw new Error('No se encontró una barbería disponible');
      }

      setBarbershopId(barbershops.id);
    } catch (error) {
      console.error('Error loading barbershop:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información de la barbería',
        variant: 'destructive',
      });
      
      // Redirect to home if no barbershop found
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle completed booking
   */
  const handleBookingComplete = (booking: any) => {
    console.log('✅ Booking completed:', booking);
    
    toast({
      title: '¡Reserva exitosa! 🎉',
      description: `Tu código de confirmación es: ${booking.confirmationCode}`,
      duration: 5000,
    });

    // Could redirect to a success page or show additional actions
    // navigate(`/booking/success/${booking.id}`);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card className="p-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
            <Skeleton className="h-12 w-32" />
          </div>
        </Card>
      </div>
    );
  }

  if (!barbershopId) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card className="p-6 text-center">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Barbería no disponible</h2>
            <p className="text-gray-600">
              No se encontró una barbería activa para realizar reservas.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              Volver al inicio
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <FreshaBookingFlow
        barbershopId={barbershopId}
        onComplete={handleBookingComplete}
      />
    </motion.div>
  );
}