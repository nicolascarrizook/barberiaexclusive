import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Barber = Database['public']['Tables']['barbers']['Row'];

export function useBarber() {
  const { user, profile } = useAuth();
  const [barber, setBarber] = useState<Barber | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && profile?.role === 'barber') {
      loadBarber();
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  const loadBarber = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First check if barber is already in profile
      if (profile?.barber) {
        setBarber(profile.barber);
        setLoading(false);
        return;
      }

      // Otherwise fetch from database
      const { data, error: fetchError } = await supabase
        .from('barbers')
        .select('*')
        .eq('profile_id', user.id)
        .single();

      if (fetchError) {
        console.error('[useBarber] Error fetching barber:', fetchError);
        setError('No se pudo cargar la información del barbero');
      } else if (data) {
        setBarber(data);
      } else {
        setError('No se encontró información del barbero');
      }
    } catch (err) {
      console.error('[useBarber] Unexpected error:', err);
      setError('Error inesperado al cargar el barbero');
    } finally {
      setLoading(false);
    }
  };

  return {
    barber,
    barberId: barber?.id || null,
    barbershopId: barber?.barbershop_id || null,
    loading,
    error,
    reload: loadBarber
  };
}