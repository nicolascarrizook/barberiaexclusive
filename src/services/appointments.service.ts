import { BaseService } from './base.service'
import { Database } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { realtimeService } from './realtime.service'
import { availabilityService } from './availability.service'

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
  customer: {
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
  };
  service: {
    name: string;
    duration_minutes: number;
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
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('duration_minutes, price')
      .eq('id', data.service_id)
      .maybeSingle();

    if (serviceError) this.handleError(serviceError);
    if (!service) throw new Error('Servicio no encontrado');

    // Calcular hora de fin
    const endTime = new Date(data.start_time);
    endTime.setMinutes(endTime.getMinutes() + service.duration_minutes);

    // Verificar disponibilidad
    const isAvailable = await this.checkSlotAvailability(
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
      confirmation_code: Math.random().toString(36).substring(2, 8).toUpperCase(), // Generar código único
    };
    
    // Debug logging
    console.log('📅 Creating appointment:', appointment);
    
    try {
      const result = await this.create(appointment);
      console.log('✅ Appointment created:', result);
      return result;
    } catch (error) {
      console.error('❌ Error creating appointment:', error);
      throw error;
    }
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
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', serviceId)
      .maybeSingle();

    if (serviceError) this.handleError(serviceError);
    if (!service) throw new Error('Servicio no encontrado');

    // Obtener horario del barbero para ese día
    const { data: schedule, error: scheduleError } = await supabase
      .from('barber_working_hours')
      .select('start_time, end_time')
      .eq('barber_id', barberId)
      .eq('day_of_week', date.getDay())
      .maybeSingle();

    if (scheduleError) this.handleError(scheduleError);

    if (!schedule) return []; // Barbero no trabaja ese día

    // Obtener citas existentes
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
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
    const slotDuration = 30; // Slots de 30 minutos
    const serviceDuration = service.duration_minutes;

    const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
    const [endHour, endMinute] = schedule.end_time.split(':').map(Number);

    const currentSlot = new Date(date);
    currentSlot.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(endHour, endMinute, 0, 0);

    while (currentSlot < endTime) {
      const slotEndTime = new Date(currentSlot);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + serviceDuration);

      // Verificar si el slot está disponible
      const isAvailable = !appointments?.some((apt) => {
        const aptStart = new Date(apt.start_time);
        const aptEnd = new Date(apt.end_time);
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

  async getAppointmentsByCustomer(
    customerId: string
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
        customer:profiles!appointments_customer_id_fkey (
          id,
          full_name,
          phone,
          email
        ),
        service:services!appointments_service_id_fkey (
          name,
          duration_minutes,
          price
        )
      `
      )
      .eq('customer_id', customerId)
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
        customer:profiles!appointments_customer_id_fkey (
          id,
          full_name,
          phone,
          email
        ),
        service:services!appointments_service_id_fkey (
          name,
          duration_minutes,
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
        customer:profiles!appointments_customer_id_fkey (
          id,
          full_name,
          phone,
          email
        ),
        service:services!appointments_service_id_fkey (
          name,
          duration_minutes,
          price
        ),
        price
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
    const now = new Date().toISOString();

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
        customer:profiles!appointments_customer_id_fkey (
          id,
          full_name,
          phone,
          email
        ),
        service:services!appointments_service_id_fkey (
          name,
          duration_minutes,
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

  async updateStatus(
    id: string,
    status: Appointment['status']
  ): Promise<Appointment> {
    return this.updateAppointmentStatus(id, status);
  }

  async getByBarberDateRange(
    barberId: string,
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
        customer:profiles!appointments_customer_id_fkey (
          id,
          full_name,
          phone,
          email
        ),
        service:services!appointments_service_id_fkey (
          name,
          duration_minutes,
          price
        )
      `
      )
      .eq('barber_id', barberId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true });

    if (error) this.handleError(error);
    return data || [];
  }

  async cancelAppointment(id: string, reason?: string): Promise<Appointment> {
    // Get appointment details first
    const appointment = await this.getById(id);
    
    const updates: AppointmentUpdate = {
      status: 'cancelled',
    };

    if (reason) {
      updates.notes = `${appointment.notes ? appointment.notes + '\n' : ''}Cancelado: ${reason}`;
    }

    const updatedAppointment = await this.update(id, updates);

    // Broadcast availability update after cancellation
    try {
      const dateString = appointment.start_time.split('T')[0];
      
      // Get service duration
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', appointment.service_id)
        .maybeSingle();

      if (serviceError) this.handleError(serviceError);

      if (service) {
        const dayAvailability = await availabilityService.getDayAvailability({
          barber_id: appointment.barber_id,
          barbershop_id: appointment.barbershop_id,
          date: dateString,
          service_duration: service.duration_minutes,
        });

        const availableSlots = dayAvailability.slots.filter(slot => slot.available).length;
        
        await realtimeService.broadcastAvailabilityUpdate({
          barberId: appointment.barber_id,
          date: dateString,
          availableSlots,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error('Error broadcasting availability update on cancellation:', error);
      // Don't fail the cancellation if broadcast fails
    }

    return updatedAppointment;
  }

  async getTodayStats(barbershopId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('appointments')
      .select('status, price')
      .eq('barbershop_id', barbershopId)
      .gte('start_time', today.toISOString())
      .lt('start_time', tomorrow.toISOString());

    if (error) this.handleError(error);

    const stats = {
      total: data?.length || 0,
      confirmed: data?.filter((a) => a.status === 'confirmed').length || 0,
      pending: data?.filter((a) => a.status === 'pending').length || 0,
      completed: data?.filter((a) => a.status === 'completed').length || 0,
      cancelled: data?.filter((a) => a.status === 'cancelled').length || 0,
      revenue:
        data
          ?.filter((a) => a.status === 'completed')
          .reduce((sum, a) => sum + a.price, 0) || 0,
    };

    return stats;
  }
}

export const appointmentService = new AppointmentService();
