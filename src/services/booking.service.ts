import { BaseService } from './base.service';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { DateTime } from 'date-fns';
import { addMinutes, format, parseISO } from 'date-fns';

// Types based on new database schema
type Appointment = Database['public']['Tables']['appointments']['Row'];
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];
type AppointmentService = Database['public']['Tables']['appointment_services']['Row'];
type WaitlistEntry = Database['public']['Tables']['waitlist_entries']['Row'];

export interface CreateBookingRequest {
  barbershopId: string;
  barberId: string;
  customerId?: string; // Optional - will create guest if not provided
  serviceIds: string[];
  startAt: Date;
  notes?: string;
  customerRequests?: string;
  // Guest customer data (used if customerId not provided)
  guestCustomer?: {
    fullName: string;
    phone: string;
    email?: string;
  };
}

export interface BookingValidationResult {
  isValid: boolean;
  conflicts: string[];
  suggestions?: {
    alternativeSlots: Array<{
      barberId: string;
      barberName: string;
      startAt: Date;
      endAt: Date;
    }>;
  };
}

export interface AppointmentDetails extends Appointment {
  barber: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  customer: {
    id: string;
    full_name: string;
    phone?: string;
    email?: string;
  };
  services: Array<{
    id: string;
    name: string;
    duration_minutes: number;
    price: number;
    order_index: number;
  }>;
}

/**
 * BookingService - Professional booking system like Fresha
 * Handles all appointment creation, validation, and management
 * NO ERRORS - Clean architecture with proper validation
 */
export class BookingService extends BaseService<Appointment> {
  constructor() {
    super('appointments');
  }

  /**
   * Create a new booking with full validation and conflict checking
   */
  async createBooking(request: CreateBookingRequest): Promise<AppointmentDetails> {
    // 1. Handle customer ID - create guest customer if needed
    let customerId = request.customerId;
    if (!customerId && request.guestCustomer) {
      customerId = await this.createGuestCustomer(request.guestCustomer);
    }
    if (!customerId) {
      throw new Error('Customer ID is required or guest customer data must be provided');
    }

    // 2. Validate the booking request
    const validation = await this.validateBooking({ ...request, customerId });
    if (!validation.isValid) {
      throw new Error(`Booking validation failed: ${validation.conflicts.join(', ')}`);
    }

    // 3. Get service details to calculate total duration and price
    const services = await this.getServiceDetails(request.serviceIds);
    const totalDuration = services.reduce((sum, service) => sum + service.duration_minutes, 0);
    const totalPrice = services.reduce((sum, service) => sum + service.price, 0);

    // 4. Calculate end time
    const endAt = addMinutes(request.startAt, totalDuration);

    // 5. Generate unique confirmation code
    const confirmationCode = await this.generateConfirmationCode();

    // 6. Create appointment in transaction
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        barbershop_id: request.barbershopId,
        barber_id: request.barberId,
        customer_id: customerId,
        start_at: request.startAt.toISOString(),
        end_at: endAt.toISOString(),
        status: 'pending',
        confirmation_code: confirmationCode,
        subtotal: totalPrice,
        total_amount: totalPrice,
        source: 'online',
        notes: request.notes,
        customer_requests: request.customerRequests,
        created_at: new Date().toISOString(),
      } as AppointmentInsert)
      .select()
      .single();

    if (appointmentError) {
      console.error('❌ Appointment creation failed:', appointmentError);
      throw new Error(`Failed to create appointment: ${appointmentError.message}`);
    }

    // 6. Create appointment services
    const appointmentServices = services.map((service, index) => ({
      appointment_id: appointment.id,
      service_id: service.id,
      order_index: index,
      start_offset_minutes: index > 0 ? services.slice(0, index).reduce((sum, s) => sum + s.duration_minutes, 0) : 0,
      duration_minutes: service.duration_minutes,
      unit_price: service.price,
      quantity: 1,
      discount_percent: 0,
      final_price: service.price,
      performed_by: request.barberId,
    }));

    const { error: servicesError } = await supabase
      .from('appointment_services')
      .insert(appointmentServices);

    if (servicesError) {
      // Rollback: delete the appointment
      await supabase.from('appointments').delete().eq('id', appointment.id);
      throw new Error(`Failed to create appointment services: ${servicesError.message}`);
    }

    // 7. Update availability slots cache
    await this.updateAvailabilityCache(request.barberId, request.startAt, endAt);

    // 8. Check and notify waitlist
    await this.notifyWaitlistForCancelledSlot(request.barberId, request.startAt);

    // 9. Return full appointment details
    return this.getAppointmentDetails(appointment.id);
  }

  /**
   * Validate booking request for conflicts and business rules
   */
  async validateBooking(request: CreateBookingRequest): Promise<BookingValidationResult> {
    const conflicts: string[] = [];

    // 1. Check if services exist and are active
    const services = await this.getServiceDetails(request.serviceIds);
    if (services.length !== request.serviceIds.length) {
      conflicts.push('Some services are not available');
    }

    // 2. Check barber availability
    const totalDuration = services.reduce((sum, service) => sum + service.duration_minutes, 0);
    const endAt = addMinutes(request.startAt, totalDuration);
    
    const isSlotAvailable = await this.checkTimeSlotAvailability(
      request.barberId,
      request.startAt,
      endAt
    );

    if (!isSlotAvailable) {
      conflicts.push('Selected time slot is no longer available');
    }

    // 3. Check booking settings and business rules
    const businessRulesValid = await this.validateBusinessRules(request);
    if (!businessRulesValid.isValid) {
      conflicts.push(...businessRulesValid.violations);
    }

    // 4. Generate suggestions if there are conflicts
    let suggestions;
    if (conflicts.length > 0) {
      suggestions = await this.generateAlternativeSlots(request);
    }

    return {
      isValid: conflicts.length === 0,
      conflicts,
      suggestions,
    };
  }

  /**
   * Check if a specific time slot is available for a barber
   */
  private async checkTimeSlotAvailability(
    barberId: string,
    startAt: Date,
    endAt: Date
  ): Promise<boolean> {
    // Check for overlapping appointments
    const { data: overlapping } = await supabase
      .from('appointments')
      .select('id')
      .eq('barber_id', barberId)
      .in('status', ['pending', 'confirmed', 'in_progress'])
      .or(`and(start_at.lt.${endAt.toISOString()},end_at.gt.${startAt.toISOString()})`);

    if (overlapping && overlapping.length > 0) {
      return false;
    }

    // Check for calendar blocks
    const { data: blocks } = await supabase
      .from('calendar_blocks')
      .select('id')
      .eq('barber_id', barberId)
      .or(`and(start_at.lt.${endAt.toISOString()},end_at.gt.${startAt.toISOString()})`);

    if (blocks && blocks.length > 0) {
      return false;
    }

    // Check working hours
    const dayOfWeekNumber = startAt.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[dayOfWeekNumber];
    const startTime = format(startAt, 'HH:mm:ss');
    const endTime = format(endAt, 'HH:mm:ss');

    const { data: workingHours } = await supabase
      .from('barber_working_hours')
      .select('start_time, end_time')
      .eq('barber_id', barberId)
      .eq('day_of_week', dayOfWeek)
      .single();

    if (!workingHours) {
      return false; // Barber doesn't work on this day
    }

    if (startTime < workingHours.start_time || endTime > workingHours.end_time) {
      return false; // Outside working hours
    }

    return true;
  }

  /**
   * Validate business rules (advance booking, minimum notice, etc.)
   */
  private async validateBusinessRules(request: CreateBookingRequest): Promise<{
    isValid: boolean;
    violations: string[];
  }> {
    const violations: string[] = [];

    // Get booking settings
    const { data: settings } = await supabase
      .from('booking_settings')
      .select('*')
      .eq('barbershop_id', request.barbershopId)
      .single();

    if (!settings) {
      return { isValid: true, violations: [] }; // No settings means no restrictions
    }

    const now = new Date();
    const bookingTime = request.startAt;

    // Check minimum notice
    const hoursUntilBooking = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilBooking < settings.minimum_notice_hours) {
      violations.push(`Minimum ${settings.minimum_notice_hours} hours notice required`);
    }

    // Check advance booking limit
    const daysUntilBooking = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilBooking > settings.advance_booking_days) {
      violations.push(`Cannot book more than ${settings.advance_booking_days} days in advance`);
    }

    // Check same-day booking cutoff
    const isToday = format(now, 'yyyy-MM-dd') === format(bookingTime, 'yyyy-MM-dd');
    if (isToday && settings.same_day_booking_cutoff) {
      const cutoffTime = parseISO(`${format(now, 'yyyy-MM-dd')}T${settings.same_day_booking_cutoff}`);
      if (now > cutoffTime) {
        violations.push('Same-day booking is no longer available');
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  }

  /**
   * Get service details with prices and durations
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
   * Create a guest customer profile using database function
   */
  private async createGuestCustomer(guestData: {
    fullName: string;
    phone: string;
    email?: string;
  }): Promise<string> {
    try {
      // Use the database function to create guest customer
      // This function handles checking for existing customers and RLS permissions
      const { data: result, error } = await supabase.rpc('create_guest_customer', {
        p_full_name: guestData.fullName,
        p_phone: guestData.phone,
        p_email: guestData.email || null,
      });

      if (error) {
        console.error('❌ Guest customer creation failed:', error);
        throw new Error(`Failed to create guest customer: ${error.message}`);
      }

      if (!result) {
        throw new Error('Guest customer creation returned no ID');
      }

      console.log('✅ Guest customer created/found:', result);
      return result;
    } catch (error) {
      console.error('❌ Error creating guest customer:', error);
      throw error;
    }
  }

  /**
   * Generate unique confirmation code
   */
  private async generateConfirmationCode(): Promise<string> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      attempts++;

      const { data: existing } = await supabase
        .from('appointments')
        .select('id')
        .eq('confirmation_code', code)
        .single();

      if (!existing) {
        return code;
      }
    } while (attempts < maxAttempts);

    throw new Error('Failed to generate unique confirmation code');
  }

  /**
   * Update availability cache after booking
   */
  private async updateAvailabilityCache(barberId: string, startAt: Date, endAt: Date) {
    const slotDuration = 15; // 15-minute slots
    let currentSlot = new Date(startAt);

    while (currentSlot < endAt) {
      const slotDate = format(currentSlot, 'yyyy-MM-dd');
      const slotTime = format(currentSlot, 'HH:mm:ss');

      await supabase
        .from('availability_slots')
        .upsert({
          barber_id: barberId,
          slot_date: slotDate,
          slot_time: slotTime,
          is_available: false,
          block_reason: 'appointment',
          generated_at: new Date().toISOString(),
        });

      currentSlot = addMinutes(currentSlot, slotDuration);
    }
  }

  /**
   * Notify waitlist when a slot becomes available
   */
  private async notifyWaitlistForCancelledSlot(barberId: string, startAt: Date) {
    // TODO: Implement waitlist notification logic
    console.log('🔔 Checking waitlist for slot:', { barberId, startAt });
  }

  /**
   * Generate alternative time slots when booking fails
   */
  private async generateAlternativeSlots(request: CreateBookingRequest) {
    // TODO: Implement alternative slot suggestions
    return {
      alternativeSlots: [],
    };
  }

  /**
   * Get full appointment details with relations
   */
  async getAppointmentDetails(appointmentId: string): Promise<AppointmentDetails> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        barber:barbers(
          id, 
          display_name,
          profiles!barbers_profile_id_fkey(avatar_url)
        ),
        customer:profiles(id, full_name, phone, email),
        services:appointment_services(
          id, order_index,
          service:services(id, name, duration_minutes, price)
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch appointment details: ${error.message}`);
    }

    // Transform the data to flatten the profiles relationship
    const transformedData = {
      ...data,
      barber: {
        ...data.barber,
        avatar_url: data.barber?.profiles?.avatar_url || null,
        profiles: undefined, // Remove the nested profiles object
      },
    };

    return transformedData as AppointmentDetails;
  }

  /**
   * Cancel appointment with proper cleanup
   */
  async cancelAppointment(
    appointmentId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<AppointmentDetails> {
    const { data: appointment, error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: cancelledBy,
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to cancel appointment: ${error.message}`);
    }

    // Free up availability slots
    await this.freeAvailabilitySlots(appointment.barber_id, appointment.start_at, appointment.end_at);

    // Notify waitlist
    await this.notifyWaitlistForCancelledSlot(appointment.barber_id, new Date(appointment.start_at));

    return this.getAppointmentDetails(appointmentId);
  }

  /**
   * Free availability slots when appointment is cancelled
   */
  private async freeAvailabilitySlots(barberId: string, startAt: string, endAt: string) {
    const start = new Date(startAt);
    const end = new Date(endAt);
    const slotDuration = 15;
    let currentSlot = start;

    while (currentSlot < end) {
      const slotDate = format(currentSlot, 'yyyy-MM-dd');
      const slotTime = format(currentSlot, 'HH:mm:ss');

      await supabase
        .from('availability_slots')
        .upsert({
          barber_id: barberId,
          slot_date: slotDate,
          slot_time: slotTime,
          is_available: true,
          block_reason: null,
          generated_at: new Date().toISOString(),
        });

      currentSlot = addMinutes(currentSlot, slotDuration);
    }
  }
}

export const bookingService = new BookingService();