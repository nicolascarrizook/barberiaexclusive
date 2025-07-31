import { BaseService } from './base.service'
import { Database } from '@/types/database'
import { supabase } from '@/lib/supabase'

type TimeOff = Database['public']['Tables']['time_off']['Row'];
type TimeOffInsert = Database['public']['Tables']['time_off']['Insert'];
type TimeOffUpdate = Database['public']['Tables']['time_off']['Update'];
type TimeOffStatus = Database['public']['Enums']['time_off_status'];

export interface TimeOffWithBarber extends TimeOff {
  barber: {
    id: string;
    display_name: string;
    profile: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

export interface TimeOffRequest {
  barber_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  notes?: string;
}

export interface TimeOffFilters {
  barber_id?: string;
  barbershop_id?: string;
  status?: TimeOffStatus;
  from_date?: string;
  to_date?: string;
}

export interface TimeOffStats {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  days_requested: number;
  days_approved: number;
}

class TimeOffService extends BaseService<TimeOff> {
  constructor() {
    super('time_off');
  }

  /**
   * Crea una nueva solicitud de vacaciones
   */
  async requestTimeOff(request: TimeOffRequest): Promise<TimeOff> {
    // Validar fechas
    const validation = this.validateDates(
      request.start_date,
      request.end_date
    );
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Verificar que no haya conflictos con otras vacaciones aprobadas
    const hasConflict = await this.checkTimeOffConflict(
      request.barber_id,
      request.start_date,
      request.end_date
    );

    if (hasConflict) {
      throw new Error(
        'Ya existe una solicitud de vacaciones aprobada para estas fechas'
      );
    }

    // Crear la solicitud
    const { data, error } = await supabase
      .from('time_off')
      .insert({
        barber_id: request.barber_id,
        start_date: request.start_date,
        end_date: request.end_date,
        reason: request.reason,
        notes: request.notes,
        status: 'pending' as TimeOffStatus,
      })
      .select()
      .single();

    if (error) this.handleError(error);

    return data;
  }

  /**
   * Obtiene las solicitudes de vacaciones con filtros
   */
  async getTimeOffRequests(
    filters: TimeOffFilters = {}
  ): Promise<TimeOffWithBarber[]> {
    let query = supabase.from('time_off').select(`
        *,
        barber:barbers!inner(
          id,
          display_name,
          profile:profiles(
            full_name,
            avatar_url
          )
        )
      `);

    // Aplicar filtros
    if (filters.barber_id) {
      query = query.eq('barber_id', filters.barber_id);
    }

    if (filters.barbershop_id) {
      query = query.eq('barber.barbershop_id', filters.barbershop_id);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.from_date) {
      query = query.gte('start_date', filters.from_date);
    }

    if (filters.to_date) {
      query = query.lte('end_date', filters.to_date);
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) this.handleError(error);

    return data || [];
  }

  /**
   * Obtiene las vacaciones activas de un barbero
   */
  async getActiveTimeOff(barberId: string, date?: string): Promise<TimeOff[]> {
    const checkDate = date || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('time_off')
      .select('*')
      .eq('barber_id', barberId)
      .eq('status', 'approved')
      .lte('start_date', checkDate)
      .gte('end_date', checkDate);

    if (error) this.handleError(error);

    return data || [];
  }

  /**
   * Aprueba una solicitud de vacaciones
   */
  async approveTimeOff(
    timeOffId: string,
    approvedBy: string,
    approvalNotes?: string
  ): Promise<TimeOff> {
    // Obtener la solicitud
    const { data: timeOff, error: fetchError } = await supabase
      .from('time_off')
      .select('*')
      .eq('id', timeOffId)
      .single();

    if (fetchError) this.handleError(fetchError);

    if (timeOff.status !== 'pending') {
      throw new Error('Solo se pueden aprobar solicitudes pendientes');
    }

    // Verificar conflictos antes de aprobar
    const hasConflict = await this.checkTimeOffConflict(
      timeOff.barber_id,
      timeOff.start_date,
      timeOff.end_date,
      timeOffId
    );

    if (hasConflict) {
      throw new Error(
        'No se puede aprobar: hay conflicto con otras vacaciones aprobadas'
      );
    }

    // Aprobar la solicitud
    const { data, error } = await supabase
      .from('time_off')
      .update({
        status: 'approved' as TimeOffStatus,
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        approval_notes: approvalNotes,
      })
      .eq('id', timeOffId)
      .select()
      .single();

    if (error) this.handleError(error);

    // TODO: Cancelar citas afectadas o enviar notificaciones

    return data;
  }

  /**
   * Rechaza una solicitud de vacaciones
   */
  async rejectTimeOff(
    timeOffId: string,
    rejectedBy: string,
    rejectionReason: string
  ): Promise<TimeOff> {
    const { data: timeOff, error: fetchError } = await supabase
      .from('time_off')
      .select('status')
      .eq('id', timeOffId)
      .single();

    if (fetchError) this.handleError(fetchError);

    if (timeOff.status !== 'pending') {
      throw new Error('Solo se pueden rechazar solicitudes pendientes');
    }

    const { data, error } = await supabase
      .from('time_off')
      .update({
        status: 'rejected' as TimeOffStatus,
        approved_by: rejectedBy,
        approved_at: new Date().toISOString(),
        approval_notes: rejectionReason,
      })
      .eq('id', timeOffId)
      .select()
      .single();

    if (error) this.handleError(error);

    return data;
  }

  /**
   * Cancela una solicitud de vacaciones
   */
  async cancelTimeOff(
    timeOffId: string,
    cancelledBy: string
  ): Promise<TimeOff> {
    const { data: timeOff, error: fetchError } = await supabase
      .from('time_off')
      .select('*')
      .eq('id', timeOffId)
      .single();

    if (fetchError) this.handleError(fetchError);

    // Solo se pueden cancelar solicitudes pendientes o aprobadas futuras
    if (timeOff.status === 'rejected' || timeOff.status === 'cancelled') {
      throw new Error('Esta solicitud ya fue rechazada o cancelada');
    }

    // Si ya comenzaron las vacaciones, no se pueden cancelar
    const today = new Date().toISOString().split('T')[0];
    if (timeOff.status === 'approved' && timeOff.start_date <= today) {
      throw new Error('No se pueden cancelar vacaciones que ya comenzaron');
    }

    const { data, error } = await supabase
      .from('time_off')
      .update({
        status: 'cancelled' as TimeOffStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', timeOffId)
      .select()
      .single();

    if (error) this.handleError(error);

    return data;
  }

  /**
   * Verifica si hay conflictos con otras vacaciones
   */
  async checkTimeOffConflict(
    barberId: string,
    startDate: string,
    endDate: string,
    excludeId?: string
  ): Promise<boolean> {
    let query = supabase
      .from('time_off')
      .select('id')
      .eq('barber_id', barberId)
      .eq('status', 'approved')
      .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) this.handleError(error);

    return (data || []).length > 0;
  }

  /**
   * Obtiene estadísticas de vacaciones
   */
  async getTimeOffStats(
    barberId: string,
    year?: number
  ): Promise<TimeOffStats> {
    const currentYear = year || new Date().getFullYear();
    const startOfYear = `${currentYear}-01-01`;
    const endOfYear = `${currentYear}-12-31`;

    const { data, error } = await supabase
      .from('time_off')
      .select('*')
      .eq('barber_id', barberId)
      .gte('start_date', startOfYear)
      .lte('end_date', endOfYear);

    if (error) this.handleError(error);

    const requests = data || [];

    const stats: TimeOffStats = {
      total_requests: requests.length,
      pending_requests: requests.filter((r) => r.status === 'pending').length,
      approved_requests: requests.filter((r) => r.status === 'approved').length,
      rejected_requests: requests.filter((r) => r.status === 'rejected').length,
      days_requested: 0,
      days_approved: 0,
    };

    // Calcular días totales
    requests.forEach((request) => {
      const days = this.calculateDays(request.start_date, request.end_date);
      stats.days_requested += days;

      if (request.status === 'approved') {
        stats.days_approved += days;
      }
    });

    return stats;
  }

  /**
   * Obtiene las vacaciones de un periodo específico
   */
  async getTimeOffByPeriod(
    barbershopId: string,
    startDate: string,
    endDate: string
  ): Promise<TimeOffWithBarber[]> {
    const { data, error } = await supabase
      .from('time_off')
      .select(
        `
        *,
        barber:barbers!inner(
          id,
          display_name,
          barbershop_id,
          profile:profiles(
            full_name,
            avatar_url
          )
        )
      `
      )
      .eq('barber.barbershop_id', barbershopId)
      .in('status', ['approved', 'pending'])
      .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)
      .order('start_date', { ascending: true });

    if (error) this.handleError(error);

    return data || [];
  }

  /**
   * Valida las fechas de las vacaciones
   */
  private validateDates(
    startDate: string,
    endDate: string
  ): { isValid: boolean; error?: string } {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validar formato de fecha
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { isValid: false, error: 'Formato de fecha inválido' };
    }

    // La fecha de inicio debe ser futura
    if (start < today) {
      return { isValid: false, error: 'La fecha de inicio debe ser futura' };
    }

    // La fecha de fin debe ser posterior o igual a la de inicio
    if (end < start) {
      return {
        isValid: false,
        error: 'La fecha de fin debe ser posterior a la de inicio',
      };
    }

    // Máximo 30 días de vacaciones continuas
    const days = this.calculateDays(startDate, endDate);
    if (days > 30) {
      return {
        isValid: false,
        error: 'No se pueden solicitar más de 30 días continuos',
      };
    }

    return { isValid: true };
  }

  /**
   * Calcula el número de días entre dos fechas
   */
  private calculateDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // +1 para incluir ambos días
  }
}

export const timeOffService = new TimeOffService();
