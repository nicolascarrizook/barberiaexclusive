import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AvailabilityEngine } from '../availability-engine.service';
import { supabase } from '@/lib/supabase';
import { addDays, format } from 'date-fns';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('AvailabilityEngine', () => {
  let availabilityEngine: AvailabilityEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    availabilityEngine = new AvailabilityEngine();
  });

  describe('getAvailability', () => {
    const mockRequest = {
      barbershopId: 'barbershop-1',
      serviceIds: ['service-1'],
      startDate: new Date('2025-08-01T00:00:00Z'),
      daysToCheck: 3,
    };

    const mockServices = [
      { id: 'service-1', name: 'Corte', duration_minutes: 30, price: 1500 },
    ];

    const mockBarbers = [
      { id: 'barber-1', display_name: 'Juan', avatar_url: 'avatar1.jpg' },
    ];

    const mockWorkingHours = {
      start_time: '09:00:00',
      end_time: '17:00:00',
    };

    const mockBookingSettings = {
      advance_booking_days: 60,
      same_day_booking_cutoff: '18:00:00',
      minimum_notice_hours: 2,
      slot_duration_minutes: 15,
    };

    beforeEach(() => {
      // Mock services fetch
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'services') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({
                  data: mockServices,
                  error: null,
                })),
              })),
            })),
          } as any;
        }

        if (table === 'barbers') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({
                  data: mockBarbers,
                  error: null,
                })),
              })),
            })),
          } as any;
        }

        if (table === 'booking_settings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: mockBookingSettings,
                  error: null,
                })),
              })),
            })),
          } as any;
        }

        if (table === 'barber_working_hours') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({
                    data: mockWorkingHours,
                    error: null,
                  })),
                })),
              })),
            })),
          } as any;
        }

        if (table === 'appointments') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                  lte: vi.fn(() => ({
                    in: vi.fn(() => Promise.resolve({
                      data: [], // No appointments
                      error: null,
                    })),
                  })),
                })),
              })),
            })),
          } as any;
        }

        if (table === 'calendar_blocks') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                  lte: vi.fn(() => Promise.resolve({
                    data: [], // No blocks
                    error: null,
                  })),
                })),
              })),
            })),
          } as any;
        }

        return {} as any;
      });
    });

    it('returns availability for requested days', async () => {
      const result = await availabilityEngine.getAvailability(mockRequest);

      expect(result).toEqual({
        servicesTotalDuration: 30,
        totalPrice: 1500,
        days: expect.arrayContaining([
          expect.objectContaining({
            date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
            dayName: expect.any(String),
            isToday: expect.any(Boolean),
            isWeekend: expect.any(Boolean),
            barbers: expect.arrayContaining([
              expect.objectContaining({
                barberId: 'barber-1',
                barberName: 'Juan',
                barberAvatar: 'avatar1.jpg',
                slots: expect.any(Array),
              }),
            ]),
          }),
        ]),
        nextAvailableSlot: undefined,
      });
    });

    it('calculates total duration and price correctly', async () => {
      const multiServiceRequest = {
        ...mockRequest,
        serviceIds: ['service-1', 'service-2'],
      };

      const multiServices = [
        ...mockServices,
        { id: 'service-2', name: 'Barba', duration_minutes: 20, price: 1000 },
      ];

      // Mock multi-service fetch
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'services') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({
                  data: multiServices,
                  error: null,
                })),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      const result = await availabilityEngine.getAvailability(multiServiceRequest);

      expect(result.servicesTotalDuration).toBe(50); // 30 + 20
      expect(result.totalPrice).toBe(2500); // 1500 + 1000
    });

    it('filters out unavailable days', async () => {
      // Mock no working hours for barber (unavailable day)
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'barber_working_hours') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({
                    data: null, // No working hours
                    error: null,
                  })),
                })),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      const result = await availabilityEngine.getAvailability(mockRequest);

      expect(result.days).toEqual([]);
    });

    it('finds next available slot when no immediate availability', async () => {
      // Mock no working hours for first few days
      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'barber_working_hours') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => {
                    callCount++;
                    // Return working hours only after 3 calls (simulating 3 days unavailable)
                    return Promise.resolve({
                      data: callCount > 3 ? mockWorkingHours : null,
                      error: null,
                    });
                  }),
                })),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      const result = await availabilityEngine.getAvailability(mockRequest);

      expect(result.nextAvailableSlot).toEqual({
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        startTime: '09:00',
        barberId: 'barber-1',
        barberName: 'Juan',
      });
    });

    it('handles service fetch error', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'services') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({
                  data: null,
                  error: { message: 'Services not found' },
                })),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      await expect(availabilityEngine.getAvailability(mockRequest))
        .rejects
        .toThrow('Failed to fetch services: Services not found');
    });

    it('handles barber fetch error', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'barbers') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({
                  data: null,
                  error: { message: 'Barbers not found' },
                })),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      await expect(availabilityEngine.getAvailability(mockRequest))
        .rejects
        .toThrow('Failed to fetch barbers: Barbers not found');
    });
  });

  describe('slot generation and filtering', () => {
    it('generates slots correctly based on working hours', () => {
      const date = new Date('2025-08-01T00:00:00Z');
      const workingHours = {
        start_time: '09:00:00',
        end_time: '12:00:00', // 3 hours
      };

      const slots = (availabilityEngine as any).generateDaySlots(date, workingHours);

      // Should generate 12 slots (3 hours * 4 slots per hour)
      expect(slots).toHaveLength(12);
      
      // First slot should start at 09:00
      expect(slots[0]).toEqual({
        startTime: '09:00',
        endTime: '09:15',
        startAt: expect.any(Date),
        endAt: expect.any(Date),
        available: true,
      });

      // Last slot should start at 11:45
      expect(slots[11]).toEqual({
        startTime: '11:45',
        endTime: '12:00',
        startAt: expect.any(Date),
        endAt: expect.any(Date),
        available: true,
      });
    });

    it('filters out occupied slots', () => {
      const allSlots = [
        {
          startTime: '09:00',
          endTime: '09:15',
          startAt: new Date('2025-08-01T09:00:00Z'),
          endAt: new Date('2025-08-01T09:15:00Z'),
          available: true,
        },
        {
          startTime: '09:15',
          endTime: '09:30',
          startAt: new Date('2025-08-01T09:15:00Z'),
          endAt: new Date('2025-08-01T09:30:00Z'),
          available: true,
        },
      ];

      const occupiedPeriods = [
        {
          startAt: new Date('2025-08-01T09:10:00Z'),
          endAt: new Date('2025-08-01T09:20:00Z'),
          reason: 'appointment',
        },
      ];

      const availableSlots = (availabilityEngine as any).filterAvailableSlots(
        allSlots,
        occupiedPeriods,
        30 // 30 minute service
      );

      // Should filter out overlapping slots
      expect(availableSlots).toHaveLength(0); // Both slots overlap with appointment
    });

    it('applies business rules correctly', () => {
      const now = new Date('2025-08-01T08:00:00Z');
      const date = new Date('2025-08-01T00:00:00Z');
      
      // Mock current time
      vi.spyOn(global, 'Date').mockImplementation((...args) => {
        if (args.length === 0) {
          return now as any;
        }
        return new (Date as any)(...args);
      });

      const slots = [
        {
          startTime: '08:30',
          endTime: '09:00',
          startAt: new Date('2025-08-01T08:30:00Z'), // 30 minutes from now
          endAt: new Date('2025-08-01T09:00:00Z'),
          available: true,
        },
        {
          startTime: '10:00',
          endTime: '10:30',
          startAt: new Date('2025-08-01T10:00:00Z'), // 2 hours from now
          endAt: new Date('2025-08-01T10:30:00Z'),
          available: true,
        },
      ];

      const settings = {
        minimum_notice_hours: 1, // 1 hour minimum notice
        same_day_booking_cutoff: '20:00:00',
      };

      const filteredSlots = (availabilityEngine as any).applyBusinessRules(
        slots,
        date,
        settings
      );

      // Should filter out the first slot (not enough notice)
      expect(filteredSlots).toHaveLength(1);
      expect(filteredSlots[0].startTime).toBe('10:00');

      vi.restoreAllMocks();
    });
  });

  describe('periods overlap detection', () => {
    it('detects overlapping periods correctly', () => {
      const start1 = new Date('2025-08-01T09:00:00Z');
      const end1 = new Date('2025-08-01T10:00:00Z');
      const start2 = new Date('2025-08-01T09:30:00Z');
      const end2 = new Date('2025-08-01T10:30:00Z');

      const overlaps = (availabilityEngine as any).periodsOverlap(start1, end1, start2, end2);

      expect(overlaps).toBe(true);
    });

    it('detects non-overlapping periods correctly', () => {
      const start1 = new Date('2025-08-01T09:00:00Z');
      const end1 = new Date('2025-08-01T10:00:00Z');
      const start2 = new Date('2025-08-01T10:00:00Z');
      const end2 = new Date('2025-08-01T11:00:00Z');

      const overlaps = (availabilityEngine as any).periodsOverlap(start1, end1, start2, end2);

      expect(overlaps).toBe(false);
    });

    it('handles edge case where periods touch', () => {
      const start1 = new Date('2025-08-01T09:00:00Z');
      const end1 = new Date('2025-08-01T10:00:00Z');
      const start2 = new Date('2025-08-01T10:00:00Z');
      const end2 = new Date('2025-08-01T11:00:00Z');

      const overlaps = (availabilityEngine as any).periodsOverlap(start1, end1, start2, end2);

      expect(overlaps).toBe(false); // Touching but not overlapping
    });
  });

  describe('caching', () => {
    it('caches booking settings', async () => {
      const barbershopId = 'barbershop-1';
      
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'booking_settings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: { advance_booking_days: 30 },
                  error: null,
                })),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      // Call twice
      await (availabilityEngine as any).getBookingSettings(barbershopId);
      await (availabilityEngine as any).getBookingSettings(barbershopId);

      // Should only call database once
      const selectMock = vi.mocked(supabase.from('booking_settings').select);
      expect(selectMock).toHaveBeenCalledTimes(1);
    });
  });
});