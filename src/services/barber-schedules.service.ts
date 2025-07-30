import { BaseService } from './base.service';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { barbershopHoursService } from './barbershop-hours.service';

// Type definitions from database - using working_hours until migration 007 is applied
type WorkingHoursTable = Database['public']['Tables']['working_hours'];
type WorkingHoursRow = WorkingHoursTable['Row'];
type WorkingHoursInsert = WorkingHoursTable['Insert'];
type WorkingHoursUpdate = WorkingHoursTable['Update'];

// Alias for future compatibility
type BarberWorkingHoursRow = WorkingHoursRow;

// Custom interfaces for better type safety
export interface BarberSchedule extends WorkingHoursRow {
  barber?: {
    id: string;
    display_name: string;
    barbershop_id: string;
  };
}

export interface DaySchedule {
  day_of_week: number;
  is_working: boolean;
  start_time: string | null;
  end_time: string | null;
  break_start: string | null;
  break_end: string | null;
}

export interface WeeklySchedule {
  barber_id: string;
  schedule: DaySchedule[];
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface ScheduleValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface AvailabilityCheckParams {
  barber_id: string;
  date: Date;
  start_time: string;
  end_time: string;
}

// Type for the component usage
export type WeeklyBarberSchedule = {
  [key in Database['public']['Enums']['day_of_week']]?: {
    is_working: boolean;
    start_time?: string;
    end_time?: string;
    break_start?: string;
    break_end?: string;
  };
};

export class BarberSchedulesService extends BaseService<BarberWorkingHoursRow> {
  private barbershopHoursService = barbershopHoursService;

  constructor() {
    // TODO: Change to 'barber_working_hours' once migration 007 is applied
    // For now, we'll use the existing 'working_hours' table
    super('working_hours' as any);
  }

  /**
   * Get weekly schedule for a specific barber
   */
  async getWeeklySchedule(barberId: string): Promise<BarberSchedule[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('barber_id', barberId)
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching barber weekly schedule:', error);
      throw error;
    }
  }

  /**
   * Get weekly schedule for a specific barber (component method)
   * This is an alias for getWeeklySchedule for backward compatibility
   */
  async getBarberWeeklySchedule(barberId: string): Promise<BarberSchedule[]> {
    return this.getWeeklySchedule(barberId);
  }

  /**
   * Get schedule for a specific day
   */
  async getDaySchedule(barberId: string, dayOfWeek: number): Promise<BarberSchedule | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('barber_id', barberId)
        .eq('day_of_week', this.getDayOfWeekEnum(dayOfWeek))
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching barber day schedule:', error);
      throw error;
    }
  }

  /**
   * Create or update schedule for a specific day
   */
  async upsertDaySchedule(
    barberId: string,
    daySchedule: DaySchedule
  ): Promise<BarberSchedule | null> {
    try {
      // Check if schedule exists for this day
      const existing = await this.getDaySchedule(barberId, daySchedule.day_of_week);

      // If barber is not working this day, delete the record if it exists
      if (!daySchedule.is_working) {
        if (existing) {
          const { error } = await supabase
            .from(this.tableName)
            .delete()
            .eq('id', existing.id);
          
          if (error) throw error;
        }
        return null; // No record for non-working days
      }

      // Validate against barbershop hours before saving (only for working days)
      const validation = await this.validateScheduleAgainstBarbershop(barberId, daySchedule);
      if (!validation.isValid) {
        throw new Error(`Schedule validation failed: ${validation.errors.join(', ')}`);
      }

      // Ensure we have valid times for working days
      if (!daySchedule.start_time || !daySchedule.end_time) {
        throw new Error('Start and end times are required for working days');
      }

      if (existing) {
        // Update existing schedule
        const { data, error } = await supabase
          .from(this.tableName)
          .update({
            is_working: true, // Always true if we're saving
            start_time: daySchedule.start_time,
            end_time: daySchedule.end_time,
            break_start: daySchedule.break_start,
            break_end: daySchedule.break_end,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new schedule
        const { data, error } = await supabase
          .from(this.tableName)
          .insert({
            barber_id: barberId,
            day_of_week: this.getDayOfWeekEnum(daySchedule.day_of_week),
            is_working: true, // Always true if we're creating
            start_time: daySchedule.start_time,
            end_time: daySchedule.end_time,
            break_start: daySchedule.break_start,
            break_end: daySchedule.break_end
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error upserting barber day schedule:', error);
      throw error;
    }
  }

  /**
   * Update entire weekly schedule
   */
  async updateWeeklySchedule(weeklySchedule: WeeklySchedule): Promise<BarberSchedule[]> {
    try {
      const results: BarberSchedule[] = [];

      // Validate all working days first
      for (const daySchedule of weeklySchedule.schedule) {
        if (daySchedule.is_working) {
          const validation = await this.validateScheduleAgainstBarbershop(
            weeklySchedule.barber_id,
            daySchedule
          );
          if (!validation.isValid) {
            throw new Error(
              `Validation failed for day ${daySchedule.day_of_week}: ${validation.errors.join(', ')}`
            );
          }
        }
      }

      // Update each day
      for (const daySchedule of weeklySchedule.schedule) {
        const updated = await this.upsertDaySchedule(weeklySchedule.barber_id, daySchedule);
        // Only add to results if it's a working day (non-null)
        if (updated) {
          results.push(updated);
        }
      }

      return results;
    } catch (error) {
      console.error('Error updating weekly schedule:', error);
      throw error;
    }
  }

  /**
   * Update barber weekly schedule (component method)
   * Converts the component format to the service format
   */
  async updateBarberWeeklySchedule(barberId: string, weekSchedule: WeeklyBarberSchedule): Promise<void> {
    try {
      const schedule: DaySchedule[] = [];
      const dayMap: Record<string, number> = {
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
        sunday: 0,
      };

      // Convert component format to service format
      for (const [day, dayData] of Object.entries(weekSchedule)) {
        if (dayData) {
          schedule.push({
            day_of_week: dayMap[day],
            is_working: dayData.is_working,
            start_time: dayData.is_working && dayData.start_time ? dayData.start_time : null,
            end_time: dayData.is_working && dayData.end_time ? dayData.end_time : null,
            break_start: dayData.is_working && dayData.break_start ? dayData.break_start : null,
            break_end: dayData.is_working && dayData.break_end ? dayData.break_end : null,
          });
        }
      }

      await this.updateWeeklySchedule({ barber_id: barberId, schedule });
    } catch (error) {
      console.error('Error updating barber weekly schedule:', error);
      throw error;
    }
  }

  /**
   * Copy barber schedule (component method for backward compatibility)
   */
  async copyBarberSchedule(sourceBarberId: string, targetBarberId: string): Promise<void> {
    await this.copyScheduleFromBarber(targetBarberId, sourceBarberId);
  }

  /**
   * Copy schedule from another barber
   */
  async copyScheduleFromBarber(
    targetBarberId: string,
    sourceBarberId: string
  ): Promise<BarberSchedule[]> {
    try {
      // Get source barber's schedule
      const sourceSchedule = await this.getWeeklySchedule(sourceBarberId);
      
      if (!sourceSchedule.length) {
        throw new Error('Source barber has no schedule defined');
      }

      // Validate that both barbers are in the same barbershop
      const { data: targetBarber, error: targetError } = await supabase
        .from('barbers')
        .select('barbershop_id')
        .eq('id', targetBarberId)
        .maybeSingle();

      if (targetError) {
        console.error('Error fetching target barber:', targetError);
        throw new Error('Error al buscar el barbero destino');
      }

      if (!targetBarber) {
        throw new Error('Barbero destino no encontrado');
      }

      const { data: sourceBarber, error: sourceError } = await supabase
        .from('barbers')
        .select('barbershop_id')
        .eq('id', sourceBarberId)
        .maybeSingle();

      if (sourceError) {
        console.error('Error fetching source barber:', sourceError);
        throw new Error('Error al buscar el barbero origen');
      }

      if (!sourceBarber) {
        throw new Error('Barbero origen no encontrado');
      }

      if (targetBarber.barbershop_id !== sourceBarber.barbershop_id) {
        throw new Error('Los barberos deben pertenecer a la misma barbería para copiar horarios');
      }

      // Copy schedule
      const weeklySchedule: WeeklySchedule = {
        barber_id: targetBarberId,
        schedule: sourceSchedule.map(day => ({
          day_of_week: day.day_of_week,
          is_working: day.is_working,
          start_time: day.start_time,
          end_time: day.end_time,
          break_start: day.break_start,
          break_end: day.break_end
        }))
      };

      return await this.updateWeeklySchedule(weeklySchedule);
    } catch (error) {
      console.error('Error copying schedule from barber:', error);
      throw error;
    }
  }

  /**
   * Copy barbershop hours as default schedule
   */
  async copyBarbershopHours(barberId: string): Promise<BarberSchedule[]> {
    try {
      console.log('copyBarbershopHours called with barberId:', barberId);
      
      // Validate barberId
      if (!barberId) {
        throw new Error('ID del barbero no proporcionado');
      }

      // Get barber's barbershop
      const { data: barber, error: barberError } = await supabase
        .from('barbers')
        .select('barbershop_id')
        .eq('id', barberId)
        .maybeSingle();

      if (barberError) {
        console.error('Error fetching barber in copyBarbershopHours:', barberError);
        throw new Error('Error al buscar el barbero. Por favor, intenta nuevamente.');
      }

      if (!barber) {
        console.error('Barber not found with ID:', barberId);
        throw new Error('No se encontró el barbero. Por favor, verifica que el barbero esté registrado correctamente.');
      }

      // Get barbershop hours
      const barbershopHours = await this.barbershopHoursService.getBarbershopSchedule(
        barber.barbershop_id
      );

      if (!barbershopHours || barbershopHours.length === 0) {
        throw new Error('La barbería no tiene horarios definidos. Por favor, configura primero los horarios de la barbería.');
      }

      // Convert barbershop hours to barber schedule
      const weeklySchedule: WeeklySchedule = {
        barber_id: barberId,
        schedule: barbershopHours.map(day => ({
          day_of_week: this.getDayOfWeekNumber(day.day_of_week),
          is_working: !day.is_closed,
          start_time: day.open_time,
          end_time: day.close_time,
          break_start: null,
          break_end: null
        }))
      };

      return await this.updateWeeklySchedule(weeklySchedule);
    } catch (error) {
      console.error('Error copying barbershop hours:', error);
      // Re-throw with a user-friendly message if it's not already our custom error
      if (error instanceof Error && !error.message.includes('barbero') && !error.message.includes('barbería')) {
        throw new Error('Error al copiar los horarios de la barbería. Por favor, intenta nuevamente.');
      }
      throw error;
    }
  }

  /**
   * Validate barber schedule against barbershop hours
   */
  async validateScheduleAgainstBarbershop(
    barberId: string,
    schedule: DaySchedule
  ): Promise<ScheduleValidationResult> {
    try {
      const errors: string[] = [];

      // If barber is not working, no need to validate times
      if (!schedule.is_working) {
        return { isValid: true, errors: [] };
      }

      // Get barber's barbershop
      const { data: barber, error: barberError } = await supabase
        .from('barbers')
        .select('barbershop_id')
        .eq('id', barberId)
        .maybeSingle();

      if (barberError) {
        console.error('Error fetching barber in validateScheduleAgainstBarbershop:', barberError);
        errors.push('Error al verificar el barbero');
        return { isValid: false, errors };
      }

      if (!barber) {
        errors.push('Barbero no encontrado');
        return { isValid: false, errors };
      }

      // Get barbershop hours for this day
      const barbershopDay = await this.barbershopHoursService.getDaySchedule(
        barber.barbershop_id,
        this.getDayOfWeekEnum(schedule.day_of_week)
      );

      if (!barbershopDay || barbershopDay.is_closed) {
        errors.push('Barbershop is closed on this day');
        return { isValid: false, errors };
      }

      // Validate start and end times
      // Handle empty strings as well as null/undefined
      const hasStartTime = schedule.start_time && schedule.start_time.trim() !== '';
      const hasEndTime = schedule.end_time && schedule.end_time.trim() !== '';
      
      if (!hasStartTime || !hasEndTime) {
        errors.push('Start and end times are required when working');
        return { isValid: false, errors };
      }

      // Check if barber hours are within barbershop hours
      if (schedule.start_time < barbershopDay.open_time!) {
        errors.push(
          `Start time (${schedule.start_time}) is before barbershop opens (${barbershopDay.open_time})`
        );
      }

      if (schedule.end_time > barbershopDay.close_time!) {
        errors.push(
          `End time (${schedule.end_time}) is after barbershop closes (${barbershopDay.close_time})`
        );
      }

      // Validate break times if provided
      if (schedule.break_start || schedule.break_end) {
        if (!schedule.break_start || !schedule.break_end) {
          errors.push('Both break start and end times must be provided');
        } else {
          if (schedule.break_start < schedule.start_time) {
            errors.push('Break cannot start before work hours');
          }
          if (schedule.break_end > schedule.end_time) {
            errors.push('Break cannot end after work hours');
          }
          if (schedule.break_start >= schedule.break_end) {
            errors.push('Break start must be before break end');
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('Error validating schedule:', error);
      return {
        isValid: false,
        errors: ['Failed to validate schedule']
      };
    }
  }

  /**
   * Check if barber is available at a specific time
   */
  async isBarberAvailable(params: AvailabilityCheckParams): Promise<boolean> {
    try {
      const { barber_id, date, start_time, end_time } = params;
      const dayOfWeek = date.getDay();

      // Get barber's schedule for this day
      const daySchedule = await this.getDaySchedule(barber_id, dayOfWeek);

      if (!daySchedule || !daySchedule.is_working) {
        return false;
      }

      // Check if requested time is within working hours
      if (start_time < daySchedule.start_time! || end_time > daySchedule.end_time!) {
        return false;
      }

      // Check if requested time overlaps with break
      if (daySchedule.break_start && daySchedule.break_end) {
        const requestedStart = this.timeToMinutes(start_time);
        const requestedEnd = this.timeToMinutes(end_time);
        const breakStart = this.timeToMinutes(daySchedule.break_start);
        const breakEnd = this.timeToMinutes(daySchedule.break_end);

        // Check for overlap
        if (requestedStart < breakEnd && requestedEnd > breakStart) {
          return false;
        }
      }

      // Check for existing appointments on this date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: appointments } = await supabase
        .from('appointments')
        .select('id')
        .eq('barber_id', barber_id)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .in('status', ['confirmed', 'in_progress'])
        .gte('end_time', start_time)
        .lte('start_time', end_time);

      return !appointments || appointments.length === 0;
    } catch (error) {
      console.error('Error checking barber availability:', error);
      return false;
    }
  }

  /**
   * Get available time slots for a barber on a specific date
   */
  async getAvailableSlots(
    barberId: string,
    date: Date,
    serviceDuration: number
  ): Promise<TimeSlot[]> {
    try {
      const dayOfWeek = date.getDay();
      const daySchedule = await this.getDaySchedule(barberId, dayOfWeek);

      if (!daySchedule || !daySchedule.is_working) {
        return [];
      }

      const slots: TimeSlot[] = [];
      const slotDuration = serviceDuration;
      const workStart = this.timeToMinutes(daySchedule.start_time!);
      const workEnd = this.timeToMinutes(daySchedule.end_time!);
      const breakStart = daySchedule.break_start ? this.timeToMinutes(daySchedule.break_start) : null;
      const breakEnd = daySchedule.break_end ? this.timeToMinutes(daySchedule.break_end) : null;

      // Get existing appointments for this date
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
        .in('status', ['confirmed', 'in_progress'])
        .order('start_time', { ascending: true });

      // Generate slots
      let currentTime = workStart;

      while (currentTime + slotDuration <= workEnd) {
        const slotEnd = currentTime + slotDuration;

        // Skip if overlaps with break
        if (breakStart !== null && breakEnd !== null) {
          if (currentTime < breakEnd && slotEnd > breakStart) {
            currentTime = breakEnd;
            continue;
          }
        }

        // Check if slot is available (not overlapping with appointments)
        const isAvailable = !appointments?.some(apt => {
          const aptStartTime = new Date(apt.start_time);
          const aptEndTime = new Date(apt.end_time);
          const aptStart = this.timeToMinutes(`${aptStartTime.getHours().toString().padStart(2, '0')}:${aptStartTime.getMinutes().toString().padStart(2, '0')}`);
          const aptEnd = this.timeToMinutes(`${aptEndTime.getHours().toString().padStart(2, '0')}:${aptEndTime.getMinutes().toString().padStart(2, '0')}`);
          return currentTime < aptEnd && slotEnd > aptStart;
        });

        if (isAvailable) {
          slots.push({
            start: this.minutesToTime(currentTime),
            end: this.minutesToTime(slotEnd)
          });
        }

        currentTime += 30; // Move to next 30-minute slot
      }

      return slots;
    } catch (error) {
      console.error('Error getting available slots:', error);
      return [];
    }
  }

  /**
   * Delete schedule for a specific day
   */
  async deleteDaySchedule(barberId: string, dayOfWeek: number): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('barber_id', barberId)
        .eq('day_of_week', this.getDayOfWeekEnum(dayOfWeek));

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting day schedule:', error);
      throw error;
    }
  }

  /**
   * Delete entire schedule for a barber
   */
  async deleteBarberSchedule(barberId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('barber_id', barberId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting barber schedule:', error);
      throw error;
    }
  }

  /**
   * Get barbers with no schedule defined
   */
  async getBarbersWithoutSchedule(barbershopId: string): Promise<string[]> {
    try {
      // Get all barbers in the barbershop
      const { data: barbers } = await supabase
        .from('barbers')
        .select('id')
        .eq('barbershop_id', barbershopId);

      if (!barbers) return [];

      // Get barbers with schedules
      const { data: scheduled } = await supabase
        .from(this.tableName)
        .select('barber_id')
        .in('barber_id', barbers.map(b => b.id));

      const scheduledIds = new Set(scheduled?.map(s => s.barber_id) || []);
      return barbers.filter(b => !scheduledIds.has(b.id)).map(b => b.id);
    } catch (error) {
      console.error('Error getting barbers without schedule:', error);
      return [];
    }
  }

  // Helper methods
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
  }

  private getDayOfWeekEnum(dayNumber: number): Database['public']['Enums']['day_of_week'] {
    const dayMap: Record<number, Database['public']['Enums']['day_of_week']> = {
      1: 'monday',
      2: 'tuesday', 
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday',
      0: 'sunday',
    };
    return dayMap[dayNumber];
  }

  private getDayOfWeekNumber(dayName: Database['public']['Enums']['day_of_week']): number {
    const dayMap: Record<Database['public']['Enums']['day_of_week'], number> = {
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      sunday: 0,
    };
    return dayMap[dayName];
  }
}

// Export a singleton instance
export const barberSchedulesService = new BarberSchedulesService();