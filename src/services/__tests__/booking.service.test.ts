import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bookingService } from '../booking.service';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('BookingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBooking', () => {
    const mockBookingRequest = {
      barbershopId: 'barbershop-1',
      barberId: 'barber-1',
      customerId: 'customer-1',
      serviceIds: ['service-1', 'service-2'],
      startAt: new Date('2025-08-01T10:00:00Z'),
      notes: 'Special requests',
      customerRequests: 'Please use new scissors',
    };

    it('creates booking successfully with valid data', async () => {
      const mockValidationResponse = {
        data: { isValid: true, conflicts: [] },
        error: null,
      };

      const mockBookingResponse = {
        data: {
          id: 'booking-123',
          confirmation_code: 'ABC123',
          start_at: '2025-08-01T10:00:00Z',
          end_at: '2025-08-01T11:00:00Z',
          status: 'pending',
        },
        error: null,
      };

      // Mock validation
      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockValidationResponse);
      
      // Mock booking creation
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(mockBookingResponse)),
          })),
        })),
      } as any);

      const result = await bookingService.createBooking(mockBookingRequest);

      expect(result).toEqual(mockBookingResponse.data);
      
      // Verify validation was called
      expect(supabase.rpc).toHaveBeenCalledWith('validate_booking_request', {
        p_barbershop_id: mockBookingRequest.barbershopId,
        p_barber_id: mockBookingRequest.barberId,
        p_service_ids: mockBookingRequest.serviceIds,
        p_start_at: mockBookingRequest.startAt.toISOString(),
      });
    });

    it('throws error when validation fails', async () => {
      const mockValidationResponse = {
        data: { 
          isValid: false, 
          conflicts: ['Barber not available', 'Time slot occupied'] 
        },
        error: null,
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockValidationResponse);

      await expect(bookingService.createBooking(mockBookingRequest))
        .rejects
        .toThrow('Booking validation failed: Barber not available, Time slot occupied');
      
      // Should not attempt to create booking
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('throws error when validation RPC fails', async () => {
      const mockValidationResponse = {
        data: null,
        error: { message: 'RPC execution failed' },
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockValidationResponse);

      await expect(bookingService.createBooking(mockBookingRequest))
        .rejects
        .toThrow('Booking validation error: RPC execution failed');
    });

    it('throws error when booking creation fails', async () => {
      const mockValidationResponse = {
        data: { isValid: true, conflicts: [] },
        error: null,
      };

      const mockBookingResponse = {
        data: null,
        error: { message: 'Insert failed' },
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockValidationResponse);
      
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(mockBookingResponse)),
          })),
        })),
      } as any);

      await expect(bookingService.createBooking(mockBookingRequest))
        .rejects
        .toThrow('Failed to create booking: Insert failed');
    });

    it('generates confirmation code automatically', async () => {
      const mockValidationResponse = {
        data: { isValid: true, conflicts: [] },
        error: null,
      };

      const mockInsertCall = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'booking-123', confirmation_code: 'ABC123' },
            error: null,
          })),
        })),
      }));

      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockValidationResponse);
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsertCall,
      } as any);

      await bookingService.createBooking(mockBookingRequest);

      // Verify insert was called with generated confirmation code
      expect(mockInsertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          confirmation_code: expect.stringMatching(/^[A-Z0-9]{6}$/),
        })
      );
    });

    it('calculates end time based on service durations', async () => {
      const mockValidationResponse = {
        data: { 
          isValid: true, 
          conflicts: [],
          totalDuration: 60, // 1 hour total
        },
        error: null,
      };

      const mockInsertCall = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'booking-123' },
            error: null,
          })),
        })),
      }));

      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockValidationResponse);
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsertCall,
      } as any);

      await bookingService.createBooking(mockBookingRequest);

      // Verify end time is calculated correctly
      const expectedEndTime = new Date('2025-08-01T11:00:00Z'); // 1 hour after start

      expect(mockInsertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          end_at: expectedEndTime.toISOString(),
        })
      );
    });
  });

  describe('validateBooking', () => {
    const mockValidationRequest = {
      barbershopId: 'barbershop-1',
      barberId: 'barber-1',
      serviceIds: ['service-1'],
      startAt: new Date('2025-08-01T10:00:00Z'),
    };

    it('returns validation result successfully', async () => {
      const mockResponse = {
        data: { isValid: true, conflicts: [], totalDuration: 30 },
        error: null,
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResponse);

      const result = await bookingService.validateBooking(mockValidationRequest);

      expect(result).toEqual({
        isValid: true,
        conflicts: [],
        totalDuration: 30,
      });

      expect(supabase.rpc).toHaveBeenCalledWith('validate_booking_request', {
        p_barbershop_id: mockValidationRequest.barbershopId,
        p_barber_id: mockValidationRequest.barberId,
        p_service_ids: mockValidationRequest.serviceIds,
        p_start_at: mockValidationRequest.startAt.toISOString(),
      });
    });

    it('throws error when RPC fails', async () => {
      const mockResponse = {
        data: null,
        error: { message: 'Database connection failed' },
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResponse);

      await expect(bookingService.validateBooking(mockValidationRequest))
        .rejects
        .toThrow('Booking validation error: Database connection failed');
    });
  });

  describe('checkTimeSlotAvailability', () => {
    const mockAvailabilityRequest = {
      barberId: 'barber-1',
      startAt: new Date('2025-08-01T10:00:00Z'),
      endAt: new Date('2025-08-01T10:30:00Z'),
    };

    it('returns availability status successfully', async () => {
      const mockResponse = {
        data: { available: true, reason: null },
        error: null,
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResponse);

      const result = await bookingService.checkTimeSlotAvailability(mockAvailabilityRequest);

      expect(result).toEqual({
        available: true,
        reason: null,
      });

      expect(supabase.rpc).toHaveBeenCalledWith('check_time_slot_availability', {
        p_barber_id: mockAvailabilityRequest.barberId,
        p_start_at: mockAvailabilityRequest.startAt.toISOString(),
        p_end_at: mockAvailabilityRequest.endAt.toISOString(),
      });
    });

    it('returns unavailability with reason', async () => {
      const mockResponse = {
        data: { available: false, reason: 'Barber has existing appointment' },
        error: null,
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResponse);

      const result = await bookingService.checkTimeSlotAvailability(mockAvailabilityRequest);

      expect(result).toEqual({
        available: false,
        reason: 'Barber has existing appointment',
      });
    });

    it('throws error when RPC fails', async () => {
      const mockResponse = {
        data: null,
        error: { message: 'Invalid parameters' },
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce(mockResponse);

      await expect(bookingService.checkTimeSlotAvailability(mockAvailabilityRequest))
        .rejects
        .toThrow('Availability check error: Invalid parameters');
    });
  });

  describe('generateConfirmationCode', () => {
    it('generates 6-character alphanumeric code', () => {
      const code = (bookingService as any).generateConfirmationCode();
      
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
      expect(code.length).toBe(6);
    });

    it('generates unique codes', () => {
      const codes = new Set();
      
      // Generate 100 codes to test uniqueness
      for (let i = 0; i < 100; i++) {
        const code = (bookingService as any).generateConfirmationCode();
        codes.add(code);
      }
      
      // Should have 100 unique codes
      expect(codes.size).toBe(100);
    });
  });
});