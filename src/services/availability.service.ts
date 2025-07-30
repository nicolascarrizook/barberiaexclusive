// // // // // import { supabase } from '@/lib/supabase'
// // // // // import { barbershopHoursService } from './barbershop-hours.service'
// // // // // import { barberSchedulesService } from './barber-schedules.service'
// // // // // import { timeOffService } from './time-off.service'
// // // // // import { Database } from '@/types/database'

// Use database types for barber breaks
type BarberBreaks = Database['public']['Tables']['barber_breaks']['Row'];
type BarberBreaksInsert =
  Database['public']['Tables']['barber_breaks']['Insert'];
type BarberBreaksUpdate =
  Database['public']['Tables']['barber_breaks']['Update'];

type Appointment = Database['public']['Tables']['appointments']['Row'];

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  reason?: 'appointment' | 'break' | 'time_off' | 'closed';
}

export interface DayAvailability {
  date: string;
  is_available: boolean;
  slots: TimeSlot[];
  working_hours?: {
    start: string;
    end: string;
  };
  break_hours?: {
    start: string;
    end: string;
  };
}

export interface AvailabilityOptions {
  barber_id: string;
  barbershop_id: string;
  start_date: string;
  end_date: string;
  service_duration: number; // en minutos
  slot_interval?: number; // intervalo entre slots en minutos (default: 15)
}

export interface BreakRequest {
  barber_id: string;
  date: string;
  start_time: string;
  end_time: string;
  reason?: string;
}

export interface CapacityConfig {
  barbershop_id: string;
  time_slot: string; // formato HH:MM
  max_capacity: number;
  peak_hour_multiplier?: number;
  allow_overbooking: boolean;
  overbooking_limit?: number;
}

export interface PeakHourConfig {
  barbershop_id: string;
  day_of_week: Database['public']['Enums']['day_of_week'];
  start_time: string;
  end_time: string;
  multiplier: number;
}

export interface CapacityStats {
  total_capacity: number;
  current_bookings: number;
  available_slots: number;
  utilization_percentage: number;
  peak_hours: PeakHourConfig[];
  risk_level: 'low' | 'medium' | 'high';
}

export interface AvailabilityHeatmapData {
  date: string;
  hour: string;
  capacity: number;
  bookings: number;
  availability_level: 'high' | 'medium' | 'low' | 'full';
  barber_count: number;
}

export interface OverviewStats {
  total_appointments: number;
  available_slots: number;
  occupancy_rate: number;
  peak_hours: string[];
  busiest_barbers: Array<{
    barber_id: string;
    name: string;
    appointments: number;
    availability_rate: number;
  }>;
}

class AvailabilityService {
  // Cache for barbershop hours to avoid repeated database calls
  private barbershopHoursCache = new Map<
    string,
    { data: any; timestamp: number }
  >();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Cache helper for barbershop hours
   */
  private async getCachedBarbershopHours(
    barbershopId: string,
    dayOfWeek: Database['public']['Enums']['day_of_week']
  ) {
    const _cacheKey = `${barbershopId}_${dayOfWeek}`;
    const _cached = this.barbershopHoursCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const _data = await barbershopHoursService.getDaySchedule(
      barbershopId,
      dayOfWeek
    );
    this.barbershopHoursCache.set(cacheKey, { data, timestamp: Date.now() });

    return data;
  }

  /**
   * Clear cache for specific barbershop or all caches
   */
  clearCache(barbershopId?: string) {
    if (barbershopId) {
      for (const key of this.barbershopHoursCache.keys()) {
        if (key.startsWith(barbershopId)) {
          this.barbershopHoursCache.delete(key);
        }
      }
    } else {
      this.barbershopHoursCache.clear();
    }
  }
  /**
   * Obtiene la disponibilidad de un barbero para un rango de fechas
   */
  async getBarberAvailability(
    options: AvailabilityOptions
  ): Promise<DayAvailability[]> {
    const availability: DayAvailability[] = [];
    const _currentDate = new Date(options.start_date);
    const _endDate = new Date(options.end_date);

    while (currentDate <= endDate) {
      const _dayAvailability = await this.getDayAvailability({
        ...options,
        date: currentDate.toISOString().split('T')[0],
      });
      availability.push(dayAvailability);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return availability;
  }

  /**
   * Obtiene la disponibilidad de un barbero para un día específico
   */
  async getDayAvailability(options: {
    barber_id: string;
    barbershop_id: string;
    date: string;
    service_duration: number;
    slot_interval?: number;
  }): Promise<DayAvailability> {
    const {
      barber_id,
      barbershop_id,
      date,
      service_duration,
      slot_interval = 15,
    } = options;
    const _dateObj = new Date(date);
    const _dayOfWeek = dateObj.getDay();
    const _dayOfWeekEnum = this.getDayOfWeekEnum(dayOfWeek);

    // Obtener horario de la barbería (con cache)
    const _barbershopHours = await this.getCachedBarbershopHours(
      barbershop_id,
      dayOfWeekEnum
    );

    // Si la barbería está cerrada
    if (!barbershopHours || barbershopHours.is_closed) {
      return {
        date,
        is_available: false,
        slots: [],
      };
    }

    // Obtener horario específico del barbero
    const _barberSchedule = await barberSchedulesService.getDaySchedule(
      barber_id,
      dayOfWeek
    );

    // Si el barbero no está trabajando ese día
    if (!barberSchedule || !barberSchedule.is_working) {
      return {
        date,
        is_available: false,
        slots: [],
      };
    }

    // Verificar si el barbero tiene vacaciones
    const _timeOff = await timeOffService.getActiveTimeOff(barber_id, date);
    if (timeOff.length > 0) {
      return {
        date,
        is_available: false,
        slots: [
          {
            start: barberSchedule.start_time!,
            end: barberSchedule.end_time!,
            available: false,
            reason: 'time_off',
          },
        ],
      };
    }

    // Obtener citas existentes
    const _appointments = await this.getBarberAppointments(barber_id, date);

    // Obtener breaks del barbero (específicos para esa fecha)
    const _breaks = await this.getBarberBreaks(barber_id, date);

    // Generar slots disponibles usando el horario específico del barbero
    const _slots = this.generateTimeSlots({
      date,
      openTime: barberSchedule.start_time!,
      closeTime: barberSchedule.end_time!,
      breakStart: barberSchedule.break_start,
      breakEnd: barberSchedule.break_end,
      serviceDuration: service_duration,
      slotInterval: slot_interval,
      appointments,
      barberBreaks: breaks,
    });

    return {
      date,
      is_available: slots.some((slot) => slot.available),
      slots,
      working_hours: {
        start: barberSchedule.start_time!,
        end: barberSchedule.end_time!,
      },
      break_hours:
        barberSchedule.break_start && barberSchedule.break_end
          ? {
              start: barberSchedule.break_start,
              end: barberSchedule.break_end,
            }
          : undefined,
    };
  }

  /**
   * Verifica si un slot específico está disponible
   */
  async isSlotAvailable(
    barberId: string,
    barbershopId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<{ available: boolean; reason?: string }> {
    // Verificar horario de la barbería
    const _dateObj = new Date(`${date}T${startTime}`);
    const _isOpen = await barbershopHoursService.isOpen(barbershopId, dateObj);

    if (!isOpen) {
      return { available: false, reason: 'Barbería cerrada en ese horario' };
    }

    // Verificar si el barbero está trabajando ese día
    const _dayOfWeek = dateObj.getDay();
    const _barberSchedule = await barberSchedulesService.getDaySchedule(
      barberId,
      dayOfWeek
    );

    if (!barberSchedule || !barberSchedule.is_working) {
      return {
        available: false,
        reason: 'El barbero no está trabajando ese día',
      };
    }

    // Verificar si está dentro del horario de trabajo del barbero
    if (
      startTime < barberSchedule.start_time! ||
      endTime > barberSchedule.end_time!
    ) {
      return {
        available: false,
        reason: 'Fuera del horario de trabajo del barbero',
      };
    }

    // Verificar conflicto con el break del barbero en su horario
    if (barberSchedule.break_start && barberSchedule.break_end) {
      const _requestedStart = this.timeToMinutes(startTime);
      const _requestedEnd = this.timeToMinutes(endTime);
      const _breakStart = this.timeToMinutes(barberSchedule.break_start);
      const _breakEnd = this.timeToMinutes(barberSchedule.break_end);

      if (requestedStart < breakEnd && requestedEnd > breakStart) {
        return {
          available: false,
          reason: 'Conflicto con el horario de descanso',
        };
      }
    }

    // Verificar vacaciones
    const _timeOff = await timeOffService.getActiveTimeOff(barberId, date);
    if (timeOff.length > 0) {
      return { available: false, reason: 'El barbero está de vacaciones' };
    }

    // Verificar conflictos con otras citas
    const _hasConflict = await this.checkAppointmentConflict(
      barberId,
      date,
      startTime,
      endTime
    );
    if (hasConflict) {
      return { available: false, reason: 'Ya existe una cita en ese horario' };
    }

    // Verificar breaks específicos del barbero para esa fecha
    const _hasBreak = await this.checkBreakConflict(
      barberId,
      date,
      startTime,
      endTime
    );
    if (hasBreak) {
      return {
        available: false,
        reason: 'El barbero tiene un descanso específico en ese horario',
      };
    }

    return { available: true };
  }

  /**
   * Crea un break para un barbero
   */
  async createBarberBreak(breakRequest: BreakRequest): Promise<BarberBreaks> {
    // Validar que no haya citas en ese horario
    const _hasAppointment = await this.checkAppointmentConflict(
      breakRequest.barber_id,
      breakRequest.date,
      breakRequest.start_time,
      breakRequest.end_time
    );

    if (hasAppointment) {
      throw new Error(
        'No se puede crear un descanso: hay citas programadas en ese horario'
      );
    }

    // Validar que el break esté dentro del horario de trabajo del barbero
    const _dateObj = new Date(breakRequest.date);
    const _dayOfWeek = dateObj.getDay();
    const _barberSchedule = await barberSchedulesService.getDaySchedule(
      breakRequest.barber_id,
      dayOfWeek
    );

    if (!barberSchedule || !barberSchedule.is_working) {
      throw new Error(
        'No se puede crear un descanso: el barbero no está trabajando ese día'
      );
    }

    if (
      breakRequest.start_time < barberSchedule.start_time! ||
      breakRequest.end_time > barberSchedule.end_time!
    ) {
      throw new Error(
        'El descanso debe estar dentro del horario de trabajo del barbero'
      );
    }

    const { data, error } = await supabase
      .from('barber_breaks')
      .insert({
        barber_id: breakRequest.barber_id,
        date: breakRequest.date,
        start_time: breakRequest.start_time,
        end_time: breakRequest.end_time,
        reason: breakRequest.reason,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Elimina un break de un barbero
   */
  async deleteBarberBreak(breakId: string): Promise<void> {
    const { error } = await supabase
      .from('barber_breaks')
      .delete()
      .eq('id', breakId);

    if (error) throw new Error(error.message);
  }

  /**
   * Obtiene los breaks de un barbero para una fecha
   */
  async getBarberBreaks(
    barberId: string,
    date: string
  ): Promise<BarberBreaks[]> {
    const { data, error } = await supabase
      .from('barber_breaks')
      .select('*')
      .eq('barber_id', barberId)
      .eq('date', date)
      .order('start_time');

    if (error) throw new Error(error.message);
    return data || [];
  }

  /**
   * Obtiene las citas de un barbero para una fecha
   */
  private async getBarberAppointments(
    barberId: string,
    date: string
  ): Promise<Appointment[]> {
    const _startOfDay = `${date}T00:00:00`;
    const _endOfDay = `${date}T23:59:59`;

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('barber_id', barberId)
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay)
      .in('status', ['scheduled', 'confirmed', 'in_progress'])
      .order('start_time');

    if (error) throw new Error(error.message);

    return data || [];
  }

  /**
   * Obtiene las citas de múltiples barberos para una fecha (optimizado)
   */
  private async getMultipleBarberAppointments(
    barberIds: string[],
    date: string
  ): Promise<Map<string, Appointment[]>> {
    const _startOfDay = `${date}T00:00:00`;
    const _endOfDay = `${date}T23:59:59`;

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .in('barber_id', barberIds)
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay)
      .in('status', ['scheduled', 'confirmed', 'in_progress'])
      .order('barber_id', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw new Error(error.message);

    // Group appointments by barber_id
    const _appointmentsByBarber = new Map<string, Appointment[]>();

    // Initialize with empty arrays for all barbers
    barberIds.forEach((barberId) => {
      appointmentsByBarber.set(barberId, []);
    });

    // Group the appointments
    if (data) {
      data.forEach((appointment) => {
        const _existing = appointmentsByBarber.get(appointment.barber_id) || [];
        existing.push(appointment);
        appointmentsByBarber.set(appointment.barber_id, existing);
      });
    }

    return appointmentsByBarber;
  }

  /**
   * Verifica si hay conflicto con citas existentes
   */
  private async checkAppointmentConflict(
    barberId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    const _start = `${date}T${startTime}`;
    const _end = `${date}T${endTime}`;

    const { data, error } = await supabase
      .from('appointments')
      .select('id')
      .eq('barber_id', barberId)
      .in('status', ['scheduled', 'confirmed', 'in_progress'])
      .or(`start_time.lt.${end},end_time.gt.${start}`)
      .limit(1);

    if (error) throw new Error(error.message);

    return (data || []).length > 0;
  }

  /**
   * Verifica si hay conflicto con breaks del barbero
   */
  private async checkBreakConflict(
    barberId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('barber_breaks')
      .select('id')
      .eq('barber_id', barberId)
      .eq('date', date)
      .or(`start_time.lt.${endTime},end_time.gt.${startTime}`)
      .limit(1);

    if (error) throw new Error(error.message);
    return (data || []).length > 0;
  }

  /**
   * Genera los slots de tiempo disponibles
   */
  private generateTimeSlots(options: {
    date: string;
    openTime: string;
    closeTime: string;
    breakStart?: string | null;
    breakEnd?: string | null;
    serviceDuration: number;
    slotInterval: number;
    appointments: Appointment[];
    barberBreaks: BarberBreaks[];
  }): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const {
      date,
      openTime,
      closeTime,
      breakStart,
      breakEnd,
      serviceDuration,
      slotInterval,
      appointments,
      barberBreaks,
    } = options;

    // Convertir horarios a minutos para facilitar cálculos
    const _openMinutes = this.timeToMinutes(openTime);
    const _closeMinutes = this.timeToMinutes(closeTime);
    const _breakStartMinutes = breakStart
      ? this.timeToMinutes(breakStart)
      : null;
    const _breakEndMinutes = breakEnd ? this.timeToMinutes(breakEnd) : null;

    // Generar slots desde apertura hasta cierre
    let currentMinutes = openMinutes;

    while (currentMinutes + serviceDuration <= closeMinutes) {
      const _slotStart = this.minutesToTime(currentMinutes);
      const _slotEnd = this.minutesToTime(currentMinutes + serviceDuration);

      // Verificar si el slot está disponible
      let available = true;
      let reason: TimeSlot['reason'] = undefined;

      // Verificar horario de almuerzo de la barbería
      if (breakStartMinutes !== null && breakEndMinutes !== null) {
        if (
          currentMinutes < breakEndMinutes &&
          currentMinutes + serviceDuration > breakStartMinutes
        ) {
          available = false;
          reason = 'break';
        }
      }

      // Verificar citas existentes
      const _appointmentConflict = appointments.some((apt) => {
        const _aptStart =
          new Date(apt.start_time).getHours() * 60 +
          new Date(apt.start_time).getMinutes();
        const _aptEnd =
          new Date(apt.end_time).getHours() * 60 +
          new Date(apt.end_time).getMinutes();
        return (
          currentMinutes < aptEnd && currentMinutes + serviceDuration > aptStart
        );
      });

      if (appointmentConflict) {
        available = false;
        reason = 'appointment';
      }

      // Verificar breaks del barbero
      const _breakConflict = barberBreaks.some((brk) => {
        const _brkStart = this.timeToMinutes(brk.start_time);
        const _brkEnd = this.timeToMinutes(brk.end_time);
        return (
          currentMinutes < brkEnd && currentMinutes + serviceDuration > brkStart
        );
      });

      if (breakConflict) {
        available = false;
        reason = 'break';
      }

      slots.push({
        start: slotStart,
        end: slotEnd,
        available,
        reason,
      });

      currentMinutes += slotInterval;
    }

    return slots;
  }

  /**
   * Convierte tiempo en formato HH:MM a minutos
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Convierte minutos a formato HH:MM
   */
  private minutesToTime(minutes: number): string {
    const _hours = Math.floor(minutes / 60);
    const _mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Convierte número de día JavaScript a enum DayOfWeek
   */
  private getDayOfWeekEnum(
    jsDay: number
  ): Database['public']['Enums']['day_of_week'] {
    const days: Database['public']['Enums']['day_of_week'][] = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ] as Database['public']['Enums']['day_of_week'][];
    return days[jsDay];
  }

  /**
   * Obtiene el siguiente slot disponible
   */
  async getNextAvailableSlot(
    barberId: string,
    barbershopId: string,
    serviceDuration: number,
    fromDate?: string
  ): Promise<{ date: string; time: string } | null> {
    const _startDate = fromDate || new Date().toISOString().split('T')[0];
    const _endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // Buscar en los próximos 30 días

    const _availability = await this.getBarberAvailability({
      barber_id: barberId,
      barbershop_id: barbershopId,
      start_date: startDate,
      end_date: endDate.toISOString().split('T')[0],
      service_duration: serviceDuration,
    });

    for (const day of availability) {
      const _availableSlot = day.slots.find((slot) => slot.available);
      if (availableSlot) {
        return {
          date: day.date,
          time: availableSlot.start,
        };
      }
    }

    return null;
  }

  /**
   * Obtiene estadísticas de disponibilidad
   */
  async getAvailabilityStats(
    barberId: string,
    barbershopId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    total_slots: number;
    available_slots: number;
    booked_slots: number;
    availability_percentage: number;
  }> {
    const _availability = await this.getBarberAvailability({
      barber_id: barberId,
      barbershop_id: barbershopId,
      start_date: startDate,
      end_date: endDate,
      service_duration: 30, // Usar 30 minutos como referencia
    });

    let totalSlots = 0;
    let availableSlots = 0;

    availability.forEach((day) => {
      totalSlots += day.slots.length;
      availableSlots += day.slots.filter((slot) => slot.available).length;
    });

    const _bookedSlots = totalSlots - availableSlots;
    const _availabilityPercentage =
      totalSlots > 0 ? (availableSlots / totalSlots) * 100 : 0;

    return {
      total_slots: totalSlots,
      available_slots: availableSlots,
      booked_slots: bookedSlots,
      availability_percentage: Math.round(availabilityPercentage),
    };
  }

  /**
   * Configura la capacidad máxima para una franja horaria específica
   * TODO: Implementar cuando se cree la tabla de configuración de capacidad
   */
  async setCapacityConfig(config: CapacityConfig): Promise<void> {
    // Por ahora simulamos la configuración
    // En el futuro esto debería guardarse en una tabla `barbershop_capacity_config`
    console.warn('Capacity configuration not persisted to database yet');

    // Validar que la barbershop existe
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('id', config.barbershop_id)
      .single();

    if (!barbershop) {
      throw new Error('Barbershop not found');
    }

    // Por ahora almacenar temporalmente
    const _storageKey = `capacity_${config.barbershop_id}_${config.time_slot}`;
    localStorage.setItem(storageKey, JSON.stringify(config));
  }

  /**
   * Obtiene la configuración de capacidad para una barbería
   * TODO: Implementar cuando se cree la tabla de configuración de capacidad
   */
  async getCapacityConfig(barbershopId: string): Promise<CapacityConfig[]> {
    // Por ahora obtener de localStorage como fallback
    const configs: CapacityConfig[] = [];

    // Buscar todas las configuraciones en localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const _key = localStorage.key(i);
      if (key?.startsWith(`capacity_${barbershopId}_`)) {
        try {
          const _config = JSON.parse(localStorage.getItem(key) || '{}');
          configs.push(config);
        } catch (error) {
          console.warn(
            `Failed to parse capacity config for key ${key}:`,
            error
          );
        }
      }
    }

    return configs;
  }

  /**
   * Configura horarios pico con multiplicadores
   * TODO: Implementar cuando se cree la tabla de configuración de horarios pico
   */
  async setPeakHourConfig(config: PeakHourConfig): Promise<void> {
    // Validar que la barbershop existe
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('id', config.barbershop_id)
      .single();

    if (!barbershop) {
      throw new Error('Barbershop not found');
    }

    // Validar formato de horarios
    const _timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (
      !timeRegex.test(config.start_time) ||
      !timeRegex.test(config.end_time)
    ) {
      throw new Error('Invalid time format. Use HH:MM');
    }

    // Por ahora almacenar temporalmente
    const _storageKey = `peak_${config.barbershop_id}_${config.day_of_week}_${config.start_time}`;
    localStorage.setItem(storageKey, JSON.stringify(config));
  }

  /**
   * Obtiene configuración de horarios pico
   * TODO: Implementar cuando se cree la tabla de configuración de horarios pico
   */
  async getPeakHourConfig(barbershopId: string): Promise<PeakHourConfig[]> {
    const configs: PeakHourConfig[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const _key = localStorage.key(i);
      if (key?.startsWith(`peak_${barbershopId}_`)) {
        try {
          const _config = JSON.parse(localStorage.getItem(key) || '{}');
          configs.push(config);
        } catch (error) {
          console.warn(
            `Failed to parse peak hour config for key ${key}:`,
            error
          );
        }
      }
    }

    return configs;
  }

  /**
   * Calcula estadísticas de capacidad y riesgo de overbooking
   */
  async getCapacityStats(
    barbershopId: string,
    date: string
  ): Promise<CapacityStats> {
    const _capacityConfigs = await this.getCapacityConfig(barbershopId);
    const _peakHours = await this.getPeakHourConfig(barbershopId);

    // Obtener todos los barberos de la barbería
    const { data: barbers } = await supabase
      .from('barbers')
      .select('id')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true);

    if (!barbers) {
      throw new Error('No se pudieron obtener los barberos');
    }

    let totalCapacity = 0;
    let currentBookings = 0;

    // Calcular capacidad total y reservas actuales
    for (const barber of barbers) {
      const _appointments = await this.getBarberAppointments(barber.id, date);
      currentBookings += appointments.length;

      // Capacidad base (slots disponibles por barbero)
      const _dayAvailability = await this.getDayAvailability({
        barber_id: barber.id,
        barbershop_id: barbershopId,
        date,
        service_duration: 30, // Duración promedio
      });

      totalCapacity += dayAvailability.slots.length;
    }

    const _availableSlots = totalCapacity - currentBookings;
    const _utilizationPercentage =
      totalCapacity > 0 ? (currentBookings / totalCapacity) * 100 : 0;

    // Determinar nivel de riesgo
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (utilizationPercentage > 90) riskLevel = 'high';
    else if (utilizationPercentage > 70) riskLevel = 'medium';

    return {
      total_capacity: totalCapacity,
      current_bookings: currentBookings,
      available_slots: availableSlots,
      utilization_percentage: Math.round(utilizationPercentage),
      peak_hours: peakHours,
      risk_level: riskLevel,
    };
  }

  /**
   * Genera datos para el heatmap de disponibilidad
   */
  async getAvailabilityHeatmap(
    barbershopId: string,
    startDate: string,
    endDate: string
  ): Promise<AvailabilityHeatmapData[]> {
    const heatmapData: AvailabilityHeatmapData[] = [];
    const _currentDate = new Date(startDate);
    const _endDateObj = new Date(endDate);

    // Obtener barberos activos
    const { data: barbers } = await supabase
      .from('barbers')
      .select('id, profiles(first_name, last_name)')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true);

    if (!barbers) return heatmapData;

    while (currentDate <= endDateObj) {
      const _dateStr = currentDate.toISOString().split('T')[0];

      // Generar datos por hora (9 AM a 8 PM)
      for (let hour = 9; hour <= 20; hour++) {
        const _hourStr = `${hour.toString().padStart(2, '0')}:00`;
        let totalCapacity = 0;
        let totalBookings = 0;

        // Calcular para cada barbero
        for (const barber of barbers) {
          const _dayAvailability = await this.getDayAvailability({
            barber_id: barber.id,
            barbershop_id: barbershopId,
            date: dateStr,
            service_duration: 60, // 1 hora para el análisis
          });

          // Contar slots en esta hora
          const _hourSlots = dayAvailability.slots.filter((slot) => {
            const _slotHour = parseInt(slot.start.split(':')[0]);
            return slotHour === hour;
          });

          totalCapacity += hourSlots.length;
          totalBookings += hourSlots.filter(
            (slot) => !slot.available && slot.reason === 'appointment'
          ).length;
        }

        // Determinar nivel de disponibilidad
        let availabilityLevel: 'high' | 'medium' | 'low' | 'full' = 'high';
        const _utilizationRate =
          totalCapacity > 0 ? totalBookings / totalCapacity : 0;

        if (utilizationRate >= 1) availabilityLevel = 'full';
        else if (utilizationRate >= 0.8) availabilityLevel = 'low';
        else if (utilizationRate >= 0.5) availabilityLevel = 'medium';

        heatmapData.push({
          date: dateStr,
          hour: hourStr,
          capacity: totalCapacity,
          bookings: totalBookings,
          availability_level: availabilityLevel,
          barber_count: barbers.length,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return heatmapData;
  }

  /**
   * Obtiene estadísticas generales de la vista de disponibilidad
   */
  async getOverviewStats(
    barbershopId: string,
    startDate: string,
    endDate: string
  ): Promise<OverviewStats> {
    // Obtener todas las citas en el rango de fechas
    const { data: appointments } = await supabase
      .from('appointments')
      .select(
        `
        *,
        barbers(id, profiles(first_name, last_name))
      `
      )
      .eq('barbershop_id', barbershopId)
      .gte('start_time', `${startDate}T00:00:00`)
      .lte('start_time', `${endDate}T23:59:59`)
      .in('status', ['scheduled', 'confirmed', 'completed']);

    if (!appointments) {
      throw new Error('No se pudieron obtener las citas');
    }

    // Obtener barberos
    const { data: barbers } = await supabase
      .from('barbers')
      .select('id, profiles(first_name, last_name)')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true);

    if (!barbers) {
      throw new Error('No se pudieron obtener los barberos');
    }

    // Calcular estadísticas por barbero
    const _barberStats = barbers
      .map((barber) => {
        const _barberAppointments = appointments.filter(
          (apt) => apt.barber_id === barber.id
        );
        const _profile = barber.profiles as any;

        return {
          barber_id: barber.id,
          name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
          appointments: barberAppointments.length,
          availability_rate: 0, // Se calcularía con más detalle en implementación real
        };
      })
      .sort((a, b) => b.appointments - a.appointments);

    // Encontrar horas pico (análisis simplificado)
    const hourCounts: { [hour: string]: number } = {};
    appointments.forEach((apt) => {
      const _hour = new Date(apt.start_time).getHours();
      const _hourKey = `${hour}:00`;
      hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1;
    });

    const _peakHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => hour);

    // Calcular slots disponibles totales (estimación)
    const _totalDays = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const _estimatedTotalSlots = barbers.length * totalDays * 16; // ~16 slots por día por barbero
    const _occupancyRate =
      estimatedTotalSlots > 0
        ? (appointments.length / estimatedTotalSlots) * 100
        : 0;

    return {
      total_appointments: appointments.length,
      available_slots: Math.max(0, estimatedTotalSlots - appointments.length),
      occupancy_rate: Math.round(occupancyRate),
      peak_hours: peakHours,
      busiest_barbers: barberStats.slice(0, 5),
    };
  }

  /**
   * Simula el impacto de cambios de configuración
   */
  async simulateCapacityImpact(
    barbershopId: string,
    date: string,
    newConfig: CapacityConfig
  ): Promise<{
    current_capacity: number;
    new_capacity: number;
    impact_percentage: number;
    affected_appointments: number;
    recommendations: string[];
  }> {
    const _currentStats = await this.getCapacityStats(barbershopId, date);

    // Simular nueva capacidad (lógica simplificada)
    const _currentCapacity = currentStats.total_capacity;
    const _capacityChange = newConfig.max_capacity - currentCapacity / 10; // Estimación
    const _newCapacity = Math.max(0, currentCapacity + capacityChange);

    const _impactPercentage =
      currentCapacity > 0
        ? ((newCapacity - currentCapacity) / currentCapacity) * 100
        : 0;

    // Generar recomendaciones
    const recommendations: string[] = [];

    if (impactPercentage > 20) {
      recommendations.push(
        'Aumento significativo de capacidad - considere contratar más personal'
      );
    }
    if (impactPercentage < -20) {
      recommendations.push(
        'Reducción significativa - verifique que no afecte citas existentes'
      );
    }
    if (newConfig.allow_overbooking && !currentStats.peak_hours.length) {
      recommendations.push(
        'Configure horarios pico antes de permitir overbooking'
      );
    }

    return {
      current_capacity: currentCapacity,
      new_capacity: newCapacity,
      impact_percentage: Math.round(impactPercentage),
      affected_appointments: 0, // Se calcularía revisando citas existentes
      recommendations,
    };
  }

  /**
   * Obtiene los slots disponibles para múltiples barberos (optimizado)
   */
  async getMultiBarberAvailability(options: {
    barber_ids: string[];
    barbershop_id: string;
    date: string;
    service_duration: number;
    slot_interval?: number;
  }): Promise<Array<{ barber_id: string; availability: DayAvailability }>> {
    const {
      barber_ids,
      barbershop_id,
      date,
      service_duration,
      slot_interval = 15,
    } = options;

    // Batch fetch appointments for all barbers
    const _appointmentsByBarber = await this.getMultipleBarberAppointments(
      barber_ids,
      date
    );

    // Batch fetch barber schedules
    const _dateObj = new Date(date);
    const _dayOfWeek = dateObj.getDay();
    const _dayOfWeekEnum = this.getDayOfWeekEnum(dayOfWeek);

    // Get barbershop hours once (cached)
    const _barbershopHours = await this.getCachedBarbershopHours(
      barbershop_id,
      dayOfWeekEnum
    );

    const _results = await Promise.all(
      barber_ids.map(async (barber_id) => {
        // Use pre-fetched appointments
        const _appointments = appointmentsByBarber.get(barber_id) || [];

        // Get barber schedule
        const _barberSchedule = await barberSchedulesService.getDaySchedule(
          barber_id,
          dayOfWeek
        );

        if (
          !barbershopHours ||
          barbershopHours.is_closed ||
          !barberSchedule ||
          !barberSchedule.is_working
        ) {
          return {
            barber_id,
            availability: {
              date,
              is_available: false,
              slots: [],
            },
          };
        }

        // Check time off
        const _timeOff = await timeOffService.getActiveTimeOff(barber_id, date);
        if (timeOff.length > 0) {
          return {
            barber_id,
            availability: {
              date,
              is_available: false,
              slots: [
                {
                  start: barberSchedule.start_time!,
                  end: barberSchedule.end_time!,
                  available: false,
                  reason: 'time_off',
                },
              ],
            },
          };
        }

        // Get breaks
        const _breaks = await this.getBarberBreaks(barber_id, date);

        // Generate slots
        const _slots = this.generateTimeSlots({
          date,
          openTime: barberSchedule.start_time!,
          closeTime: barberSchedule.end_time!,
          breakStart: barberSchedule.break_start,
          breakEnd: barberSchedule.break_end,
          serviceDuration: service_duration,
          slotInterval: slot_interval,
          appointments,
          barberBreaks: breaks,
        });

        return {
          barber_id,
          availability: {
            date,
            is_available: slots.some((slot) => slot.available),
            slots,
            working_hours: {
              start: barberSchedule.start_time!,
              end: barberSchedule.end_time!,
            },
            break_hours:
              barberSchedule.break_start && barberSchedule.break_end
                ? {
                    start: barberSchedule.break_start,
                    end: barberSchedule.break_end,
                  }
                : undefined,
          },
        };
      })
    );

    return results;
  }

  /**
   * Encuentra el primer barbero disponible en un horario específico
   */
  async findAvailableBarber(
    barber_ids: string[],
    barbershop_id: string,
    date: string,
    start_time: string,
    end_time: string
  ): Promise<string | null> {
    for (const barber_id of barber_ids) {
      const { available } = await this.isSlotAvailable(
        barber_id,
        barbershop_id,
        date,
        start_time,
        end_time
      );

      if (available) {
        return barber_id;
      }
    }

    return null;
  }

  /**
   * Obtiene estadísticas de ocupación de barberos para un día
   */
  async getBarberOccupancyStats(
    barbershop_id: string,
    date: string
  ): Promise<
    Array<{
      barber_id: string;
      name: string;
      total_slots: number;
      booked_slots: number;
      occupancy_rate: number;
      working_hours: { start: string; end: string } | null;
    }>
  > {
    // Obtener barberos activos de la barbería
    const { data: barbers, error } = await supabase
      .from('barbers')
      .select(
        `
        id,
        profiles!inner(first_name, last_name)
      `
      )
      .eq('barbershop_id', barbershop_id)
      .eq('is_active', true);

    if (error) throw new Error(error.message);
    if (!barbers || barbers.length === 0) return [];

    const _stats = await Promise.all(
      barbers.map(async (barber) => {
        const _profile = barber.profiles as any;
        const _name =
          `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();

        // Obtener disponibilidad del barbero
        const _dayAvailability = await this.getDayAvailability({
          barber_id: barber.id,
          barbershop_id,
          date,
          service_duration: 30, // Usar 30 minutos como referencia
        });

        const _totalSlots = dayAvailability.slots.length;
        const _bookedSlots = dayAvailability.slots.filter(
          (slot) => !slot.available && slot.reason === 'appointment'
        ).length;

        const _occupancyRate =
          totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

        return {
          barber_id: barber.id,
          name,
          total_slots: totalSlots,
          booked_slots: bookedSlots,
          occupancy_rate: Math.round(occupancyRate),
          working_hours: dayAvailability.working_hours || null,
        };
      })
    );

    return stats.sort((a, b) => b.occupancy_rate - a.occupancy_rate);
  }

  /**
   * Obtiene los breaks de un barbero para un rango de fechas
   */
  async getBarberBreaksRange(
    barberId: string,
    startDate: string,
    endDate: string
  ): Promise<BarberBreaks[]> {
    const { data, error } = await supabase
      .from('barber_breaks')
      .select('*')
      .eq('barber_id', barberId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }

  /**
   * Actualiza un break existente
   */
  async updateBarberBreak(
    breakId: string,
    updates: BarberBreaksUpdate
  ): Promise<BarberBreaks> {
    // Si se actualizan los horarios, validar que no haya conflictos
    if (updates.start_time || updates.end_time || updates.date) {
      const { data: existingBreak } = await supabase
        .from('barber_breaks')
        .select('*')
        .eq('id', breakId)
        .single();

      if (existingBreak) {
        const _startTime = updates.start_time || existingBreak.start_time;
        const _endTime = updates.end_time || existingBreak.end_time;
        const _date = updates.date || existingBreak.date;

        const _hasAppointment = await this.checkAppointmentConflict(
          existingBreak.barber_id,
          date,
          startTime!,
          endTime!
        );

        if (hasAppointment) {
          throw new Error(
            'No se puede actualizar el descanso: hay citas programadas en ese horario'
          );
        }
      }
    }

    const { data, error } = await supabase
      .from('barber_breaks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', breakId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Verifica la disponibilidad integrada de un barbero (horario + citas + breaks + vacaciones)
   */
  async getIntegratedAvailability(
    barberId: string,
    barbershopId: string,
    date: string
  ): Promise<{
    is_working: boolean;
    has_time_off: boolean;
    working_hours: { start: string; end: string } | null;
    breaks: Array<{ start: string; end: string; reason?: string }>;
    appointments: Array<{ start: string; end: string; id: string }>;
  }> {
    const _dateObj = new Date(date);
    const _dayOfWeek = dateObj.getDay();

    // Obtener horario del barbero
    const _barberSchedule = await barberSchedulesService.getDaySchedule(
      barberId,
      dayOfWeek
    );

    if (!barberSchedule || !barberSchedule.is_working) {
      return {
        is_working: false,
        has_time_off: false,
        working_hours: null,
        breaks: [],
        appointments: [],
      };
    }

    // Verificar vacaciones
    const _timeOff = await timeOffService.getActiveTimeOff(barberId, date);

    if (timeOff.length > 0) {
      return {
        is_working: true,
        has_time_off: true,
        working_hours: {
          start: barberSchedule.start_time!,
          end: barberSchedule.end_time!,
        },
        breaks: [],
        appointments: [],
      };
    }

    // Obtener breaks específicos para esa fecha
    const _breaks = await this.getBarberBreaks(barberId, date);

    // Obtener citas existentes
    const _appointments = await this.getBarberAppointments(barberId, date);

    return {
      is_working: true,
      has_time_off: false,
      working_hours: {
        start: barberSchedule.start_time!,
        end: barberSchedule.end_time!,
      },
      breaks: [
        // Break regular del horario
        ...(barberSchedule.break_start && barberSchedule.break_end
          ? [
              {
                start: barberSchedule.break_start,
                end: barberSchedule.break_end,
                reason: 'Regular break',
              },
            ]
          : []),
        // Breaks específicos para esa fecha
        ...breaks.map((b) => ({
          start: b.start_time!,
          end: b.end_time!,
          reason: b.reason || 'Specific break',
        })),
      ],
      appointments: appointments.map((apt) => ({
        start: new Date(apt.start_time).toTimeString().substring(0, 8),
        end: new Date(apt.end_time).toTimeString().substring(0, 8),
        id: apt.id,
      })),
    };
  }
}

export const _availabilityService = new AvailabilityService();
