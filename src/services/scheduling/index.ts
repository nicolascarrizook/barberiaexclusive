/**
 * Scheduling Services Module
 *
 * This module exports all scheduling-related services for the barbershop application.
 * Some services are temporary implementations that will be updated after database migrations.
 */

// Core scheduling services
export { barbershopHoursService } from '../barbershop-hours.service';
export { availabilityService } from '../availability.service';
export { barberScheduleService } from '../barber-schedule.service';

// Advanced scheduling services (will be fully implemented after migrations)
export { scheduleTemplatesService } from '../schedule-templates.service';
export { capacityManagementService } from '../capacity-management.service';

// Re-export types
export type {
  BarbershopHoursWithDefaults,
  WeekSchedule,
  TimeValidationResult,
} from '../barbershop-hours.service';

export type {
  TimeSlot,
  DayAvailability,
  AvailabilityOptions,
  BreakRequest,
  CapacityConfig,
  PeakHourConfig,
  CapacityStats,
  AvailabilityHeatmapData,
  OverviewStats,
} from '../availability.service';

export type {
  BarberScheduleBlock,
  DailySchedule,
  ScheduleConflict,
} from '../barber-schedule.service';

export type {
  ScheduleTemplateWithBlocks,
  WeeklySchedule,
} from '../schedule-templates.service';

export type {
  CapacityStats as CapacityStatistics,
  CapacityForecast,
  OverbookingAnalysis,
} from '../capacity-management.service';

/**
 * Migration Status:
 *
 * 1. barbershop_hours table - Pending (Migration 004)
 *    - Currently using working_hours as fallback
 *
 * 2. barber_breaks table - Pending (Migration 004)
 *    - Methods return empty data or temporary objects
 *
 * 3. schedule_templates tables - Pending (Migration 001)
 *    - Service methods log warnings and return mock data
 *
 * 4. capacity_config & peak_hours tables - Pending (Migration 004)
 *    - Using localStorage and mock data temporarily
 *
 * After migrations are applied:
 * - Remove temporary implementations
 * - Update services to use actual database tables
 * - Enable full functionality
 */
