import { BaseService } from './base.service';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { format, startOfDay, endOfDay, addDays } from 'date-fns';

// Types from our Fresha database schema
type Appointment = Database['public']['Tables']['appointments']['Row'];
type AppointmentUpdate = Database['public']['Tables']['appointments']['Update'];

export interface AppointmentListItem {
  id: string;
  confirmation_code: string;
  start_at: string;
  end_at: string;
  status: string;
  total_amount: number;
  payment_status: string;
  notes?: string;
  customer_requests?: string;
  created_at: string;
  
  // Related data
  barber: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  customer: {
    id: string;
    full_name: string;
    phone?: string;
    email?: string;
  };
  services: Array<{
    id: string;
    order_index: number;
    service: {
      id: string;
      name: string;
      duration_minutes: number;
      price: number;
    };
  }>;
}

export interface AppointmentFilters {
  barbershop_id: string;
  date_from?: string;
  date_to?: string;
  barber_id?: string;
  status?: string[];
  payment_status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AppointmentStats {
  total_appointments: number;
  pending_appointments: number;
  confirmed_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  total_revenue: number;
  pending_revenue: number;
  average_service_time: number;
  customer_satisfaction: number;
}

export interface DaySchedule {
  date: string;
  appointments: AppointmentListItem[];
  total_appointments: number;
  total_revenue: number;
  occupancy_rate: number;
}

/**
 * Service for managing appointments - viewing, updating, canceling, etc.
 * Complements the booking.service.ts which handles creation
 */
export class AppointmentManagementService extends BaseService<Appointment> {
  constructor() {
    super('appointments');
  }

  /**
   * Get appointments with filters and pagination
   */
  async getAppointments(filters: AppointmentFilters): Promise<{
    appointments: AppointmentListItem[];
    total_count: number;
    has_more: boolean;
  }> {
    try {
      let query = supabase
        .from('appointments')
        .select(`
          id,
          confirmation_code,
          start_at,
          end_at,
          status,
          total_amount,
          payment_status,
          notes,
          customer_requests,
          created_at,
          barber_id,
          customer_id,
          barber:barbers(
            id,
            display_name,
            profiles!barbers_profile_id_fkey(avatar_url)
          ),
          customer:profiles(
            id,
            full_name,
            phone,
            email
          )
        `, { count: 'exact' })
        .eq('barbershop_id', filters.barbershop_id);

      // Apply filters
      if (filters.date_from) {
        query = query.gte('start_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('start_at', filters.date_to);
      }
      if (filters.barber_id) {
        query = query.eq('barber_id', filters.barber_id);
      }
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters.payment_status) {
        query = query.eq('payment_status', filters.payment_status);
      }
      if (filters.search) {
        query = query.or(`
          confirmation_code.ilike.%${filters.search}%,
          customer.full_name.ilike.%${filters.search}%,
          customer.phone.ilike.%${filters.search}%
        `);
      }

      // Pagination
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      query = query
        .order('start_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Error fetching appointments:', error);
        throw new Error(`Failed to fetch appointments: ${error.message}`);
      }

      // Fetch appointment services separately
      const appointmentIds = (data || []).map(a => a.id);
      let servicesData: any[] = [];
      
      if (appointmentIds.length > 0) {
        const { data: services, error: servicesError } = await supabase
          .from('appointment_services')
          .select(`
            id,
            appointment_id,
            order_index,
            service_id,
            unit_price,
            quantity,
            final_price,
            services(
              id,
              name,
              duration_minutes,
              price
            )
          `)
          .in('appointment_id', appointmentIds);
          
        if (servicesError) {
          console.error('❌ Error fetching appointment services:', servicesError);
        } else {
          servicesData = services || [];
        }
      }

      // Group services by appointment
      const servicesByAppointment = servicesData.reduce((acc, service) => {
        if (!acc[service.appointment_id]) {
          acc[service.appointment_id] = [];
        }
        acc[service.appointment_id].push(service);
        return acc;
      }, {} as Record<string, any[]>);

      // Transform data to flatten profile relationships
      const transformedAppointments = (data || []).map(appointment => ({
        ...appointment,
        barber: {
          ...appointment.barber,
          avatar_url: appointment.barber?.profiles?.avatar_url || null,
          profiles: undefined,
        },
        services: (servicesByAppointment[appointment.id] || [])
          .sort((a, b) => a.order_index - b.order_index)
          .map(as => ({
            id: as.id,
            order_index: as.order_index,
            service: {
              id: as.services.id,
              name: as.services.name,
              duration_minutes: as.services.duration_minutes,
              price: as.services.price
            }
          })),
      })) as AppointmentListItem[];

      return {
        appointments: transformedAppointments,
        total_count: count || 0,
        has_more: (offset + limit) < (count || 0),
      };
    } catch (error) {
      console.error('❌ Error in getAppointments:', error);
      throw error;
    }
  }

  /**
   * Get appointments for a specific date range (for calendar view)
   */
  async getAppointmentsByDateRange(
    barbershop_id: string,
    start_date: Date,
    end_date: Date,
    barber_id?: string
  ): Promise<DaySchedule[]> {
    try {
      const startStr = format(startOfDay(start_date), 'yyyy-MM-dd\'T\'HH:mm:ss\'Z\'');
      const endStr = format(endOfDay(end_date), 'yyyy-MM-dd\'T\'HH:mm:ss\'Z\'');

      let query = supabase
        .from('appointments')
        .select(`
          id,
          confirmation_code,
          start_at,
          end_at,
          status,
          total_amount,
          barber_id,
          customer_id,
          barber:barbers(
            id,
            display_name,
            profiles!barbers_profile_id_fkey(avatar_url)
          ),
          customer:profiles(
            id,
            full_name,
            phone
          )
        `)
        .eq('barbershop_id', barbershop_id)
        .gte('start_at', startStr)
        .lte('start_at', endStr)
        .in('status', ['pending', 'confirmed', 'arrived', 'in_progress', 'completed'])
        .order('start_at', { ascending: true });

      if (barber_id) {
        query = query.eq('barber_id', barber_id);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch appointments by date range: ${error.message}`);
      }

      // Fetch appointment services separately
      const appointmentIds = (data || []).map(a => a.id);
      let servicesData: any[] = [];
      
      if (appointmentIds.length > 0) {
        const { data: services, error: servicesError } = await supabase
          .from('appointment_services')
          .select(`
            id,
            appointment_id,
            order_index,
            service_id,
            unit_price,
            quantity,
            final_price,
            services(
              id,
              name,
              duration_minutes,
              price
            )
          `)
          .in('appointment_id', appointmentIds);
          
        if (servicesError) {
          console.error('❌ Error fetching appointment services:', servicesError);
        } else {
          servicesData = services || [];
        }
      }

      // Group services by appointment
      const servicesByAppointment = servicesData.reduce((acc, service) => {
        if (!acc[service.appointment_id]) {
          acc[service.appointment_id] = [];
        }
        acc[service.appointment_id].push(service);
        return acc;
      }, {} as Record<string, any[]>);

      // Transform and group by date
      const transformedAppointments = (data || []).map(appointment => ({
        ...appointment,
        barber: {
          ...appointment.barber,
          avatar_url: appointment.barber?.profiles?.avatar_url || null,
          profiles: undefined,
        },
        services: (servicesByAppointment[appointment.id] || [])
          .sort((a, b) => a.order_index - b.order_index)
          .map(as => ({
            id: as.id,
            order_index: as.order_index,
            service: {
              id: as.services.id,
              name: as.services.name,
              duration_minutes: as.services.duration_minutes,
              price: as.services.price
            }
          })),
      })) as AppointmentListItem[];

      // Group by date
      const daySchedules: DaySchedule[] = [];
      const current = new Date(start_date);
      
      while (current <= end_date) {
        const dayStr = format(current, 'yyyy-MM-dd');
        const dayAppointments = transformedAppointments.filter(apt => 
          apt.start_at.startsWith(dayStr)
        );

        const totalRevenue = dayAppointments
          .filter(apt => apt.status === 'completed')
          .reduce((sum, apt) => sum + apt.total_amount, 0);

        daySchedules.push({
          date: dayStr,
          appointments: dayAppointments,
          total_appointments: dayAppointments.length,
          total_revenue: totalRevenue,
          occupancy_rate: this.calculateOccupancyRate(dayAppointments),
        });

        current.setDate(current.getDate() + 1);
      }

      return daySchedules;
    } catch (error) {
      console.error('❌ Error in getAppointmentsByDateRange:', error);
      throw error;
    }
  }

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(
    appointment_id: string,
    status: string,
    notes?: string
  ): Promise<AppointmentListItem> {
    try {
      const updateData: AppointmentUpdate = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Add status-specific updates
      if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
      }
      if (status === 'no_show') {
        updateData.marked_no_show = true;
      }
      if (notes) {
        updateData.internal_notes = notes;
      }

      const { data, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointment_id)
        .select(`
          id,
          confirmation_code,
          start_at,
          end_at,
          status,
          total_amount,
          payment_status,
          notes,
          customer_requests,
          created_at,
          barber_id,
          customer_id,
          barber:barbers(
            id,
            display_name,
            profiles!barbers_profile_id_fkey(avatar_url)
          ),
          customer:profiles(
            id,
            full_name,
            phone,
            email
          )
        `)
        .single();

      if (error) {
        throw new Error(`Failed to update appointment status: ${error.message}`);
      }

      // Fetch appointment services separately
      const { data: services, error: servicesError } = await supabase
        .from('appointment_services')
        .select(`
          id,
          appointment_id,
          order_index,
          service_id,
          unit_price,
          quantity,
          final_price,
          services(
            id,
            name,
            duration_minutes,
            price
          )
        `)
        .eq('appointment_id', appointment_id);
        
      const servicesData = servicesError ? [] : (services || []);

      // Transform the response
      const transformed = {
        ...data,
        barber: {
          ...data.barber,
          avatar_url: data.barber?.profiles?.avatar_url || null,
          profiles: undefined,
        },
        services: servicesData
          .sort((a, b) => a.order_index - b.order_index)
          .map(as => ({
            id: as.id,
            order_index: as.order_index,
            service: {
              id: as.services.id,
              name: as.services.name,
              duration_minutes: as.services.duration_minutes,
              price: as.services.price
            }
          })),
      } as AppointmentListItem;

      console.log(`✅ Appointment ${appointment_id} status updated to: ${status}`);
      return transformed;
    } catch (error) {
      console.error('❌ Error updating appointment status:', error);
      throw error;
    }
  }

  /**
   * Get appointment statistics for dashboard
   */
  async getAppointmentStats(
    barbershop_id: string,
    date_from?: string,
    date_to?: string
  ): Promise<AppointmentStats> {
    try {
      let query = supabase
        .from('appointments')
        .select('status, total_amount, start_at, end_at, rating')
        .eq('barbershop_id', barbershop_id);

      if (date_from) query = query.gte('start_at', date_from);
      if (date_to) query = query.lte('start_at', date_to);

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch appointment stats: ${error.message}`);
      }

      const appointments = data || [];
      
      // Calculate stats
      const total_appointments = appointments.length;
      const pending_appointments = appointments.filter(a => a.status === 'pending').length;
      const confirmed_appointments = appointments.filter(a => a.status === 'confirmed').length;
      const completed_appointments = appointments.filter(a => a.status === 'completed').length;
      const cancelled_appointments = appointments.filter(a => a.status === 'cancelled').length;
      
      const total_revenue = appointments
        .filter(a => a.status === 'completed')
        .reduce((sum, a) => sum + a.total_amount, 0);
      
      const pending_revenue = appointments
        .filter(a => ['pending', 'confirmed'].includes(a.status))
        .reduce((sum, a) => sum + a.total_amount, 0);

      const completedAppointments = appointments.filter(a => a.status === 'completed');
      const average_service_time = completedAppointments.length > 0
        ? completedAppointments.reduce((sum, a) => {
            const duration = new Date(a.end_at).getTime() - new Date(a.start_at).getTime();
            return sum + (duration / (1000 * 60)); // minutes
          }, 0) / completedAppointments.length
        : 0;

      const ratedAppointments = appointments.filter(a => a.rating);
      const customer_satisfaction = ratedAppointments.length > 0
        ? ratedAppointments.reduce((sum, a) => sum + a.rating, 0) / ratedAppointments.length
        : 0;

      return {
        total_appointments,
        pending_appointments,
        confirmed_appointments,
        completed_appointments,
        cancelled_appointments,
        total_revenue,
        pending_revenue,
        average_service_time,
        customer_satisfaction,
      };
    } catch (error) {
      console.error('❌ Error getting appointment stats:', error);
      throw error;
    }
  }

  /**
   * Cancel appointment with reason
   */
  async cancelAppointment(
    appointment_id: string,
    reason: string,
    cancelled_by: string
  ): Promise<AppointmentListItem> {
    try {
      const updateData: AppointmentUpdate = {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by,
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointment_id)
        .select(`
          id,
          confirmation_code,
          start_at,
          end_at,
          status,
          total_amount,
          payment_status,
          notes,
          customer_requests,
          created_at,
          barber_id,
          customer_id,
          barber:barbers(
            id,
            display_name,
            profiles!barbers_profile_id_fkey(avatar_url)
          ),
          customer:profiles(
            id,
            full_name,
            phone,
            email
          )
        `)
        .single();

      if (error) {
        throw new Error(`Failed to cancel appointment: ${error.message}`);
      }

      // Fetch appointment services separately
      const { data: services, error: servicesError } = await supabase
        .from('appointment_services')
        .select(`
          id,
          appointment_id,
          order_index,
          service_id,
          unit_price,
          quantity,
          final_price,
          services(
            id,
            name,
            duration_minutes,
            price
          )
        `)
        .eq('appointment_id', appointment_id);
        
      const servicesData = servicesError ? [] : (services || []);

      // Transform the response
      const transformed = {
        ...data,
        barber: {
          ...data.barber,
          avatar_url: data.barber?.profiles?.avatar_url || null,
          profiles: undefined,
        },
        services: servicesData
          .sort((a, b) => a.order_index - b.order_index)
          .map(as => ({
            id: as.id,
            order_index: as.order_index,
            service: {
              id: as.services.id,
              name: as.services.name,
              duration_minutes: as.services.duration_minutes,
              price: as.services.price
            }
          })),
      } as AppointmentListItem;

      console.log(`✅ Appointment ${appointment_id} cancelled successfully`);
      return transformed;
    } catch (error) {
      console.error('❌ Error cancelling appointment:', error);
      throw error;
    }
  }

  /**
   * Update appointment payment status
   */
  async updatePaymentStatus(
    appointment_id: string,
    payment_status: string,
    payment_method?: string,
    amount_paid?: number
  ): Promise<AppointmentListItem> {
    try {
      const updateData: AppointmentUpdate = {
        payment_status,
        updated_at: new Date().toISOString(),
      };

      // TODO: Add payment_method and amount_paid fields to database
      
      const { data, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointment_id)
        .select(`
          id,
          confirmation_code,
          start_at,
          end_at,
          status,
          total_amount,
          payment_status,
          notes,
          customer_requests,
          created_at,
          barber_id,
          customer_id,
          barber:barbers(
            id,
            display_name,
            profiles!barbers_profile_id_fkey(avatar_url)
          ),
          customer:profiles(
            id,
            full_name,
            phone,
            email
          )
        `)
        .single();

      if (error) {
        throw new Error(`Failed to update payment status: ${error.message}`);
      }

      // Fetch services
      const { data: services } = await supabase
        .from('appointment_services')
        .select(`
          id,
          appointment_id,
          order_index,
          service_id,
          services(
            id,
            name,
            duration_minutes,
            price
          )
        `)
        .eq('appointment_id', appointment_id);

      // Transform and return
      const transformed = {
        ...data,
        barber: {
          ...data.barber,
          avatar_url: data.barber?.profiles?.avatar_url || null,
          profiles: undefined,
        },
        services: (services || [])
          .sort((a, b) => a.order_index - b.order_index)
          .map(as => ({
            id: as.id,
            order_index: as.order_index,
            service: {
              id: as.services.id,
              name: as.services.name,
              duration_minutes: as.services.duration_minutes,
              price: as.services.price
            }
          })),
      } as AppointmentListItem;

      console.log(`✅ Payment status updated for appointment ${appointment_id}`);
      return transformed;
    } catch (error) {
      console.error('❌ Error updating payment status:', error);
      throw error;
    }
  }

  /**
   * Update appointment notes
   */
  async updateAppointmentNotes(
    appointment_id: string,
    notes?: string,
    internal_notes?: string
  ): Promise<AppointmentListItem> {
    try {
      const updateData: AppointmentUpdate = {
        updated_at: new Date().toISOString(),
      };

      if (notes !== undefined) {
        updateData.notes = notes;
      }
      if (internal_notes !== undefined) {
        updateData.internal_notes = internal_notes;
      }

      const { data, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointment_id)
        .select(`
          id,
          confirmation_code,
          start_at,
          end_at,
          status,
          total_amount,
          payment_status,
          notes,
          customer_requests,
          created_at,
          barber_id,
          customer_id,
          barber:barbers(
            id,
            display_name,
            profiles!barbers_profile_id_fkey(avatar_url)
          ),
          customer:profiles(
            id,
            full_name,
            phone,
            email
          )
        `)
        .single();

      if (error) {
        throw new Error(`Failed to update notes: ${error.message}`);
      }

      // Fetch services
      const { data: services } = await supabase
        .from('appointment_services')
        .select(`
          id,
          appointment_id,
          order_index,
          service_id,
          services(
            id,
            name,
            duration_minutes,
            price
          )
        `)
        .eq('appointment_id', appointment_id);

      // Transform and return
      const transformed = {
        ...data,
        barber: {
          ...data.barber,
          avatar_url: data.barber?.profiles?.avatar_url || null,
          profiles: undefined,
        },
        services: (services || [])
          .sort((a, b) => a.order_index - b.order_index)
          .map(as => ({
            id: as.id,
            order_index: as.order_index,
            service: {
              id: as.services.id,
              name: as.services.name,
              duration_minutes: as.services.duration_minutes,
              price: as.services.price
            }
          })),
      } as AppointmentListItem;

      console.log(`✅ Notes updated for appointment ${appointment_id}`);
      return transformed;
    } catch (error) {
      console.error('❌ Error updating notes:', error);
      throw error;
    }
  }

  /**
   * Get today's appointments for quick dashboard view
   */
  async getTodaysAppointments(barbershop_id: string): Promise<AppointmentListItem[]> {
    const today = new Date();
    const tomorrow = addDays(today, 1);
    
    const schedules = await this.getAppointmentsByDateRange(
      barbershop_id,
      today,
      today
    );
    
    return schedules[0]?.appointments || [];
  }

  // Helper methods
  private calculateOccupancyRate(appointments: AppointmentListItem[]): number {
    if (appointments.length === 0) return 0;
    
    // Simple calculation: percentage of working hours occupied
    // This could be enhanced with actual working hours data
    const totalDuration = appointments.reduce((sum, apt) => {
      return sum + apt.services.reduce((serviceSum, service) => 
        serviceSum + service.service.duration_minutes, 0
      );
    }, 0);
    
    // Assuming 8 hours = 480 minutes working day
    return Math.min((totalDuration / 480) * 100, 100);
  }
}

// Export singleton instance
export const appointmentManagementService = new AppointmentManagementService();