import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { barbershopService } from '@/services/barbershops.service';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export function SetupBarbershop() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const createDefaultBarbershop = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión primero",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const barbershop = await barbershopService.createBarbershop({
        name: "Barbería Exclusive",
        slug: "barberia-exclusive",
        description: "La mejor barbería de la ciudad",
        address: "Av. Principal 123",
        city: "Buenos Aires",
        state: "Buenos Aires",
        postal_code: "1000",
        country: "Argentina",
        phone: "+54 11 1234-5678",
        email: "info@barberiaexclusive.com",
        website: "https://barberiaexclusive.com",
        owner_id: user.id,
        opening_time: "09:00",
        closing_time: "20:00",
        time_slot_duration: 30,
        max_advance_booking_days: 30,
        cancellation_policy_hours: 24,
        requires_appointment_confirmation: false,
        allows_walk_ins: true,
        accepts_card_payments: true,
        accepts_cash_payments: true
      });

      toast({
        title: "¡Éxito!",
        description: "Barbería creada exitosamente",
      });

      // Redirigir al dashboard
      navigate('/admin');
    } catch (error) {
      console.error('Error creating barbershop:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la barbería",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración Inicial</CardTitle>
          <CardDescription>
            Parece que no hay ninguna barbería configurada. Haz clic en el botón para crear una barbería de prueba.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={createDefaultBarbershop} 
            disabled={loading}
          >
            {loading ? 'Creando...' : 'Crear Barbería de Prueba'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}