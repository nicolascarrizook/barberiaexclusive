// // // // // import { BaseService } from './base.service'
// // // // // import { Database, BarbershopHours as DBBarbershopHours } from '@/types/database'
// // // // // import { supabase } from '@/lib/supabase'

type DayOfWeek = Database['public']['Enums']['day_of_week'];

// Use the database type directly
export type BarbershopHours = DBBarbershopHours;

type BarbershopHoursInsert = Omit<
  BarbershopHours,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

type BarbershopHoursUpdate = Partial<BarbershopHoursInsert>;

export interface BarbershopHoursWithDefaults extends BarbershopHours {
  is_default: boolean;
}

export interface WeekSchedule {
  [key: string]: {
    is_closed: boolean;
    open_time?: string | null;
    close_time?: string | null;
  };
}

export interface TimeValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * BarbershopHoursService
 *
 * Service for managing barbershop business hours.
 * Uses the barbershop_hours table created by migration 004.
 */
class BarbershopHoursService extends BaseService<BarbershopHours> {
  constructor() {
    super('barbershop_hours');
  }

  /**
   * Obtiene el horario completo de una barbería
   * Primero busca horarios específicos de la barbería, si no encuentra usa los defaults del sistema
   */
  async getBarbershopSchedule(
    barbershopId: string
  ): Promise<BarbershopHoursWithDefaults[]> {
    try {
      // Primero intentar obtener horarios específicos de la barbería
      const { data: barbershopHours, error: barbershopError } = await supabase
        .from('barbershop_hours')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('day_of_week');

      if (barbershopError) this.handleError(barbershopError);

      // Si la barbería tiene horarios configurados, devolverlos
      if (barbershopHours && barbershopHours.length > 0) {
        return barbershopHours.map((hour) => ({
          ...hour,
          is_default: false,
        }));
      }

      // Si no, obtener los horarios por defecto del sistema (barbershop_id = NULL)
      const { data: defaultHours, error: defaultError } = await supabase
        .from('barbershop_hours')
        .select('*')
        .is('barbershop_id', null)
        .order('day_of_week');

      if (defaultError) this.handleError(defaultError);

      // Si hay horarios por defecto en la BD, usarlos
      if (defaultHours && defaultHours.length > 0) {
        return defaultHours.map((hour) => ({
          ...hour,
          barbershop_id: barbershopId, // Asignar el ID de la barbería
          is_default: true,
        }));
      }

      // Como último recurso, retornar horarios hardcodeados
      return this.getDefaultSchedule(barbershopId);
    } catch (error) {
      console.error('Error fetching barbershop schedule:', error);
      throw error;
    }
  }

  /**
   * Obtiene el horario por defecto
   */
  private getDefaultSchedule(
    barbershopId?: string
  ): BarbershopHoursWithDefaults[] {
    const days: DayOfWeek[] = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];

    return days.map((day) => ({
      id: `default-${day}`,
      barbershop_id: barbershopId || null,
      day_of_week: day,
      is_closed: day === 'sunday',
      open_time:
        day === 'sunday' ? null : day === 'saturday' ? '10:00' : '09:00',
      close_time:
        day === 'sunday' ? null : day === 'saturday' ? '18:00' : '20:00',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_default: true,
    }));
  }

  /**
   * Obtiene el horario de un día específico
   */
  async getDaySchedule(
    barbershopId: string,
    dayOfWeek: DayOfWeek
  ): Promise<BarbershopHoursWithDefaults | null> {
    const _schedule = await this.getBarbershopSchedule(barbershopId);
    return schedule.find((s) => s.day_of_week === dayOfWeek) || null;
  }

  /**
   * Actualiza el horario completo de una barbería
   */
  async updateBarbershopSchedule(
    barbershopId: string,
    schedule: WeekSchedule
  ): Promise<BarbershopHours[]> {
    try {
      const updates: BarbershopHoursInsert[] = Object.entries(schedule).map(
        ([day, hours]) => ({
          barbershop_id: barbershopId,
          day_of_week: day as DayOfWeek,
          is_closed: hours.is_closed,
          open_time: hours.is_closed
            ? null
            : this.normalizeTimeFormat(hours.open_time || null),
          close_time: hours.is_closed
            ? null
            : this.normalizeTimeFormat(hours.close_time || null),
        })
      );

      // Validar todos los horarios antes de guardar
      for (const update of updates) {
        const _validation = this.validateHours(update);
        if (!validation.isValid) {
          throw new Error(
            `Horario inválido para ${update.day_of_week}: ${validation.errors.join(', ')}`
          );
        }
      }

      // Eliminar horarios existentes
      const { error: deleteError } = await supabase
        .from('barbershop_hours')
        .delete()
        .eq('barbershop_id', barbershopId);

      if (deleteError) this.handleError(deleteError);

      // Insertar nuevos horarios
      const { data, error } = await supabase
        .from('barbershop_hours')
        .insert(updates)
        .select();

      if (error) this.handleError(error);

      return data || [];
    } catch (error) {
      console.error('Error updating barbershop schedule:', error);
      throw error;
    }
  }

  /**
   * Actualiza el horario de un día específico
   */
  async updateDaySchedule(
    barbershopId: string,
    dayOfWeek: DayOfWeek,
    hours: BarbershopHoursUpdate
  ): Promise<BarbershopHours> {
    try {
      // Validar horarios
      const _validation = this.validateHours(hours as BarbershopHoursInsert);
      if (!validation.isValid) {
        throw new Error(`Horario inválido: ${validation.errors.join(', ')}`);
      }

      // Verificar si ya existe un horario para ese día
      const { data: existing } = await supabase
        .from('barbershop_hours')
        .select('id')
        .eq('barbershop_id', barbershopId)
        .eq('day_of_week', dayOfWeek)
        .maybeSingle();

      if (existing) {
        // Actualizar horario existente
        const { data, error } = await supabase
          .from('barbershop_hours')
          .update({
            ...hours,
            open_time: hours.open_time
              ? this.normalizeTimeFormat(hours.open_time)
              : null,
            close_time: hours.close_time
              ? this.normalizeTimeFormat(hours.close_time)
              : null,
            break_start: hours.break_start
              ? this.normalizeTimeFormat(hours.break_start)
              : null,
            break_end: hours.break_end
              ? this.normalizeTimeFormat(hours.break_end)
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) this.handleError(error);
        return data!;
      } else {
        // Crear nuevo horario
        const { data, error } = await supabase
          .from('barbershop_hours')
          .insert({
            barbershop_id: barbershopId,
            day_of_week: dayOfWeek,
            ...hours,
            open_time: hours.open_time
              ? this.normalizeTimeFormat(hours.open_time)
              : null,
            close_time: hours.close_time
              ? this.normalizeTimeFormat(hours.close_time)
              : null,
            break_start: hours.break_start
              ? this.normalizeTimeFormat(hours.break_start)
              : null,
            break_end: hours.break_end
              ? this.normalizeTimeFormat(hours.break_end)
              : null,
          })
          .select()
          .single();

        if (error) this.handleError(error);
        return data!;
      }
    } catch (error) {
      console.error('Error updating day schedule:', error);
      throw error;
    }
  }

  /**
   * Copia el horario por defecto a una barbería específica
   */
  async copyDefaultSchedule(barbershopId: string): Promise<BarbershopHours[]> {
    try {
      // Obtener horario por defecto del sistema (barbershop_id = NULL)
      const { data: defaultHours, error: fetchError } = await supabase
        .from('barbershop_hours')
        .select('*')
        .is('barbershop_id', null)
        .order('day_of_week');

      if (fetchError) this.handleError(fetchError);

      if (!defaultHours || defaultHours.length === 0) {
        // Si no hay horarios por defecto en la BD, usar los hardcodeados
        const _hardcodedDefaults = this.getDefaultSchedule(barbershopId);
        const newHours: BarbershopHoursInsert[] = hardcodedDefaults.map(
          (hour) => ({
            barbershop_id: barbershopId,
            day_of_week: hour.day_of_week,
            is_closed: hour.is_closed,
            open_time: this.normalizeTimeFormat(hour.open_time),
            close_time: this.normalizeTimeFormat(hour.close_time),
          })
        );

        const { data, error } = await supabase
          .from('barbershop_hours')
          .insert(newHours)
          .select();

        if (error) this.handleError(error);
        return data || [];
      }

      // Crear copias con el barbershop_id
      const newHours: BarbershopHoursInsert[] = defaultHours.map((hour) => ({
        barbershop_id: barbershopId,
        day_of_week: hour.day_of_week,
        is_closed: hour.is_closed,
        open_time: this.normalizeTimeFormat(hour.open_time),
        close_time: this.normalizeTimeFormat(hour.close_time),
      }));

      // Eliminar horarios existentes si los hay
      const { error: deleteError } = await supabase
        .from('barbershop_hours')
        .delete()
        .eq('barbershop_id', barbershopId);

      if (deleteError) this.handleError(deleteError);

      // Insertar nuevos horarios
      const { data, error } = await supabase
        .from('barbershop_hours')
        .insert(newHours)
        .select();

      if (error) this.handleError(error);

      return data || [];
    } catch (error) {
      console.error('Error copying default schedule:', error);
      throw error;
    }
  }

  /**
   * Valida que los horarios sean coherentes
   */
  validateHours(hours: BarbershopHoursInsert): TimeValidationResult {
    const errors: string[] = [];

    if (hours.is_closed) {
      // Si está cerrado, no debe tener horarios
      if (
        hours.open_time ||
        hours.close_time ||
        hours.break_start ||
        hours.break_end
      ) {
        errors.push('Un día cerrado no debe tener horarios definidos');
      }
      return { isValid: errors.length === 0, errors };
    }

    // Si está abierto, debe tener horario de apertura y cierre
    if (!hours.open_time || !hours.close_time) {
      errors.push('Los días abiertos deben tener horario de apertura y cierre');
    }

    // Validar formato de hora (HH:MM o HH:MM:SS)
    const _timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;

    if (hours.open_time && !timeRegex.test(hours.open_time)) {
      errors.push('Formato de hora de apertura inválido (debe ser HH:MM)');
    }

    if (hours.close_time && !timeRegex.test(hours.close_time)) {
      errors.push('Formato de hora de cierre inválido (debe ser HH:MM)');
    }

    // Validar que la hora de cierre sea posterior a la de apertura
    if (hours.open_time && hours.close_time) {
      const _openTime = this.timeToMinutes(hours.open_time);
      const _closeTime = this.timeToMinutes(hours.close_time);

      if (closeTime <= openTime) {
        errors.push('La hora de cierre debe ser posterior a la de apertura');
      }
    }

    // Validar horarios de descanso si están definidos
    if (hours.break_start || hours.break_end) {
      // Si se define uno, ambos deben estar definidos
      if (!hours.break_start || !hours.break_end) {
        errors.push(
          'Si se define un descanso, debe especificar tanto la hora de inicio como la de fin'
        );
      } else {
        // Validar formato
        if (!timeRegex.test(hours.break_start)) {
          errors.push(
            'Formato de hora de inicio de descanso inválido (debe ser HH:MM)'
          );
        }
        if (!timeRegex.test(hours.break_end)) {
          errors.push(
            'Formato de hora de fin de descanso inválido (debe ser HH:MM)'
          );
        }

        // Validar que el descanso esté dentro del horario laboral
        if (
          hours.open_time &&
          hours.close_time &&
          timeRegex.test(hours.break_start) &&
          timeRegex.test(hours.break_end)
        ) {
          const _openTime = this.timeToMinutes(hours.open_time);
          const _closeTime = this.timeToMinutes(hours.close_time);
          const _breakStart = this.timeToMinutes(hours.break_start);
          const _breakEnd = this.timeToMinutes(hours.break_end);

          if (breakStart < openTime || breakStart >= closeTime) {
            errors.push(
              'El inicio del descanso debe estar dentro del horario laboral'
            );
          }
          if (breakEnd <= openTime || breakEnd > closeTime) {
            errors.push(
              'El fin del descanso debe estar dentro del horario laboral'
            );
          }
          if (breakEnd <= breakStart) {
            errors.push('El fin del descanso debe ser posterior al inicio');
          }
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Verifica si una barbería está abierta en un momento específico
   */
  async isOpen(barbershopId: string, dateTime: Date): Promise<boolean> {
    try {
      const _dayOfWeek = this.getDayOfWeekEnum(dateTime.getDay());
      const _timeStr = this.formatTime(dateTime);

      const _schedule = await this.getDaySchedule(barbershopId, dayOfWeek);

      if (!schedule || schedule.is_closed) {
        return false;
      }

      const _currentMinutes = this.timeToMinutes(timeStr);
      const _openMinutes = this.timeToMinutes(schedule.open_time!);
      const _closeMinutes = this.timeToMinutes(schedule.close_time!);

      // Verificar si está dentro del horario de apertura
      if (currentMinutes < openMinutes || currentMinutes >= closeMinutes) {
        return false;
      }

      // Note: Break times are now managed at the individual barber level

      return true;
    } catch (error) {
      console.error('Error checking if barbershop is open:', error);
      return false;
    }
  }

  /**
   * Normaliza formato de tiempo a HH:MM:SS para la base de datos
   */
  private normalizeTimeFormat(time: string | null): string | null {
    if (!time) return null;

    const _timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:[0-5][0-9])?$/;
    const _match = time.match(timeRegex);

    if (!match) return time; // Return as-is if doesn't match expected format

    const [, hours, minutes, seconds] = match;
    const _normalizedHours = hours.padStart(2, '0');
    const _normalizedMinutes = minutes.padStart(2, '0');
    const _normalizedSeconds = seconds ? seconds.substring(1) : '00';

    return `${normalizedHours}:${normalizedMinutes}:${normalizedSeconds}`;
  }

  /**
   * Convierte tiempo en formato HH:MM o HH:MM:SS a minutos
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Formatea una fecha a HH:MM
   */
  private formatTime(date: Date): string {
    const _hours = date.getHours().toString().padStart(2, '0');
    const _minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Convierte número de día JavaScript a enum DayOfWeek
   */
  private getDayOfWeekEnum(jsDay: number): DayOfWeek {
    // JavaScript: 0 = Sunday, 1 = Monday, etc.
    // Ajustar según cómo esté definido el enum en la base de datos
    const days: DayOfWeek[] = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    return days[jsDay];
  }

  /**
   * Obtiene los horarios de apertura para un rango de fechas
   */
  async getScheduleForDateRange(
    barbershopId: string,
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      date: Date;
      schedule: BarbershopHoursWithDefaults | null;
      isOpen: boolean;
    }>
  > {
    try {
      const _results = [];
      const _currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const _dayOfWeek = this.getDayOfWeekEnum(currentDate.getDay());
        const _schedule = await this.getDaySchedule(barbershopId, dayOfWeek);
        const _isOpen = await this.isOpen(barbershopId, currentDate);

        results.push({
          date: new Date(currentDate),
          schedule,
          isOpen,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return results;
    } catch (error) {
      console.error('Error getting schedule for date range:', error);
      throw error;
    }
  }

  /**
   * Obtiene el próximo horario disponible a partir de una fecha/hora
   */
  async getNextAvailableTime(
    barbershopId: string,
    fromDateTime: Date
  ): Promise<Date | null> {
    try {
      const _maxDaysToCheck = 30; // Buscar hasta 30 días en el futuro
      const _currentDateTime = new Date(fromDateTime);

      for (let i = 0; i < maxDaysToCheck; i++) {
        const _dayOfWeek = this.getDayOfWeekEnum(currentDateTime.getDay());
        const _schedule = await this.getDaySchedule(barbershopId, dayOfWeek);

        if (schedule && !schedule.is_closed) {
          const _currentTimeStr = this.formatTime(currentDateTime);
          const _currentMinutes = this.timeToMinutes(currentTimeStr);
          const _openMinutes = this.timeToMinutes(schedule.open_time!);
          const _closeMinutes = this.timeToMinutes(schedule.close_time!);

          // Si es el mismo día y ya pasó la hora de cierre, continuar con el siguiente día
          if (i === 0 && currentMinutes >= closeMinutes) {
            currentDateTime.setDate(currentDateTime.getDate() + 1);
            currentDateTime.setHours(0, 0, 0, 0);
            continue;
          }

          // Si es antes de la apertura, establecer la hora de apertura
          if (currentMinutes < openMinutes) {
            const [hours, minutes] = schedule.open_time!.split(':').map(Number);
            currentDateTime.setHours(hours, minutes, 0, 0);
          }

          // Note: Break times are now managed at the individual barber level

          return currentDateTime;
        }

        // Pasar al siguiente día
        currentDateTime.setDate(currentDateTime.getDate() + 1);
        currentDateTime.setHours(0, 0, 0, 0);
      }

      return null; // No se encontró disponibilidad en los próximos 30 días
    } catch (error) {
      console.error('Error getting next available time:', error);
      throw error;
    }
  }
}

export const _barbershopHoursService = new BarbershopHoursService();
