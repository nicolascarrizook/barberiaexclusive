import { Dashboard } from '@/components/admin/Dashboard';
import { Appointment } from '@/types';

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
];

export function AdminDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard de Administración</h1>
      <Dashboard appointments={mockAppointments} />
    </div>
  );
}
