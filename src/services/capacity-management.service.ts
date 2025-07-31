import { BaseService } from './base.service'
import { Database } from '@/types/database'
import { supabase } from '@/lib/supabase'

// Define types for capacity management (will be in database after migration)
interface CapacityConfig {
  id: string;
  barbershop_id: string;
  time_slot: string;
  day_of_week?: Database['public']['Enums']['day_of_week'] | null;
  max_capacity: number;
  current_capacity: number;
  peak_hour_multiplier: number;
  allow_overbooking: boolean;
  overbooking_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PeakHours {
  id: string;
  barbershop_id: string;
  day_of_week: Database['public']['Enums']['day_of_week'];
  start_time: string;
  end_time: string;
  multiplier: number;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CapacityStats {
  total_capacity: number;
  current_bookings: number;
  available_slots: number;
  utilization_percentage: number;
  peak_hours: PeakHours[];
  risk_level: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface CapacityForecast {
  date: string;
  predicted_demand: number;
  recommended_capacity: number;
  confidence_level: number;
}

export interface OverbookingAnalysis {
  current_risk: 'low' | 'medium' | 'high';
  overbooking_rate: number;
  cancellation_rate: number;
  recommended_limit: number;
  potential_revenue_impact: number;
}

/**
 * Service for managing capacity and overbooking
 * Will be fully implemented after migration 004 is applied
 */
export class CapacityManagementService {
  /**
   * Get capacity configuration for a barbershop
   */
  async getCapacityConfig(
    barbershopId: string,
    dayOfWeek?: Database['public']['Enums']['day_of_week']
  ): Promise<CapacityConfig[]> {
    // TODO: Implement after migration
    console.warn('capacity_config table not available yet');

    // Return mock data for development
    const mockConfig: CapacityConfig = {
      id: 'mock-1',
      barbershop_id: barbershopId,
      time_slot: '10:00',
      day_of_week: dayOfWeek || null,
      max_capacity: 4,
      current_capacity: 0,
      peak_hour_multiplier: 1.0,
      allow_overbooking: false,
      overbooking_limit: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return [mockConfig];
  }

  /**
   * Update capacity configuration
   */
  async updateCapacityConfig(
    configId: string,
    updates: Partial<CapacityConfig>
  ): Promise<CapacityConfig> {
    // TODO: Implement after migration
    console.warn('capacity_config table not available yet');

    // Return mock updated data
    return {
      id: configId,
      barbershop_id: 'mock-barbershop',
      time_slot: '10:00',
      day_of_week: null,
      max_capacity: updates.max_capacity || 4,
      current_capacity: 0,
      peak_hour_multiplier: updates.peak_hour_multiplier || 1.0,
      allow_overbooking: updates.allow_overbooking || false,
      overbooking_limit: updates.overbooking_limit || 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Create capacity configuration
   */
  async createCapacityConfig(
    barbershopId: string,
    config: {
      time_slot: string;
      day_of_week?: Database['public']['Enums']['day_of_week'];
      max_capacity: number;
      peak_hour_multiplier?: number;
      allow_overbooking?: boolean;
      overbooking_limit?: number;
    }
  ): Promise<CapacityConfig> {
    // TODO: Implement after migration
    console.warn('capacity_config table not available yet');

    return {
      id: `temp-${Date.now()}`,
      barbershop_id: barbershopId,
      time_slot: config.time_slot,
      day_of_week: config.day_of_week || null,
      max_capacity: config.max_capacity,
      current_capacity: 0,
      peak_hour_multiplier: config.peak_hour_multiplier || 1.0,
      allow_overbooking: config.allow_overbooking || false,
      overbooking_limit: config.overbooking_limit || 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Get peak hours configuration
   */
  async getPeakHours(barbershopId: string): Promise<PeakHours[]> {
    // TODO: Implement after migration
    console.warn('peak_hours table not available yet');
    return [];
  }

  /**
   * Create or update peak hours
   */
  async setPeakHours(
    barbershopId: string,
    peakHour: {
      day_of_week: Database['public']['Enums']['day_of_week'];
      start_time: string;
      end_time: string;
      multiplier: number;
      description?: string;
    }
  ): Promise<PeakHours> {
    // TODO: Implement after migration
    console.warn('peak_hours table not available yet');

    return {
      id: `temp-${Date.now()}`,
      barbershop_id: barbershopId,
      day_of_week: peakHour.day_of_week,
      start_time: peakHour.start_time,
      end_time: peakHour.end_time,
      multiplier: peakHour.multiplier,
      description: peakHour.description,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Check capacity availability
   */
  async checkCapacityAvailable(
    barbershopId: string,
    date: string,
    time: string
  ): Promise<{
    available: boolean;
    current_capacity: number;
    max_capacity: number;
    with_overbooking: number;
  }> {
    // TODO: Implement using check_capacity_available function after migration
    console.warn('Capacity check not fully implemented yet');

    // For now, count active barbers as base capacity
    const { data: barbers, error } = await supabase
      .from('barbers')
      .select('id')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true);

    const baseCapacity = barbers?.length || 0;

    // Count current appointments
    const startTime = `${date}T${time}`;
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('barbershop_id', barbershopId)
      .eq('start_time', startTime)
      .in('status', ['pending', 'confirmed', 'in_progress']);

    const currentBookings = appointments?.length || 0;

    return {
      available: currentBookings < baseCapacity,
      current_capacity: currentBookings,
      max_capacity: baseCapacity,
      with_overbooking: Math.floor(baseCapacity * 1.2), // 20% overbooking allowance
    };
  }

  /**
   * Get capacity statistics
   */
  async getCapacityStats(
    barbershopId: string,
    date: string
  ): Promise<CapacityStats> {
    const capacity = await this.checkCapacityAvailable(
      barbershopId,
      date,
      '12:00'
    );
    const peakHours = await this.getPeakHours(barbershopId);

    const utilizationPercentage =
      capacity.max_capacity > 0
        ? (capacity.current_capacity / capacity.max_capacity) * 100
        : 0;

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (utilizationPercentage > 90) riskLevel = 'high';
    else if (utilizationPercentage > 70) riskLevel = 'medium';

    const recommendations: string[] = [];
    if (riskLevel === 'high') {
      recommendations.push('Consider enabling overbooking for peak hours');
      recommendations.push('Add more barbers during high-demand periods');
    }
    if (peakHours.length === 0) {
      recommendations.push('Define peak hours to optimize capacity management');
    }

    return {
      total_capacity: capacity.max_capacity,
      current_bookings: capacity.current_capacity,
      available_slots: capacity.max_capacity - capacity.current_capacity,
      utilization_percentage: Math.round(utilizationPercentage),
      peak_hours: peakHours,
      risk_level: riskLevel,
      recommendations,
    };
  }

  /**
   * Simulate capacity changes
   */
  async simulateCapacityImpact(
    barbershopId: string,
    date: string,
    changes: {
      max_capacity?: number;
      allow_overbooking?: boolean;
      overbooking_limit?: number;
    }
  ): Promise<{
    current_stats: CapacityStats;
    projected_stats: CapacityStats;
    impact_analysis: {
      capacity_change_percentage: number;
      revenue_impact_estimate: number;
      risk_assessment: string;
    };
  }> {
    const currentStats = await this.getCapacityStats(barbershopId, date);

    // Calculate projected stats
    const projectedCapacity =
      changes.max_capacity || currentStats.total_capacity;
    const projectedOverbooking = changes.allow_overbooking
      ? projectedCapacity + (changes.overbooking_limit || 0)
      : projectedCapacity;

    const projectedStats: CapacityStats = {
      ...currentStats,
      total_capacity: projectedOverbooking,
      available_slots: projectedOverbooking - currentStats.current_bookings,
    };

    const capacityChangePercentage =
      currentStats.total_capacity > 0
        ? ((projectedCapacity - currentStats.total_capacity) /
            currentStats.total_capacity) *
          100
        : 0;

    return {
      current_stats: currentStats,
      projected_stats: projectedStats,
      impact_analysis: {
        capacity_change_percentage: Math.round(capacityChangePercentage),
        revenue_impact_estimate: capacityChangePercentage * 100, // Simplified estimate
        risk_assessment:
          capacityChangePercentage > 50
            ? 'High risk of service degradation'
            : 'Acceptable risk level',
      },
    };
  }

  /**
   * Get capacity forecast
   */
  async getCapacityForecast(
    barbershopId: string,
    startDate: string,
    days: number = 7
  ): Promise<CapacityForecast[]> {
    // TODO: Implement ML-based forecasting
    console.warn('Capacity forecasting not implemented yet');

    // Return mock forecast
    const forecasts: CapacityForecast[] = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < days; i++) {
      forecasts.push({
        date: currentDate.toISOString().split('T')[0],
        predicted_demand: Math.floor(Math.random() * 20) + 10,
        recommended_capacity: Math.floor(Math.random() * 5) + 15,
        confidence_level: 0.75 + Math.random() * 0.2,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return forecasts;
  }

  /**
   * Analyze overbooking risk
   */
  async analyzeOverbookingRisk(
    barbershopId: string,
    period: 'week' | 'month' = 'week'
  ): Promise<OverbookingAnalysis> {
    // TODO: Implement actual analysis based on historical data
    console.warn('Overbooking analysis not fully implemented');

    return {
      current_risk: 'medium',
      overbooking_rate: 0.15, // 15% overbooking
      cancellation_rate: 0.08, // 8% cancellations
      recommended_limit: 2, // Allow 2 overbookings per slot
      potential_revenue_impact: 1200, // Estimated additional revenue
    };
  }

  /**
   * Auto-optimize capacity based on patterns
   */
  async autoOptimizeCapacity(barbershopId: string): Promise<{
    recommendations: Array<{
      time_slot: string;
      current_capacity: number;
      recommended_capacity: number;
      reason: string;
    }>;
  }> {
    // TODO: Implement pattern analysis and optimization
    console.warn('Auto-optimization not implemented yet');

    return {
      recommendations: [
        {
          time_slot: '18:00',
          current_capacity: 3,
          recommended_capacity: 5,
          reason: 'High demand during evening hours',
        },
        {
          time_slot: '14:00',
          current_capacity: 4,
          recommended_capacity: 2,
          reason: 'Low utilization during afternoon',
        },
      ],
    };
  }
}

export const capacityManagementService = new CapacityManagementService();
