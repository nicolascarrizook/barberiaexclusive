import { BaseService } from './base.service'
import { Database } from '@/types/database'
import { supabase } from '@/lib/supabase'

// Define types for schedule templates (will be in database after migration)
interface ScheduleTemplate {
  id: string;
  barber_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ScheduleTemplateBlock {
  id: string;
  template_id: string;
  day_of_week: Database['public']['Enums']['day_of_week'];
  start_time: string;
  end_time: string;
  block_type: 'available' | 'unavailable' | 'break';
  created_at: string;
}

interface ScheduleException {
  id: string;
  barber_id: string;
  exception_date: string;
  is_working_day: boolean;
  custom_start_time?: string | null;
  custom_end_time?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleTemplateWithBlocks extends ScheduleTemplate {
  blocks: ScheduleTemplateBlock[];
}

export interface WeeklySchedule {
  [key: string]: {
    blocks: Array<{
      start_time: string;
      end_time: string;
      block_type: 'available' | 'unavailable' | 'break';
    }>;
  };
}

/**
 * Service for managing schedule templates
 * Will be fully implemented after migration 001 is applied
 */
export class ScheduleTemplatesService {
  /**
   * Get all templates for a barber
   */
  async getBarberTemplates(barberId: string): Promise<ScheduleTemplate[]> {
    // TODO: Implement after migration
    console.warn('schedule_templates table not available yet');
    return [];
  }

  /**
   * Get active template with blocks
   */
  async getActiveTemplate(
    barberId: string
  ): Promise<ScheduleTemplateWithBlocks | null> {
    // TODO: Implement after migration
    console.warn('schedule_templates table not available yet');
    return null;
  }

  /**
   * Create a new template
   */
  async createTemplate(
    barberId: string,
    name: string,
    weeklySchedule: WeeklySchedule
  ): Promise<ScheduleTemplate> {
    // TODO: Implement after migration
    console.warn('schedule_templates table not available yet');

    // Return mock data for now
    return {
      id: `temp-${Date.now()}`,
      barber_id: barberId,
      name,
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Activate a template (deactivates others)
   */
  async activateTemplate(templateId: string): Promise<void> {
    // TODO: Implement after migration
    console.warn('schedule_templates table not available yet');
  }

  /**
   * Update template blocks
   */
  async updateTemplateBlocks(
    templateId: string,
    weeklySchedule: WeeklySchedule
  ): Promise<void> {
    // TODO: Implement after migration
    console.warn('schedule_templates table not available yet');
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    // TODO: Implement after migration
    console.warn('schedule_templates table not available yet');
  }

  /**
   * Create schedule exception
   */
  async createException(
    barberId: string,
    date: string,
    exception: {
      is_working_day: boolean;
      custom_start_time?: string;
      custom_end_time?: string;
      notes?: string;
    }
  ): Promise<ScheduleException> {
    // TODO: Implement after migration
    console.warn('schedule_exceptions table not available yet');

    return {
      id: `temp-${Date.now()}`,
      barber_id: barberId,
      exception_date: date,
      is_working_day: exception.is_working_day,
      custom_start_time: exception.custom_start_time,
      custom_end_time: exception.custom_end_time,
      notes: exception.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Get exceptions for a date range
   */
  async getExceptions(
    barberId: string,
    startDate: string,
    endDate: string
  ): Promise<ScheduleException[]> {
    // TODO: Implement after migration
    console.warn('schedule_exceptions table not available yet');
    return [];
  }

  /**
   * Delete an exception
   */
  async deleteException(exceptionId: string): Promise<void> {
    // TODO: Implement after migration
    console.warn('schedule_exceptions table not available yet');
  }

  /**
   * Generate schedule for a date range
   */
  async generateSchedule(
    barberId: string,
    startDate: string,
    endDate: string
  ): Promise<
    Array<{
      date: string;
      blocks: Array<{
        start_time: string;
        end_time: string;
        block_type: string;
        source: 'template' | 'exception';
      }>;
    }>
  > {
    // TODO: Implement after migration using generate_barber_schedule function
    console.warn('Schedule generation not available yet');
    return [];
  }

  /**
   * Copy template from another barber
   */
  async copyTemplate(
    sourceTemplateId: string,
    targetBarberId: string,
    newName: string
  ): Promise<ScheduleTemplate> {
    // TODO: Implement after migration
    console.warn('Template copying not available yet');

    return {
      id: `temp-${Date.now()}`,
      barber_id: targetBarberId,
      name: newName,
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Validate template blocks for conflicts
   */
  validateTemplateBlocks(blocks: ScheduleTemplateBlock[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Group blocks by day
    const blocksByDay = blocks.reduce(
      (acc, block) => {
        if (!acc[block.day_of_week]) acc[block.day_of_week] = [];
        acc[block.day_of_week].push(block);
        return acc;
      },
      {} as Record<string, ScheduleTemplateBlock[]>
    );

    // Check for overlaps within each day
    Object.entries(blocksByDay).forEach(([day, dayBlocks]) => {
      dayBlocks.sort((a, b) => a.start_time.localeCompare(b.start_time));

      for (let i = 0; i < dayBlocks.length - 1; i++) {
        const current = dayBlocks[i];
        const next = dayBlocks[i + 1];

        if (current.end_time > next.start_time) {
          errors.push(
            `Overlap detected on ${day}: ${current.start_time}-${current.end_time} conflicts with ${next.start_time}-${next.end_time}`
          );
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const scheduleTemplatesService = new ScheduleTemplatesService();
