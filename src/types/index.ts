export interface Barber {
  id: string;
  name: string;
  avatar?: string;
  specialties: string[];
  available: boolean;
  barbershop_id?: string;
}

export interface Service {
  id: string;
  name: string;
  duration: number; // in minutes
  price: number;
  description?: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface Appointment {
  id: string;
  barberId: string;
  barberName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceId: string;
  serviceName: string;
  date: Date;
  time: string;
  duration: number;
  price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  createdAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  appointments: Appointment[];
}