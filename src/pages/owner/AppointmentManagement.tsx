import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { barbershopService } from '@/services/barbershops.service';
import { AppointmentsList } from '@/components/appointments/AppointmentsList';
import { type AppointmentListItem } from '@/services/appointment-management.service';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function AppointmentManagement() {
  const { user } = useAuth();
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentListItem | null>(null);

  // Fetch the owner's barbershop
  const { data: barbershop, isLoading, error } = useQuery({
    queryKey: ['owner-barbershop', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      const shops = await barbershopService.getByOwner(user.id);
      return shops[0]; // For now, assume one barbershop per owner
    },
    enabled: !!user?.id,
  });

  const handleAppointmentClick = (appointment: AppointmentListItem) => {
    setSelectedAppointment(appointment);
    // TODO: Open appointment details modal or navigate to details page
    console.log('Selected appointment:', appointment);
  };

  const handleNewAppointment = () => {
    // TODO: Open new appointment form or navigate to booking page
    console.log('Create new appointment');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !barbershop) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertDescription>
            No se pudo cargar la información de la barbería. Por favor, intenta de nuevo.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <AppointmentsList
        barbershopId={barbershop.id}
        onAppointmentClick={handleAppointmentClick}
        onNewAppointment={handleNewAppointment}
      />
    </div>
  );
}