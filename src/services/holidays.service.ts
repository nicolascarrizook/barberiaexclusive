import { BaseService } from './base.service';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.generated';

export type SpecialDate = Database['public']['Tables']['special_dates']['Row'];
export type SpecialDateInsert =
  Database['public']['Tables']['special_dates']['Insert'];
export type SpecialDateUpdate =
  Database['public']['Tables']['special_dates']['Update'];

export interface HolidayCustomHours {
  start?: string;
  end?: string;
  breaks?: Array<{
    start: string;
    end: string;
  }>;
}

// Type for affected appointments
interface AffectedAppointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  customer_id: string;
  barber_id: string;
  service_id: string;
  profiles: { full_name: string } | null;
  barbers: { display_name: string } | null;
  services: { name: string } | null;
}

export interface Holiday extends Omit<SpecialDate, 'custom_hours'> {
  custom_hours: HolidayCustomHours | null;
}

export type HolidayType = 'national' | 'local' | 'custom';

export interface HolidayFilter {
  year?: number;
  type?: HolidayType;
  barbershop_id?: string;
  is_closed?: boolean;
}

export interface ArgentineHoliday {
  date: string;
  name: string;
  type: 'fixed' | 'movable';
  is_national: boolean;
}

/**
 * Servicio para gestionar feriados y fechas especiales de la barbería
 * Permite manejar feriados nacionales argentinos y fechas especiales personalizadas
 */
export class HolidaysService extends BaseService<Holiday> {
  constructor() {
    super('special_dates');
  }

  /**
   * Lista de feriados argentinos fijos y movibles para 2024-2025
   */
  private readonly argentineHolidays: ArgentineHoliday[] = [
    // Feriados fijos 2024
    { date: '2024-01-01', name: 'Año Nuevo', type: 'fixed', is_national: true },
    {
      date: '2024-02-12',
      name: 'Carnaval',
      type: 'movable',
      is_national: true,
    },
    {
      date: '2024-02-13',
      name: 'Carnaval',
      type: 'movable',
      is_national: true,
    },
    {
      date: '2024-03-24',
      name: 'Día Nacional de la Memoria por la Verdad y la Justicia',
      type: 'fixed',
      is_national: true,
    },
    {
      date: '2024-03-29',
      name: 'Viernes Santo',
      type: 'movable',
      is_national: true,
    },
    {
      date: '2024-04-02',
      name: 'Día del Veterano y de los Caídos en la Guerra de Malvinas',
      type: 'fixed',
      is_national: true,
    },
    {
      date: '2024-05-01',
      name: 'Día del Trabajador',
      type: 'fixed',
      is_national: true,
    },
    {
      date: '2024-05-25',
      name: 'Día de la Revolución de Mayo',
      type: 'fixed',
      is_national: true,
    },
    {
      date: '2024-06-17',
      name: 'Día Paso a la Inmortalidad del General Martín Miguel de Güemes',
      type: 'fixed',
      is_national: true,
    },
    {
      date: '2024-06-20',
      name: 'Día Paso a la Inmortalidad del General Manuel Belgrano',
      type: 'fixed',
      is_national: true,
    },
    {
      date: '2024-07-09',
      name: 'Día de la Independencia',
      type: 'fixed',
      is_national: true,
    },
    {
      date: '2024-08-17',
      name: 'Día Paso a la Inmortalidad del General José de San Martín',
      type: 'fixed',
      is_national: true,
    },
    {
      date: '2024-10-12',
      name: 'Día del Respeto a la Diversidad Cultural',
      type: 'fixed',
      is_national: true,
    },
    {
      date: '2024-11-20',
      name: 'Día de la Soberanía Nacional',
      type: 'fixed',
      is_national: true,
    },
    {
      date: '2024-12-08',
      name: 'Inmaculada Concepción de María',
      type: 'fixed',
      is_national: true,
    },
    { date: '2024-12-25', name: 'Navidad', type: 'fixed', is_national: true },

    // Feriados fijos 2025
    { date: '2025-01-01', name: 'Año Nuevo', type: 'fixed', is_national: true },
    {
      date: '2025-03-03',
      name: 'Carnaval',
      type: 'movable',
      is_national: true,
    },
    {
      date: '2025-03-04',
      name: 'Carnaval',
      type: 'movable',
      is_national: true,
    },
    {
      date: '2025-03-24',
      name: 'Día Nacional de la Memoria por la Verdad y la Justicia',
      type: 'fixed',
      is_national: true,
    },
    {
      date: '2025-04-18',
      name: 'Viernes Santo',
      type: 'movable',
      is_national: true,
    },
    {
      date: '2025-04-02',
      name: 'Día del Veterano y de los Caídos en la Guerra de Malvinas',
      type: 'fixed',
      is_national: true,
    },
    {
      date: '2025-05-01',
      name: 'Día del Trabajador',
      type: 'fixed',
      is_national: true,
    },
    {
      date: '2025-05-25',
      name: 'Día de la Revolución de Mayo',
      type: 'fixed',
      is_national: true,
    },
    {
      date: '2025-06-17',
      name: 'Día Paso a la Inmortalidad del General Martín Miguel de Güemes',
      type: 'fixed',
      is_national: true,
    },
    {
      date: '2025-06-20',
      name: 'Día Paso a la Inmortalidad del General Manuel Belgrano',
      type: 'fixed',
      is_national: true,
    },
    {
      date: '2025-07-09',
      name: 'Día de la Independencia',
      type: 'fixed',
      is_national: true,
    },
    {
      date: '2025-08-17',
      name: 'Día Paso a la Inmortalidad del General José de San Martín',
      type: 'fixed',
      is_national: true,
    },
    {
      date: '2025-10-12',
      name: 'Día del Respeto a la Diversidad Cultural',
      type: 'fixed',
      is_national: true,
    },
    {
      date: '2025-11-20',
      name: 'Día de la Soberanía Nacional',
      type: 'fixed',
      is_national: true,
    },
    {
      date: '2025-12-08',
      name: 'Inmaculada Concepción de María',
      type: 'fixed',
      is_national: true,
    },
    { date: '2025-12-25', name: 'Navidad', type: 'fixed', is_national: true },
  ];

  /**
   * Obtiene todos los feriados de una barbería para un año específico
   */
  async getHolidaysByYear(
    barbershopId: string,
    year: number
  ): Promise<Holiday[]> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data, error } = await this.query()
      .select('*')
      .eq('barbershop_id', barbershopId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) this.handleError(error);

    return (data || []).map(this.transformSpecialDate);
  }

  /**
   * Obtiene todos los feriados filtrados por criterios específicos
   */
  async getFilteredHolidays(
    barbershopId: string,
    filter: HolidayFilter = {}
  ): Promise<Holiday[]> {
    let query = this.query().select('*').eq('barbershop_id', barbershopId);

    if (filter.year) {
      const startDate = `${filter.year}-01-01`;
      const endDate = `${filter.year}-12-31`;
      query = query.gte('date', startDate).lte('date', endDate);
    }

    if (filter.is_closed !== undefined) {
      // Si is_closed es true, buscamos holidays sin custom_hours (cerrado)
      // Si is_closed es false, buscamos holidays con custom_hours (horarios especiales)
      if (filter.is_closed) {
        query = query.is('custom_hours', null);
      } else {
        query = query.not('custom_hours', 'is', null);
      }
    }

    query = query.order('date', { ascending: true });

    const { data, error } = await query;

    if (error) this.handleError(error);

    let holidays = (data || []).map(this.transformSpecialDate);

    // Filtrar por tipo si se especifica
    if (filter.type) {
      holidays = holidays.filter(
        (holiday) => this.getHolidayType(holiday) === filter.type
      );
    }

    return holidays;
  }

  /**
   * Crea o actualiza un feriado
   */
  async createOrUpdateHoliday(
    holiday: Omit<Holiday, 'id' | 'created_at'>
  ): Promise<Holiday> {
    const holidayData: SpecialDateInsert = {
      barbershop_id: holiday.barbershop_id,
      barber_id: holiday.barber_id,
      date: holiday.date,
      is_holiday: holiday.is_holiday,
      custom_hours: holiday.custom_hours,
      reason: holiday.reason,
    };

    // Use upsert pattern to handle duplicates more gracefully
    // First, try to get existing holiday
    const { data: existing, error: fetchError } = await this.query()
      .select('*')
      .eq('barbershop_id', holiday.barbershop_id!)
      .eq('date', holiday.date)
      .maybeSingle(); // Use maybeSingle instead of single to handle multiple rows

    if (fetchError) {
      console.error('Error fetching existing holiday:', fetchError);
      this.handleError(fetchError);
    }

    if (existing) {
      // Update existing
      const { data, error } = await this.query()
        .update(holidayData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating holiday:', error);
        this.handleError(error);
      }
      return this.transformSpecialDate(data);
    } else {
      // Create new
      const { data, error } = await this.query()
        .insert(holidayData)
        .select()
        .single();

      if (error) {
        // If it's a unique constraint violation, try to fetch and update
        if (error.code === '23505') {
          console.warn(
            'Unique constraint violation, attempting to fetch and update'
          );

          // Fetch the existing record
          const { data: existingRetry, error: retryFetchError } =
            await this.query()
              .select('*')
              .eq('barbershop_id', holiday.barbershop_id!)
              .eq('date', holiday.date)
              .single();

          if (retryFetchError) {
            console.error(
              'Error fetching existing holiday on retry:',
              retryFetchError
            );
            this.handleError(retryFetchError);
          }

          if (existingRetry) {
            // Update the existing record
            const { data: updatedData, error: updateError } = await this.query()
              .update(holidayData)
              .eq('id', existingRetry.id)
              .select()
              .single();

            if (updateError) {
              console.error('Error updating holiday on retry:', updateError);
              this.handleError(updateError);
            }
            return this.transformSpecialDate(updatedData);
          }
        }

        console.error('Error creating holiday:', error);
        this.handleError(error);
      }
      return this.transformSpecialDate(data);
    }
  }

  /**
   * Obtiene un feriado específico por fecha
   */
  async getHolidayByDate(
    barbershopId: string,
    date: string
  ): Promise<Holiday | null> {
    const { data, error } = await this.query()
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('date', date)
      .maybeSingle(); // Use maybeSingle to handle 0 or multiple rows gracefully

    if (error) {
      console.error('Error fetching holiday by date:', error);
      this.handleError(error);
    }

    // If multiple rows exist (shouldn't happen with unique constraint),
    // maybeSingle returns null, which is handled gracefully
    return data ? this.transformSpecialDate(data) : null; 
  }

  /**
   * Elimina un feriado por fecha
   */
  async deleteHolidayByDate(barbershopId: string, date: string): Promise<void> {
    const { error } = await this.query()
      .delete()
      .eq('barbershop_id', barbershopId)
      .eq('date', date);

    if (error) this.handleError(error);
  }

  /**
   * Importa todos los feriados argentinos para un año específico
   */
  async importArgentineHolidays(
    barbershopId: string,
    year: number
  ): Promise<Holiday[]> {
    const yearHolidays = this.argentineHolidays.filter((holiday) =>
      holiday.date.startsWith(year.toString())
    );

    const importedHolidays: Holiday[] = [];

    for (const holiday of yearHolidays) {
      const existingHoliday = await this.getHolidayByDate(
        barbershopId,
        holiday.date
      );

      // Solo importar si no existe ya
      if (!existingHoliday) {
        const newHoliday = await this.createOrUpdateHoliday({
          barbershop_id: barbershopId,
          barber_id: null,
          date: holiday.date,
          is_holiday: true,
          custom_hours: null, // Por defecto cerrado
          reason: holiday.name,
        });
        importedHolidays.push(newHoliday);
      }
    }

    return importedHolidays;
  }

  /**
   * Copia la configuración de feriados de un año a otro
   */
  async copyHolidaysFromPreviousYear(
    barbershopId: string,
    fromYear: number,
    toYear: number
  ): Promise<Holiday[]> {
    const previousYearHolidays = await this.getHolidaysByYear(
      barbershopId,
      fromYear
    );
    const copiedHolidays: Holiday[] = [];

    for (const holiday of previousYearHolidays) {
      // Solo copiar feriados personalizados (no nacionales)
      if (this.getHolidayType(holiday) === 'custom') {
        const newDate = holiday.date.replace(
          fromYear.toString(),
          toYear.toString()
        );

        // Verificar que la fecha sea válida
        if (this.isValidDate(newDate)) {
          const existingHoliday = await this.getHolidayByDate(
            barbershopId,
            newDate
          );

          if (!existingHoliday) {
            const copiedHoliday = await this.createOrUpdateHoliday({
              barbershop_id: holiday.barbershop_id,
              barber_id: holiday.barber_id,
              date: newDate,
              is_holiday: holiday.is_holiday,
              custom_hours: holiday.custom_hours,
              reason: holiday.reason,
            });
            copiedHolidays.push(copiedHoliday);
          }
        }
      }
    }

    return copiedHolidays;
  }

  /**
   * Obtiene las citas afectadas por un feriado
   */
  async getAffectedAppointments(
    barbershopId: string,
    date: string
  ): Promise<AffectedAppointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(
        `
        id,
        start_time,
        end_time,
        status,
        customer_id,
        barber_id,
        service_id,
        profiles:customer_id (full_name),
        barbers (display_name),
        services (name)
      `
      )
      .eq('barbershop_id', barbershopId)
      .gte('start_time', `${date}T00:00:00`)
      .lt('start_time', `${date}T23:59:59`)
      .in('status', ['pending', 'confirmed']);

    if (error) this.handleError(error);
    return data || [];
  }

  /**
   * Obtiene la lista de feriados argentinos disponibles para importar
   */
  getAvailableArgentineHolidays(year: number): ArgentineHoliday[] {
    return this.argentineHolidays.filter((holiday) =>
      holiday.date.startsWith(year.toString())
    );
  }

  /**
   * Determina el tipo de feriado basado en si está en la lista de feriados argentinos
   */
  private getHolidayType(holiday: Holiday): HolidayType {
    const isNational = this.argentineHolidays.some(
      (ah) => ah.date === holiday.date
    );
    if (isNational) return 'national';
    return 'custom';
  }

  /**
   * Transforma SpecialDate a Holiday con tipos correctos
   */
  private transformSpecialDate(specialDate: SpecialDate): Holiday {
    return {
      ...specialDate,
      custom_hours: specialDate.custom_hours as HolidayCustomHours | null,
    };
  }

  /**
   * Valida si una fecha es válida
   */
  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Obtiene estadísticas de feriados para un año
   */
  async getHolidayStats(
    barbershopId: string,
    year: number
  ): Promise<{
    total: number;
    national: number;
    custom: number;
    closed: number;
    specialHours: number;
  }> {
    const holidays = await this.getHolidaysByYear(barbershopId, year);

    return {
      total: holidays.length,
      national: holidays.filter((h) => this.getHolidayType(h) === 'national')
        .length,
      custom: holidays.filter((h) => this.getHolidayType(h) === 'custom')
        .length,
      closed: holidays.filter((h) => !h.custom_hours).length,
      specialHours: holidays.filter((h) => h.custom_hours).length,
    };
  }
}

export const holidaysService = new HolidaysService();
