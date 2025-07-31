import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DebugPage() {
  const { user, profile } = useAuth();
  const [barberData, setBarberData] = useState<any>(null);
  const [barbershopData, setBarbershopData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load barber data if user is a barber
      if (profile?.role === 'barber') {
        const { data: barber, error: barberError } = await supabase
          .from('barbers')
          .select('*')
          .eq('profile_id', user!.id)
          .single();

        if (barberError) {
          console.error('Error loading barber:', barberError);
        } else {
          setBarberData(barber);

          // Load barbershop data
          if (barber?.barbershop_id) {
            const { data: barbershop, error: barbershopError } = await supabase
              .from('barbershops')
              .select('*')
              .eq('id', barber.barbershop_id)
              .single();

            if (barbershopError) {
              console.error('Error loading barbershop:', barbershopError);
            } else {
              setBarbershopData(barbershop);
            }
          }
        }
      }

      // Load barbershop for admin/owner
      if (profile?.role === 'admin' || profile?.role === 'owner') {
        const { data: barbershops, error } = await supabase
          .from('barbershops')
          .select('*');

        if (error) {
          console.error('Error loading barbershops:', error);
        } else {
          setBarbershopData(barbershops?.[0] || null);
        }
      }
    } catch (error) {
      console.error('Error in loadData:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">Debug Information</h1>

      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto">
            {JSON.stringify({ id: user?.id, email: user?.email }, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {profile?.role === 'barber' && (
        <Card>
          <CardHeader>
            <CardTitle>Barber Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(barberData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Barbershop Information</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(barbershopData, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auth Hook Data</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(useAuth(), null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}