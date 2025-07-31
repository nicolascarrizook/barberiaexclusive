import { BaseService } from './base.service'
import { Database } from '@/types/database'
import { supabase } from '@/lib/supabase'

type User = Database['public']['Tables']['profiles']['Row'];
type UserInsert = Database['public']['Tables']['profiles']['Insert'];
type UserUpdate = Database['public']['Tables']['profiles']['Update'];

// Guest customer type (not in auth system)
interface GuestCustomer {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerWithStats extends User {
  total_appointments: number;
  last_appointment: Date | null;
  total_spent: number;
}

class CustomerService extends BaseService<User> {
  constructor() {
    super('profiles');
  }

  async createCustomer(customer: {
    full_name: string;
    phone: string;
    email?: string;
  }): Promise<User | GuestCustomer> {
    // First check if customer exists in profiles (authenticated users)
    const existing = await this.getByPhone(customer.phone);
    if (existing) {
      console.log('📱 Customer already exists in profiles with phone:', customer.phone);
      return existing;
    }

    // Check if customer exists in guest_customers
    const { data: existingGuest, error: guestCheckError } = await supabase
      .from('guest_customers')
      .select('*')
      .eq('phone', customer.phone)
      .single();
      
    if (existingGuest && !guestCheckError) {
      console.log('📱 Guest customer already exists with phone:', customer.phone);
      return existingGuest;
    }

    // If has email, check profiles by email
    if (customer.email) {
      const existingByEmail = await this.getByEmail(customer.email);
      if (existingByEmail) {
        console.log('📧 Customer already exists with email:', customer.email);
        // Update phone if different
        if (existingByEmail.phone !== customer.phone) {
          return this.update(existingByEmail.id, { phone: customer.phone });
        }
        return existingByEmail;
      }
    }

    // Create as guest customer (no auth required)
    const newGuestCustomer = {
      full_name: customer.full_name,
      phone: customer.phone,
      email: customer.email || null,
    };

    console.log('🆕 Creating new guest customer:', newGuestCustomer);
    
    try {
      const { data, error } = await supabase
        .from('guest_customers')
        .insert(newGuestCustomer)
        .select()
        .single();
        
      if (error) throw error;
      console.log('✅ Guest customer created:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error creating guest customer:', error);
      // If fails due to duplicate, try to find again
      if (error.message?.includes('duplicate')) {
        const { data: retryGuest } = await supabase
          .from('guest_customers')
          .select('*')
          .eq('phone', customer.phone)
          .single();
        if (retryGuest) return retryGuest;
      }
      throw error;
    }
  }

  async getByPhone(phone: string): Promise<User | null> {
    const { data, error } = await this.query()
      .select('*')
      .eq('phone', phone)
      .eq('role', 'customer')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No encontrado
      this.handleError(error);
    }

    return data;
  }

  async getByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.query()
      .select('*')
      .eq('email', email)
      .eq('role', 'customer')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      this.handleError(error);
    }

    return data;
  }

  async searchCustomers(searchTerm: string): Promise<User[]> {
    const { data, error } = await this.query()
      .select('*')
      .eq('role', 'customer')
      .or(
        `full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
      )
      .limit(10);

    if (error) this.handleError(error);
    return data || [];
  }

  async getCustomerWithStats(
    customerId: string
  ): Promise<CustomerWithStats | null> {
    // Obtener datos del cliente
    const customer = await this.getById(customerId);
    if (!customer) return null;

    // Obtener estadísticas de citas
    const { data: appointments } = await supabase
      .from('appointments')
      .select('start_time, price, status')
      .eq('customer_id', customerId)
      .order('start_time', { ascending: false });

    const totalAppointments = appointments?.length || 0;
    const lastAppointment = appointments?.[0]?.start_time
      ? new Date(appointments[0].start_time)
      : null;
    const totalSpent =
      appointments
        ?.filter((a) => a.status === 'completed')
        .reduce((sum, a) => sum + a.price, 0) || 0;

    return {
      ...customer,
      total_appointments: totalAppointments,
      last_appointment: lastAppointment,
      total_spent: totalSpent,
    };
  }

  async getFrequentCustomers(
    barbershopId: string,
    limit = 10
  ): Promise<CustomerWithStats[]> {
    const { data, error } = await supabase.rpc('get_frequent_customers', {
      p_barbershop_id: barbershopId,
      p_limit: limit,
    });

    if (error) this.handleError(error);
    return data || [];
  }

  async updateCustomer(id: string, updates: UserUpdate): Promise<User> {
    return this.update(id, updates);
  }

  async getCustomerHistory(customerId: string) {
    const { data, error } = await supabase
      .from('appointments')
      .select(
        `
        *,
        barber:barbers!appointments_barber_id_fkey (
          display_name,
          profile:profiles!barbers_profile_id_fkey (
            full_name
          )
        ),
        service:services!appointments_service_id_fkey (
          name,
          price
        )
      `
      )
      .eq('customer_id', customerId)
      .order('start_time', { ascending: false });

    if (error) this.handleError(error);
    return data || [];
  }
}

export const customerService = new CustomerService();
