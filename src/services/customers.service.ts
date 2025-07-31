import { BaseService } from './base.service'
import { Database } from '@/types/database'
import { supabase } from '@/lib/supabase'

type User = Database['public']['Tables']['profiles']['Row'];
type UserInsert = Database['public']['Tables']['profiles']['Insert'];
type UserUpdate = Database['public']['Tables']['profiles']['Update'];

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
  }): Promise<User> {
    console.log('🆕 Creating customer:', customer);

    // Check if customer already exists by phone (including guest customers)
    const existingByPhone = await this.getByPhone(customer.phone);
    if (existingByPhone) {
      console.log('📱 Customer already exists with phone:', customer.phone);
      // Update email if provided and different
      if (customer.email && existingByPhone.email !== customer.email) {
        return this.update(existingByPhone.id, { email: customer.email });
      }
      return existingByPhone;
    }

    // If has email, check by email
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

    // Use the database function to create guest customer
    try {
      const { data, error } = await supabase.rpc('create_guest_customer', {
        p_full_name: customer.full_name,
        p_phone: customer.phone,
        p_email: customer.email || null
      });
      
      if (error) throw error;
      
      // Get the created customer
      const createdCustomer = await this.getById(data);
      if (!createdCustomer) {
        throw new Error('Failed to retrieve created customer');
      }
      
      console.log('✅ Guest customer created:', createdCustomer);
      return createdCustomer;
    } catch (error: any) {
      console.error('❌ Error creating guest customer:', error);
      throw error;
    }
  }

  async getByPhone(phone: string): Promise<User | null> {
    try {
      // Search for customer by phone, including guest customers
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .eq('role', 'customer') // Only get customers
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('Error getting customer by phone:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getByPhone:', error);
      return null;
    }
  }

  async getByEmail(email: string): Promise<User | null> {
    try {
      // Search for customer by email, including guest customers
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .eq('role', 'customer') // Only get customers
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('Error getting customer by email:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getByEmail:', error);
      return null;
    }
  }

  async searchCustomers(searchTerm: string): Promise<User[]> {
    const { data, error } = await this.query()
      .select('*')
      .eq('role', 'customer') // Only search customers
      .or(
        `full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
      )
      .limit(10);

    if (error) {
      console.error('Error searching customers:', error);
      return [];
    }
    
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
