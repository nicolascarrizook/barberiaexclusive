import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppointmentsList } from '@/components/appointments/AppointmentsList';
import { type AppointmentListItem } from '@/services/appointment-management.service';

export function AppointmentManagement() {
  const { user } = useAuth();
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentListItem | null>(null);

  // For now, we'll use a hardcoded barbershop ID
  // In a real app, this would come from the user's barbershop association
  const barbershopId = 'b8b95c0b-0c5a-4f11-8b8f-8e7e2a6f3b4c';

  const handleAppointmentClick = (appointment: AppointmentListItem) => {
    setSelectedAppointment(appointment);
    // TODO: Open appointment details modal or navigate to details page
    console.log('Selected appointment:', appointment);
  };

  const handleNewAppointment = () => {
    // TODO: Open new appointment form or navigate to booking page
    console.log('Create new appointment');
  };

  return (
    <div className="container mx-auto py-6">
      <AppointmentsList
        barbershopId={barbershopId}
        onAppointmentClick={handleAppointmentClick}
        onNewAppointment={handleNewAppointment}
      />
    </div>
  );
}