import { BaseService } from './base.service'
import { Database } from '@/types/database'
import { supabase } from '@/lib/supabase'

type User = Database['public']['Tables']['users']['Row']
type UserInsert = Database['public']['Tables']['users']['Insert']
type UserUpdate = Database['public']['Tables']['users']['Update']

export interface CustomerWithStats extends User {
  total_appointments: number
  last_appointment: Date | null
  total_spent: number
}

class CustomerService extends BaseService<User> {
  constructor() {
    super('users')
  }

  async createCustomer(customer: {
    full_name: string
    phone: string
    email?: string
  }): Promise<User> {
    // Verificar si ya existe un cliente con ese teléfono
    const existing = await this.getByPhone(customer.phone)
    if (existing) return existing

    const newCustomer: UserInsert = {
      full_name: customer.full_name,
      phone: customer.phone,
      email: customer.email || null,
      role: 'client',
    }

    return this.create(newCustomer)
  }

  async getByPhone(phone: string): Promise<User | null> {
    const { data, error } = await this.query()
      .select('*')
      .eq('phone', phone)
      .eq('role', 'client')
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // No encontrado
      this.handleError(error)
    }

    return data
  }

  async getByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.query()
      .select('*')
      .eq('email', email)
      .eq('role', 'client')
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      this.handleError(error)
    }

    return data
  }

  async searchCustomers(searchTerm: string): Promise<User[]> {
    const { data, error } = await this.query()
      .select('*')
      .eq('role', 'client')
      .or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(10)

    if (error) this.handleError(error)
    return data || []
  }

  async getCustomerWithStats(customerId: string): Promise<CustomerWithStats | null> {
    // Obtener datos del cliente
    const customer = await this.getById(customerId)
    if (!customer) return null

    // Obtener estadísticas de citas
    const { data: appointments } = await supabase
      .from('appointments')
      .select('start_time, total_price, status')
      .eq('client_id', customerId)
      .order('start_time', { ascending: false })

    const totalAppointments = appointments?.length || 0
    const lastAppointment = appointments?.[0]?.start_time 
      ? new Date(appointments[0].start_time) 
      : null
    const totalSpent = appointments
      ?.filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + a.total_price, 0) || 0

    return {
      ...customer,
      total_appointments: totalAppointments,
      last_appointment: lastAppointment,
      total_spent: totalSpent,
    }
  }

  async getFrequentCustomers(barbershopId: string, limit = 10): Promise<CustomerWithStats[]> {
    const { data, error } = await supabase.rpc('get_frequent_customers', {
      p_barbershop_id: barbershopId,
      p_limit: limit,
    })

    if (error) this.handleError(error)
    return data || []
  }

  async updateCustomer(id: string, updates: UserUpdate): Promise<User> {
    return this.update(id, updates)
  }

  async getCustomerHistory(customerId: string) {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        barber:barbers!appointments_barber_id_fkey (
          user:users!barbers_user_id_fkey (
            full_name
          )
        ),
        service:services!appointments_service_id_fkey (
          name,
          price
        )
      `)
      .eq('client_id', customerId)
      .order('start_time', { ascending: false })

    if (error) this.handleError(error)
    return data || []
  }
}

export const customerService = new CustomerService()