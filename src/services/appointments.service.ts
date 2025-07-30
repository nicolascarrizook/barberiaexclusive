// // // // // import { BaseService } from './base.service'
// // // // // import { Database } from '@/types/database'
// // // // // import { supabase } from '@/lib/supabase'

type Appointment = Database['public']['Tables']['appointments']['Row'];
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];
type AppointmentUpdate = Database['public']['Tables']['appointments']['Update'];

export interface AppointmentWithDetails extends Appointment {
  barber: {
    id: string;
    display_name: string;
    profile: {
      id: string;
      full_name: string;
      avatar_url: string | null;
    };
  };
  client: {
    full_name: string;
    phone: string;
    email: string | null;
  };
  service: {
    name: string;
    duration: number;
    price: number;
  };
}

export interface CreateAppointmentData {
  barbershop_id: string;
  barber_id: string;
  customer_id: string;
  service_id: string;
  start_time: Date;
  notes?: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

class AppointmentService extends BaseService<Appointment> {
  constructor() {
    super('appointments');
  }

  async createAppointment(data: CreateAppointmentData): Promise<Appointment> {
    // Obtener duración del servicio
    const { data: service } = await supabase
      .from('services')
      .select('duration, price')
      .eq('id', data.service_id)
      .single();

    if (!service) throw new Error('Servicio no encontrado');

    // Calcular hora de fin
    const _endTime = new Date(data.start_time);
    endTime.setMinutes(endTime.getMinutes() + service.duration);

    // Verificar disponibilidad
    const _isAvailable = await this.checkSlotAvailability(
      data.barber_id,
      data.start_time,
      endTime
    );

    if (!isAvailable) {
      throw new Error('El horario seleccionado no está disponible');
    }

    // Crear la cita
    const appointment: AppointmentInsert = {
      barbershop_id: data.barbershop_id,
      barber_id: data.barber_id,
      customer_id: data.customer_id,
      service_id: data.service_id,
      start_time: data.start_time.toISOString(),
      end_time: endTime.toISOString(),
      status: 'pending',
      price: service.price,
      notes: data.notes || null,
    };

    return this.create(appointment);
  }

  async checkSlotAvailability(
    barberId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_slot_availability', {
      p_barber_id: barberId,
      p_start_time: startTime.toISOString(),
      p_end_time: endTime.toISOString(),
    });

    if (error) {
      console.error('Error verificando disponibilidad:', error);
      return false;
    }

    return data;
  }

  async getAvailableSlots(
    barberId: string,
    date: Date,
    serviceId: string
  ): Promise<TimeSlot[]> {
    // Obtener duración del servicio
    const { data: service } = await supabase
      .from('services')
      .select('duration')
      .eq('id', serviceId)
      .single();

    if (!service) throw new Error('Servicio no encontrado');

    // Obtener horario del barbero para ese día
    const { data: schedule } = await supabase
      .from('barber_working_hours')
      .select('start_time, end_time')
      .eq('barber_id', barberId)
      .eq('day_of_week', date.getDay())
      .single();

    if (!schedule) return []; // Barbero no trabaja ese día

    // Obtener citas existentes
    const _startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const _endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: appointments } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('barber_id', barberId)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .in('status', ['pending', 'confirmed']);

    // Generar slots disponibles
    const slots: TimeSlot[] = [];
    const _slotDuration = 30; // Slots de 30 minutos
    const _serviceDuration = service.duration;

    const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
    const [endHour, endMinute] = schedule.end_time.split(':').map(Number);

    const _currentSlot = new Date(date);
    currentSlot.setHours(startHour, startMinute, 0, 0);

    const _endTime = new Date(date);
    endTime.setHours(endHour, endMinute, 0, 0);

    while (currentSlot < endTime) {
      const _slotEndTime = new Date(currentSlot);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + serviceDuration);

      // Verificar si el slot está disponible
      const _isAvailable = !appointments?.some((apt) => {
        const _aptStart = new Date(apt.start_time);
        const _aptEnd = new Date(apt.end_time);
        return (
          (currentSlot >= aptStart && currentSlot < aptEnd) ||
          (slotEndTime > aptStart && slotEndTime <= aptEnd) ||
          (currentSlot <= aptStart && slotEndTime >= aptEnd)
        );
      });

      // Solo agregar si hay tiempo suficiente antes del cierre
      if (slotEndTime <= endTime) {
        slots.push({
          time: currentSlot.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          available: isAvailable,
        });
      }

      currentSlot.setMinutes(currentSlot.getMinutes() + slotDuration);
    }

    return slots;
  }

  async getAppointmentsByClient(
    clientId: string
  ): Promise<AppointmentWithDetails[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(
        `
        *,
        barber:barbers!appointments_barber_id_fkey (
          id,
          display_name,
          profile:profiles!barbers_profile_id_fkey (
            id,
            full_name,
            avatar_url
          )
        ),
        client:users!appointments_client_id_fkey (
          full_name,
          phone,
          email
        ),
        service:services!appointments_service_id_fkey (
          name,
          duration,
          price
        )
      `
      )
      .eq('client_id', clientId)
      .order('start_time', { ascending: false });

    if (error) this.handleError(error);
    return data || [];
  }

  async getAppointmentsByBarber(
    barberId: string
  ): Promise<AppointmentWithDetails[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(
        `
        *,
        barber:barbers!appointments_barber_id_fkey (
          id,
          display_name,
          profile:profiles!barbers_profile_id_fkey (
            id,
            full_name,
            avatar_url
          )
        ),
        client:users!appointments_client_id_fkey (
          full_name,
          phone,
          email
        ),
        service:services!appointments_service_id_fkey (
          name,
          duration,
          price
        )
      `
      )
      .eq('barber_id', barberId)
      .order('start_time', { ascending: false });

    if (error) this.handleError(error);
    return data || [];
  }

  async getByBarbershopDateRange(
    barbershopId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AppointmentWithDetails[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(
        `
        *,
        barber:barbers!appointments_barber_id_fkey (
          id,
          display_name,
          profile:profiles!barbers_profile_id_fkey (
            id,
            full_name,
            avatar_url
          )
        ),
        client:users!appointments_client_id_fkey (
          full_name,
          phone,
          email
        ),
        service:services!appointments_service_id_fkey (
          name,
          duration,
          price
        ),
        total_price
      `
      )
      .eq('barbershop_id', barbershopId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: false });

    if (error) this.handleError(error);
    return data || [];
  }

  async getUpcomingAppointments(
    barbershopId: string
  ): Promise<AppointmentWithDetails[]> {
    const _now = new Date().toISOString();

    const { data, error } = await supabase
      .from('appointments')
      .select(
        `
        *,
        barber:barbers!appointments_barber_id_fkey (
          id,
          display_name,
          profile:profiles!barbers_profile_id_fkey (
            id,
            full_name,
            avatar_url
          )
        ),
        client:users!appointments_client_id_fkey (
          full_name,
          phone,
          email
        ),
        service:services!appointments_service_id_fkey (
          name,
          duration,
          price
        )
      `
      )
      .eq('barbershop_id', barbershopId)
      .gte('start_time', now)
      .in('status', ['pending', 'confirmed'])
      .order('start_time')
      .limit(50);

    if (error) this.handleError(error);
    return data || [];
  }

  async updateAppointmentStatus(
    id: string,
    status: Appointment['status']
  ): Promise<Appointment> {
    return this.update(id, { status });
  }

  async cancelAppointment(id: string, reason?: string): Promise<Appointment> {
    const updates: AppointmentUpdate = {
      status: 'cancelled',
    };

    if (reason) {
      const _appointment = await this.getById(id);
      updates.notes = `${appointment.notes ? appointment.notes + '\n' : ''}Cancelado: ${reason}`;
    }

    return this.update(id, updates);
  }

  async getTodayStats(barbershopId: string) {
    const _today = new Date();
    today.setHours(0, 0, 0, 0);
    const _tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('appointments')
      .select('status, total_price')
      .eq('barbershop_id', barbershopId)
      .gte('start_time', today.toISOString())
      .lt('start_time', tomorrow.toISOString());

    if (error) this.handleError(error);

    const _stats = {
      total: data?.length || 0,
      confirmed: data?.filter((a) => a.status === 'confirmed').length || 0,
      pending: data?.filter((a) => a.status === 'pending').length || 0,
      completed: data?.filter((a) => a.status === 'completed').length || 0,
      cancelled: data?.filter((a) => a.status === 'cancelled').length || 0,
      revenue:
        data
          ?.filter((a) => a.status === 'completed')
          .reduce((sum, a) => sum + a.total_price, 0) || 0,
    };

    return stats;
  }
}

export const _appointmentService = new AppointmentService();
