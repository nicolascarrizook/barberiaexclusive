// // // // // import { useState } from 'react';
// // // // // import { AppointmentsList } from '@/components/admin/AppointmentsList';
// // // // // import { AppointmentDetails } from '@/components/admin/AppointmentDetails';
// // // // // import { useToast } from '@/hooks/use-toast';
// // // // // import { Appointment } from '@/types';

// Mock data - esto se reemplazará con datos de Supabase
const mockAppointments: Appointment[] = [
  {
    id: '1',
    barberId: '1',
    barberName: 'Carlos Rodríguez',
    customerId: 'c1',
    customerName: 'Pedro Martínez',
    customerPhone: '1234567890',
    customerEmail: 'pedro@email.com',
    serviceId: '1',
    serviceName: 'Corte clásico',
    date: new Date(),
    time: '10:00',
    duration: 30,
    price: 25,
    status: 'confirmed',
    createdAt: new Date(),
  },
  {
    id: '2',
    barberId: '2',
    barberName: 'Miguel Ángel',
    customerId: 'c2',
    customerName: 'Luis García',
    customerPhone: '0987654321',
    serviceId: '2',
    serviceName: 'Corte + Barba',
    date: new Date(),
    time: '11:30',
    duration: 45,
    price: 35,
    status: 'pending',
    notes: 'Primera vez en la barbería',
    createdAt: new Date(),
  },
  {
    id: '3',
    barberId: '1',
    barberName: 'Carlos Rodríguez',
    customerId: 'c3',
    customerName: 'Ana López',
    customerPhone: '5555555555',
    customerEmail: 'ana@email.com',
    serviceId: '4',
    serviceName: 'Corte premium',
    date: new Date(),
    time: '15:00',
    duration: 60,
    price: 45,
    status: 'completed',
    createdAt: new Date(),
  },
];

export function AdminAppointments() {
  const { toast } = useToast();
  const [appointments, setAppointments] =
    useState<Appointment[]>(mockAppointments);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);

  const _handleUpdateAppointmentStatus = (
    id: string,
    status: Appointment['status']
  ) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, status } : apt))
    );
    toast({
      title: 'Estado actualizado',
      description: `La cita ha sido marcada como ${status === 'confirmed' ? 'confirmada' : status === 'cancelled' ? 'cancelada' : 'completada'}.`,
    });
    setShowAppointmentDetails(false);
  };

  const _handleViewAppointmentDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentDetails(true);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Gestión de Citas</h1>
      <AppointmentsList
        appointments={appointments}
        onUpdateStatus={handleUpdateAppointmentStatus}
        onViewDetails={handleViewAppointmentDetails}
      />

      <AppointmentDetails
        appointment={selectedAppointment}
        isOpen={showAppointmentDetails}
        onClose={() => setShowAppointmentDetails(false)}
        onUpdateStatus={handleUpdateAppointmentStatus}
      />
    </div>
  );
}
