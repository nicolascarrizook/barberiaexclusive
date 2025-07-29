import { BaseService } from './base.service'
import { Database } from '@/types/database'
import { supabase } from '@/lib/supabase'

type Barber = Database['public']['Tables']['barbers']['Row']
type BarberInsert = Database['public']['Tables']['barbers']['Insert']
type BarberUpdate = Database['public']['Tables']['barbers']['Update']

export interface BarberWithProfile extends Barber {
  profile: {
    id: string
    full_name: string
    email: string | null
    phone: string | null
    avatar_url: string | null
  }
}

class BarberService extends BaseService<Barber> {
  constructor() {
    super('barbers')
  }

  async getBarbersByBarbershop(barbershopId: string, includeInactive = false): Promise<BarberWithProfile[]> {
    let query = supabase
      .from('barbers')
      .select(`
        *,
        profile:profiles!barbers_profile_id_fkey (
          id,
          full_name,
          email,
          phone,
          avatar_url
        )
      `)
      .eq('barbershop_id', barbershopId)

    // Only filter by active status if not including inactive barbers
    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query.order('display_name')

    if (error) this.handleError(error)
    return data || []
  }

  async getActiveBarbers(): Promise<BarberWithProfile[]> {
    const { data, error } = await supabase
      .from('barbers')
      .select(`
        *,
        profile:profiles!barbers_profile_id_fkey (
          id,
          full_name,
          email,
          phone,
          avatar_url
        )
      `)
      .eq('is_active', true)
      .order('rating', { ascending: false })

    if (error) this.handleError(error)
    return data || []
  }

  // Método simplificado para obtener barberos con la estructura esperada por BookingPage
  async getAll(options?: { filters?: { active?: boolean } }) {
    const query = supabase
      .from('barbers')
      .select(`
        *,
        profile:profiles!barbers_profile_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)

    if (options?.filters?.active !== undefined) {
      query.eq('is_active', options.filters.active)
    }

    const { data, error } = await query.order('display_name')

    if (error) this.handleError(error)

    // Transformar los datos para que tengan la estructura esperada
    return (data || []).map(barber => ({
      id: barber.id,
      full_name: barber.profile?.full_name || barber.display_name,
      avatar_url: barber.profile?.avatar_url || null,
      specialties: barber.specialties,
      active: barber.is_active,
      barbershop_id: barber.barbershop_id,
      // Incluir otros campos que puedan ser necesarios
      profile_id: barber.profile_id,
      display_name: barber.display_name,
      bio: barber.bio,
      years_experience: barber.years_experience,
      rating: barber.rating,
      total_reviews: barber.total_reviews
    }))
  }

  async getBarberSchedule(barberId: string, date: Date) {
    const dateStr = date.toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('barber_schedules')
      .select('*')
      .eq('barber_id', barberId)
      .eq('date', dateStr)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No hay horario especial, usar horario regular
        return this.getBarberRegularSchedule(barberId, date.getDay())
      }
      this.handleError(error)
    }

    return data
  }

  async getBarberRegularSchedule(barberId: string, dayOfWeek: number) {
    const { data, error } = await supabase
      .from('barber_working_hours')
      .select('*')
      .eq('barber_id', barberId)
      .eq('day_of_week', dayOfWeek)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Barbero no trabaja ese día
      this.handleError(error)
    }

    return data
  }

  async getBarberAppointments(barberId: string, date: Date) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('barber_id', barberId)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .in('status', ['pending', 'confirmed'])
      .order('start_time')

    if (error) this.handleError(error)
    return data || []
  }

  async updateBarber(barberId: string, updates: BarberUpdate): Promise<Barber> {
    return this.update(barberId, updates)
  }

  async updateBarberStatus(barberId: string, isActive: boolean): Promise<Barber> {
    return this.update(barberId, { is_active: isActive })
  }

  async updateBarberRating(barberId: string, rating: number, totalReviews: number): Promise<Barber> {
    return this.update(barberId, { rating, total_reviews: totalReviews })
  }

  // Removed createBarberWithProfile - profiles can only be created by the user themselves

  // Removed updateBarberWithProfile - profiles can only be updated by the user themselves

  async inviteBarberByEmail(data: {
    barbershop_id: string;
    email: string;
    display_name: string;
    message?: string | null;
  }): Promise<void> {
    const { error } = await supabase
      .from('barber_invitations')
      .insert({
        barbershop_id: data.barbershop_id,
        email: data.email,
        display_name: data.display_name,
        invitation_type: 'email',
        message: data.message,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      })

    if (error) this.handleError(error)
    
    // TODO: Trigger email sending through Edge Function
  }

  async createManualBarber(data: {
    barbershop_id: string;
    display_name: string;
    bio?: string | null;
    specialties?: string[] | null;
    years_experience?: number | null;
    instagram_handle?: string | null;
    commission_percentage: number;
    can_accept_tips: boolean;
  }): Promise<{ invitation_code: string }> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('User not authenticated')

    // Start a transaction by creating invitation first
    const { data: invitation, error: invitationError } = await supabase
      .from('barber_invitations')
      .insert({
        barbershop_id: data.barbershop_id,
        display_name: data.display_name,
        invitation_type: 'manual',
        created_by: userId,
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (invitationError) this.handleError(invitationError)

    // Create provisional barber
    const { error: provisionalError } = await supabase
      .from('provisional_barbers')
      .insert({
        barbershop_id: data.barbershop_id,
        invitation_id: invitation.id,
        display_name: data.display_name,
        bio: data.bio,
        specialties: data.specialties,
        years_experience: data.years_experience,
        instagram_handle: data.instagram_handle,
        commission_percentage: data.commission_percentage,
        can_accept_tips: data.can_accept_tips,
        created_by: userId,
      })

    if (provisionalError) {
      // Rollback invitation if provisional creation fails
      await supabase
        .from('barber_invitations')
        .delete()
        .eq('id', invitation.id)
      
      this.handleError(provisionalError)
    }

    return { invitation_code: invitation.invitation_code }
  }

  async getInvitations(barbershopId: string) {
    const { data, error } = await supabase
      .from('barber_invitations')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('created_at', { ascending: false })

    if (error) this.handleError(error)
    return data || []
  }

  async cancelInvitation(invitationId: string): Promise<void> {
    const { error } = await supabase
      .from('barber_invitations')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId)

    if (error) this.handleError(error)
  }

  async claimInvitation(invitationCode: string): Promise<{
    success: boolean;
    barber_id?: string;
    barbershop_id?: string;
    invitation_type?: string;
  }> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .rpc('claim_barber_invitation', {
        p_invitation_code: invitationCode,
        p_user_id: userId
      })

    if (error) this.handleError(error)
    return data
  }
}

export const barberService = new BarberService()