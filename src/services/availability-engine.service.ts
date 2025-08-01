import { supabase } from '@/lib/supabase';
import { addDays, addMinutes, format, parseISO, startOfDay, endOfDay } from 'date-fns';

export interface TimeSlot {
  startTime: string; // "09:00"
  endTime: string;   // "09:30"
  startAt: Date;     // Full datetime
  endAt: Date;       // Full datetime
  available: boolean;
  reason?: string;   // Why unavailable if not available
}

export interface BarberAvailability {
  barberId: string;
  barberName: string;
  barberAvatar?: string;
  slots: TimeSlot[];
}

export interface DayAvailability {
  date: string;      // "2025-08-01"
  dayName: string;   // "Friday"
  isToday: boolean;
  isWeekend: boolean;
  barbers: BarberAvailability[];
}

export interface AvailabilityRequest {
  barbershopId: string;
  serviceIds: string[];
  barberId?: string;    // Optional: specific barber
  startDate: Date;
  daysToCheck?: number; // Default: 7
}

export interface AvailabilityResponse {
  servicesTotalDuration: number;
  totalPrice: number;
  days: DayAvailability[];
  nextAvailableSlot?: {
    date: string;
    startTime: string;
    barberId: string;
    barberName: string;
  };
}

/**
 * AvailabilityEngine - High-performance availability calculation
 * Like Fresha's availability system - fast, accurate, no conflicts
 */
export class AvailabilityEngine {
  private readonly SLOT_DURATION_MINUTES = 15;
  private readonly BOOKING_SETTINGS_CACHE = new Map<string, any>();

  /**
   * Get available time slots for booking services
   * Main method used by booking flow
   */
  async getAvailability(request: AvailabilityRequest): Promise<AvailabilityResponse> {
    // 1. Get service details
    const services = await this.getServiceDetails(request.serviceIds);
    const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
    const totalPrice = services.reduce((sum, s) => sum + s.price, 0);

    // 2. Get booking settings for business rules
    const settings = await this.getBookingSettings(request.barbershopId);

    // 3. Get barbers (specific or all available)
    const barbers = request.barberId 
      ? [await this.getBarberDetails(request.barberId)]
      : await this.getAvailableBarbers(request.barbershopId);

    // 4. Generate availability for requested days
    const days: DayAvailability[] = [];
    const daysToCheck = request.daysToCheck || 7;

    for (let i = 0; i < daysToCheck; i++) {
      const currentDate = addDays(request.startDate, i);
      
      // Skip if beyond advance booking limit
      if (this.isDayBeyondBookingLimit(currentDate, settings)) {
        continue;
      }

      const dayAvailability = await this.getDayAvailability(
        currentDate,
        barbers,
        totalDuration,
        settings
      );

      // Only include days with available slots
      if (dayAvailability.barbers.some(b => b.slots.length > 0)) {
        days.push(dayAvailability);
      }
    }

    // 5. Find next available slot if no slots today
    const nextAvailable = days.length === 0 
      ? await this.findNextAvailableSlot(request, barbers, totalDuration)
      : undefined;

    return {
      servicesTotalDuration: totalDuration,
      totalPrice,
      days,
      nextAvailableSlot: nextAvailable,
    };
  }

  /**
   * Get availability for a specific day
   */
  private async getDayAvailability(
    date: Date,
    barbers: any[],
    serviceDuration: number,
    settings: any
  ): Promise<DayAvailability> {
    const dayName = format(date, 'EEEE');
    const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    const barberAvailabilities: BarberAvailability[] = [];

    for (const barber of barbers) {
      const slots = await this.getBarberDaySlots(barber, date, serviceDuration, settings);
      
      if (slots.length > 0) {
        barberAvailabilities.push({
          barberId: barber.id,
          barberName: barber.display_name,
          barberAvatar: barber.avatar_url,
          slots,
        });
      }
    }

    return {
      date: format(date, 'yyyy-MM-dd'),
      dayName,
      isToday,
      isWeekend,
      barbers: barberAvailabilities,
    };
  }

  /**
   * Get available slots for a specific barber on a specific day
   */
  private async getBarberDaySlots(
    barber: any,
    date: Date,
    serviceDuration: number,
    settings: any
  ): Promise<TimeSlot[]> {
    // 1. Get barber's working hours for this day
    const workingHours = await this.getBarberWorkingHours(barber.id, date);
    if (!workingHours) {
      return []; // Barber doesn't work this day
    }

    // 2. Generate all possible slots for the day
    const allSlots = this.generateDaySlots(date, workingHours);

    // 3. Get occupied periods (appointments, breaks, blocks)
    const occupiedPeriods = await this.getOccupiedPeriods(barber.id, date);

    // 4. Filter available slots
    const availableSlots = this.filterAvailableSlots(
      allSlots,
      occupiedPeriods,
      serviceDuration
    );

    // 5. Apply business rules (minimum notice, same-day cutoff, etc.)
    return this.applyBusinessRules(availableSlots, date, settings);
  }

  /**
   * Generate all possible time slots for a day based on working hours
   */
  private generateDaySlots(date: Date, workingHours: any): TimeSlot[] {
    const slots: TimeSlot[] = [];
    
    // Parse working hours
    const startTime = parseISO(`${format(date, 'yyyy-MM-dd')}T${workingHours.start_time}`);
    const endTime = parseISO(`${format(date, 'yyyy-MM-dd')}T${workingHours.end_time}`);
    
    let currentSlot = startTime;
    
    while (currentSlot < endTime) {
      const slotEnd = addMinutes(currentSlot, this.SLOT_DURATION_MINUTES);
      
      // Only add if there's enough time before closing
      if (slotEnd <= endTime) {
        slots.push({
          startTime: format(currentSlot, 'HH:mm'),
          endTime: format(slotEnd, 'HH:mm'),
          startAt: currentSlot,
          endAt: slotEnd,
          available: true,
        });
      }
      
      currentSlot = addMinutes(currentSlot, this.SLOT_DURATION_MINUTES);
    }
    
    return slots;
  }

  /**
   * Get all occupied periods (appointments, breaks, blocks)
   */
  private async getOccupiedPeriods(barberId: string, date: Date) {
    const dayStart = startOfDay(date).toISOString();
    const dayEnd = endOfDay(date).toISOString();

    // Get appointments
    const { data: appointments } = await supabase
      .from('appointments')
      .select('start_at, end_at, status')
      .eq('barber_id', barberId)
      .gte('start_at', dayStart)
      .lte('start_at', dayEnd)
      .in('status', ['pending', 'confirmed', 'in_progress']);

    // Get calendar blocks
    const { data: blocks } = await supabase
      .from('calendar_blocks')
      .select('start_at, end_at, block_type')
      .eq('barber_id', barberId)
      .gte('start_at', dayStart)
      .lte('end_at', dayEnd);

    const occupiedPeriods = [];

    // Add appointments
    if (appointments) {
      occupiedPeriods.push(...appointments.map(apt => ({
        startAt: new Date(apt.start_at),
        endAt: new Date(apt.end_at),
        reason: 'appointment',
      })));
    }

    // Add blocks
    if (blocks) {
      occupiedPeriods.push(...blocks.map(block => ({
        startAt: new Date(block.start_at),
        endAt: new Date(block.end_at),
        reason: block.block_type,
      })));
    }

    return occupiedPeriods;
  }

  /**
   * Filter slots that have enough consecutive time for the service
   */
  private filterAvailableSlots(
    allSlots: TimeSlot[],
    occupiedPeriods: any[],
    serviceDuration: number
  ): TimeSlot[] {
    // Mark occupied slots
    for (const slot of allSlots) {
      for (const occupied of occupiedPeriods) {
        if (this.periodsOverlap(slot.startAt, slot.endAt, occupied.startAt, occupied.endAt)) {
          slot.available = false;
          slot.reason = occupied.reason;
          break;
        }
      }
    }

    // Filter slots that have enough consecutive available time
    return allSlots.filter((slot, index) => {
      if (!slot.available) return false;

      // Check if we need multiple slots for longer services
      const slotsNeeded = Math.ceil(serviceDuration / this.SLOT_DURATION_MINUTES);
      
      for (let i = 0; i < slotsNeeded; i++) {
        const checkSlot = allSlots[index + i];
        if (!checkSlot || !checkSlot.available) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Apply business rules (minimum notice, same-day cutoff, etc.)
   */
  private applyBusinessRules(slots: TimeSlot[], date: Date, settings: any): TimeSlot[] {
    const now = new Date();
    
    return slots.filter(slot => {
      // Minimum notice rule
      const hoursUntilSlot = (slot.startAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilSlot < settings.minimum_notice_hours) {
        return false;
      }

      // Same-day booking cutoff
      const isToday = format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
      if (isToday && settings.same_day_booking_cutoff) {
        const cutoffTime = parseISO(`${format(now, 'yyyy-MM-dd')}T${settings.same_day_booking_cutoff}`);
        if (now > cutoffTime) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Check if two time periods overlap
   */
  private periodsOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 < end2 && end1 > start2;
  }

  /**
   * Get barber working hours for a specific day
   */
  private async getBarberWorkingHours(barberId: string, date: Date) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[date.getDay()];
    
    const { data: hours } = await supabase
      .from('barber_working_hours')
      .select('start_time, end_time, is_working')
      .eq('barber_id', barberId)
      .eq('day_of_week', dayOfWeek)
      .single();

    // Return null if barber doesn't work this day
    if (!hours || !hours.is_working) {
      return null;
    }

    return hours;
  }

  /**
   * Get service details
   */
  private async getServiceDetails(serviceIds: string[]) {
    const { data: services, error } = await supabase
      .from('services')
      .select('id, name, duration_minutes, price')
      .in('id', serviceIds)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to fetch services: ${error.message}`);
    }

    return services || [];
  }

  /**
   * Get booking settings with caching
   */
  private async getBookingSettings(barbershopId: string) {
    if (this.BOOKING_SETTINGS_CACHE.has(barbershopId)) {
      return this.BOOKING_SETTINGS_CACHE.get(barbershopId);
    }

    const { data: settings } = await supabase
      .from('booking_settings')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .single();

    const defaultSettings = {
      advance_booking_days: 60,
      same_day_booking_cutoff: '18:00:00',
      minimum_notice_hours: 2,
      slot_duration_minutes: 15,
    };

    const finalSettings = { ...defaultSettings, ...settings };
    this.BOOKING_SETTINGS_CACHE.set(barbershopId, finalSettings);
    
    return finalSettings;
  }

  /**
   * Get available barbers for barbershop
   */
  private async getAvailableBarbers(barbershopId: string) {
    const { data: barbers, error } = await supabase
      .from('barbers')
      .select(`
        id, 
        display_name,
        profiles!barbers_profile_id_fkey(avatar_url)
      `)
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to fetch barbers: ${error.message}`);
    }

    // Transform the data to flatten the profile relationship
    return (barbers || []).map(barber => ({
      id: barber.id,
      display_name: barber.display_name,
      avatar_url: barber.profiles?.avatar_url || null,
    }));
  }

  /**
   * Get specific barber details
   */
  private async getBarberDetails(barberId: string) {
    const { data: barber, error } = await supabase
      .from('barbers')
      .select(`
        id, 
        display_name,
        profiles!barbers_profile_id_fkey(avatar_url)
      `)
      .eq('id', barberId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch barber: ${error.message}`);
    }

    // Transform the data to flatten the profile relationship
    return {
      id: barber.id,
      display_name: barber.display_name,
      avatar_url: barber.profiles?.avatar_url || null,
    };
  }

  /**
   * Check if day is beyond booking limit
   */
  private isDayBeyondBookingLimit(date: Date, settings: any): boolean {
    const now = new Date();
    const daysUntilDate = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilDate > settings.advance_booking_days;
  }

  /**
   * Find next available slot when no slots are available in requested period
   */
  private async findNextAvailableSlot(
    request: AvailabilityRequest,
    barbers: any[],
    serviceDuration: number
  ) {
    // Look ahead up to 30 days
    for (let i = 1; i <= 30; i++) {
      const checkDate = addDays(request.startDate, i);
      
      for (const barber of barbers) {
        const workingHours = await this.getBarberWorkingHours(barber.id, checkDate);
        if (!workingHours) continue;

        const occupiedPeriods = await this.getOccupiedPeriods(barber.id, checkDate);
        const allSlots = this.generateDaySlots(checkDate, workingHours);
        const availableSlots = this.filterAvailableSlots(allSlots, occupiedPeriods, serviceDuration);

        if (availableSlots.length > 0) {
          return {
            date: format(checkDate, 'yyyy-MM-dd'),
            startTime: availableSlots[0].startTime,
            barberId: barber.id,
            barberName: barber.display_name,
          };
        }
      }
    }

    return undefined;
  }
}

export const availabilityEngine = new AvailabilityEngine();