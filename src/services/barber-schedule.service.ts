import { BaseService } from './base.service'
import { Database } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { HolidayCustomHours } from './holidays.service'

type WorkingHours = Database['public']['Tables']['working_hours']['Row'];
type SpecialDates = Database['public']['Tables']['special_dates']['Row'];
type DayOfWeek = Database['public']['Enums']['day_of_week'];

export interface BarberScheduleBlock {
  start_time: string;
  end_time: string;
  block_type: 'available' | 'break' | 'unavailable';
  source: 'working_hours' | 'special_date' | 'barber_break';
}

export interface DailySchedule {
  date: string;
  day_of_week: DayOfWeek;
  is_working: boolean;
  blocks: BarberScheduleBlock[];
  notes?: string;
}

export interface ScheduleConflict {
  has_conflict: boolean;
  conflict_type?: 'appointment' | 'break' | 'schedule';
  conflict_details?: string;
}

/**
 * Service for managing individual barber schedules
 * Bridges working_hours table with future schedule templates
 */
export class BarberScheduleService extends BaseService<WorkingHours> {
  constructor() {
    super('working_hours');
  }

  /**
   * Get barber's weekly schedule template
   */
  async getWeeklySchedule(
    barberId: string
  ): Promise<Record<DayOfWeek, WorkingHours | null>> {
    const { data, error } = await supabase
      .from('working_hours')
      .select('*')
      .eq('barber_id', barberId)
      .order('day_of_week');

    if (error) this.handleError(error);

    // Convert array to object keyed by day_of_week
    const schedule: Record<DayOfWeek, WorkingHours | null> = {
      monday: null,
      tuesday: null,
      wednesday: null,
      thursday: null,
      friday: null,
      saturday: null,
      sunday: null,
    };

    data?.forEach((wh) => {
      schedule[wh.day_of_week] = wh;
    });

    return schedule;
  }

  /**
   * Update barber's schedule for a specific day
   */
  async updateDaySchedule(
    barberId: string,
    dayOfWeek: DayOfWeek,
    schedule: {
      is_working: boolean;
      start_time?: string;
      end_time?: string;
      break_start?: string | null;
      break_end?: string | null;
    }
  ): Promise<WorkingHours> {
    // Check if schedule exists
    const { data: existing } = await supabase
      .from('working_hours')
      .select('id')
      .eq('barber_id', barberId)
      .eq('day_of_week', dayOfWeek)
      .single();

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('working_hours')
        .update({
          is_working: schedule.is_working,
          start_time: schedule.is_working ? schedule.start_time : null,
          end_time: schedule.is_working ? schedule.end_time : null,
          break_start: schedule.is_working ? schedule.break_start : null,
          break_end: schedule.is_working ? schedule.break_end : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) this.handleError(error);
      return data;
    } else {
      // Create new
      const { data, error } = await supabase
        .from('working_hours')
        .insert({
          barber_id: barberId,
          day_of_week: dayOfWeek,
          is_working: schedule.is_working,
          start_time: schedule.is_working ? schedule.start_time : null,
          end_time: schedule.is_working ? schedule.end_time : null,
          break_start: schedule.break_start,
          break_end: schedule.break_end,
        })
        .select()
        .single();

      if (error) this.handleError(error);
      return data;
    }
  }

  /**
   * Get effective schedule for a specific date
   */
  async getEffectiveSchedule(
    barberId: string,
    date: string
  ): Promise<DailySchedule> {
    const dateObj = new Date(date);
    const dayOfWeek = this.getDayOfWeekEnum(dateObj.getDay());

    // Check for special date override
    const { data: specialDate } = await supabase
      .from('special_dates')
      .select('*')
      .eq('barber_id', barberId)
      .eq('date', date)
      .single();

    if (specialDate) {
      if (specialDate.is_holiday) {
        return {
          date,
          day_of_week: dayOfWeek,
          is_working: false,
          blocks: [
            {
              start_time: '00:00',
              end_time: '23:59',
              block_type: 'unavailable',
              source: 'special_date',
            },
          ],
          notes: specialDate.reason || 'Holiday',
        };
      }

      // Handle custom hours
      if (specialDate.custom_hours) {
        const customHours = specialDate.custom_hours as HolidayCustomHours;
        const blocks: BarberScheduleBlock[] = [];

        if (customHours.start && customHours.end) {
          blocks.push({
            start_time: customHours.start,
            end_time: customHours.end,
            block_type: 'available',
            source: 'special_date',
          });
        }

        // Add breaks if defined
        if (customHours.breaks && Array.isArray(customHours.breaks)) {
          customHours.breaks.forEach((breakPeriod) => {
            blocks.push({
              start_time: breakPeriod.start,
              end_time: breakPeriod.end,
              block_type: 'break',
              source: 'special_date',
            });
          });
        }

        return {
          date,
          day_of_week: dayOfWeek,
          is_working: true,
          blocks,
          notes: specialDate.reason,
        };
      }
    }

    // Get regular working hours
    const { data: workingHours } = await supabase
      .from('working_hours')
      .select('*')
      .eq('barber_id', barberId)
      .eq('day_of_week', dayOfWeek)
      .single();

    if (!workingHours || !workingHours.is_working) {
      return {
        date,
        day_of_week: dayOfWeek,
        is_working: false,
        blocks: [
          {
            start_time: '00:00',
            end_time: '23:59',
            block_type: 'unavailable',
            source: 'working_hours',
          },
        ],
      };
    }

    // Build blocks from working hours
    const blocks: BarberScheduleBlock[] = [];

    // Add work block before break
    if (workingHours.break_start && workingHours.start_time) {
      blocks.push({
        start_time: workingHours.start_time,
        end_time: workingHours.break_start,
        block_type: 'available',
        source: 'working_hours',
      });
    }

    // Add break block
    if (workingHours.break_start && workingHours.break_end) {
      blocks.push({
        start_time: workingHours.break_start,
        end_time: workingHours.break_end,
        block_type: 'break',
        source: 'working_hours',
      });
    }

    // Add work block after break or full day
    if (workingHours.start_time && workingHours.end_time) {
      const startTime = workingHours.break_end || workingHours.start_time;
      blocks.push({
        start_time: startTime,
        end_time: workingHours.end_time,
        block_type: 'available',
        source: 'working_hours',
      });
    }

    // TODO: Add barber_breaks when table is available

    return {
      date,
      day_of_week: dayOfWeek,
      is_working: true,
      blocks,
    };
  }

  /**
   * Check for schedule conflicts
   */
  async checkScheduleConflict(
    barberId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<ScheduleConflict> {
    // Check appointments
    const startDateTime = `${date}T${startTime}`;
    const endDateTime = `${date}T${endTime}`;

    const { data: appointments, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, start_time, end_time')
      .eq('barber_id', barberId)
      .gte('start_time', `${date}T00:00:00`)
      .lte('start_time', `${date}T23:59:59`)
      .in('status', ['pending', 'confirmed', 'in_progress']);

    if (appointmentError) this.handleError(appointmentError);

    // Check for conflicts
    const hasAppointmentConflict = appointments?.some((apt) => {
      const aptStart = new Date(apt.start_time);
      const aptEnd = new Date(apt.end_time);
      const checkStart = new Date(startDateTime);
      const checkEnd = new Date(endDateTime);

      return checkStart < aptEnd && checkEnd > aptStart;
    });

    if (hasAppointmentConflict) {
      return {
        has_conflict: true,
        conflict_type: 'appointment',
        conflict_details: `Conflicts with existing appointment(s)`,
      };
    }

    // Check if within working hours
    const schedule = await this.getEffectiveSchedule(barberId, date);

    if (!schedule.is_working) {
      return {
        has_conflict: true,
        conflict_type: 'schedule',
        conflict_details: 'Barber is not working on this date',
      };
    }

    // Check if time slot is within available blocks
    const isWithinAvailableTime = schedule.blocks.some((block) => {
      if (block.block_type !== 'available') return false;
      return startTime >= block.start_time && endTime <= block.end_time;
    });

    if (!isWithinAvailableTime) {
      return {
        has_conflict: true,
        conflict_type: 'schedule',
        conflict_details:
          'Time slot is outside of working hours or during a break',
      };
    }

    return { has_conflict: false };
  }

  /**
   * Create a special date exception
   */
  async createSpecialDate(
    barberId: string,
    date: string,
    config: {
      is_holiday: boolean;
      custom_hours?: {
        start: string;
        end: string;
        breaks?: Array<{ start: string; end: string }>;
      };
      reason?: string;
    }
  ): Promise<SpecialDates> {
    const { data, error } = await supabase
      .from('special_dates')
      .insert({
        barber_id: barberId,
        date,
        is_holiday: config.is_holiday,
        custom_hours: config.custom_hours || null,
        reason: config.reason,
      })
      .select()
      .single();

    if (error) this.handleError(error);
    return data;
  }

  /**
   * Get special dates for a date range
   */
  async getSpecialDates(
    barberId: string,
    startDate: string,
    endDate: string
  ): Promise<SpecialDates[]> {
    const { data, error } = await supabase
      .from('special_dates')
      .select('*')
      .eq('barber_id', barberId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    if (error) this.handleError(error);
    return data || [];
  }

  /**
   * Copy schedule from one barber to another
   */
  async copySchedule(
    sourceBarberId: string,
    targetBarberId: string
  ): Promise<void> {
    const sourceSchedule = await this.getWeeklySchedule(sourceBarberId);

    for (const [day, schedule] of Object.entries(sourceSchedule)) {
      if (schedule) {
        await this.updateDaySchedule(targetBarberId, day as DayOfWeek, {
          is_working: schedule.is_working,
          start_time: schedule.start_time || undefined,
          end_time: schedule.end_time || undefined,
          break_start: schedule.break_start,
          break_end: schedule.break_end,
        });
      }
    }
  }

  /**
   * Get available time slots for a date
   */
  async getAvailableSlots(
    barberId: string,
    date: string,
    serviceDuration: number,
    slotInterval: number = 15
  ): Promise<Array<{ start: string; end: string }>> {
    const schedule = await this.getEffectiveSchedule(barberId, date);
    const slots: Array<{ start: string; end: string }> = [];

    if (!schedule.is_working) return slots;

    for (const block of schedule.blocks) {
      if (block.block_type !== 'available') continue;

      let currentTime = this.timeToMinutes(block.start_time);
      const endTime = this.timeToMinutes(block.end_time);

      while (currentTime + serviceDuration <= endTime) {
        const slotStart = this.minutesToTime(currentTime);
        const slotEnd = this.minutesToTime(currentTime + serviceDuration);

        // Check for conflicts
        const conflict = await this.checkScheduleConflict(
          barberId,
          date,
          slotStart,
          slotEnd
        );

        if (!conflict.has_conflict) {
          slots.push({ start: slotStart, end: slotEnd });
        }

        currentTime += slotInterval;
      }
    }

    return slots;
  }

  /**
   * Convert time string to minutes
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Convert minutes to time string
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Convert JS day number to DayOfWeek enum
   */
  private getDayOfWeekEnum(jsDay: number): DayOfWeek {
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
}

export const barberScheduleService = new BarberScheduleService();
