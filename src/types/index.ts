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
  duration_minutes: number; // in minutes
  price: number;
  description?: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  reason?: 'appointment' | 'break' | 'time_off' | 'closed' | 'outside_hours';
  reasonText?: string;
  appointmentInfo?: {
    customerName?: string;
    serviceName?: string;
  };
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
  duration_minutes: number;
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
