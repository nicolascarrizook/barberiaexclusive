// // // // // import { Database } from './database'

// Extend the database types with barber_schedules table
export interface BarberSchedulesTable {
  Row: {
    id: string
    barber_id: string
    day_of_week: Database['public']['Enums']['day_of_week']
    is_working: boolean
    start_time: string | null
    end_time: string | null
    break_start: string | null
    break_end: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    barber_id: string
    day_of_week: Database['public']['Enums']['day_of_week']
    is_working?: boolean
    start_time?: string | null
    end_time?: string | null
    break_start?: string | null
    break_end?: string | null
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    barber_id?: string
    day_of_week?: Database['public']['Enums']['day_of_week']
    is_working?: boolean
    start_time?: string | null
    end_time?: string | null
    break_start?: string | null
    break_end?: string | null
    created_at?: string
    updated_at?: string
  }
}

// Type for break_type enum
export type BreakType = 'temporary' | 'vacation' | 'sick' | 'personal' | 'training' | 'other'

// Extended barber_breaks with break_type
export interface ExtendedBarberBreaks extends Database['public']['Tables']['barber_breaks']['Row'] {
  break_type?: BreakType
}