# Scheduling Architecture Documentation

## Overview

The scheduling system has been redesigned to properly separate barbershop-level configuration from individual barber-level configuration. This provides a more flexible and realistic system that matches how barbershops actually operate.

## Architecture Components

### 1. Barbershop Hours (`barbershop_hours` table)
**Purpose**: Defines when the business is open
- Operating hours (open/close times)
- Days closed
- No break information (breaks are individual)

**Key fields**:
- `barbershop_id`: Reference to the barbershop
- `day_of_week`: Day of the week
- `is_closed`: Whether the barbershop is closed
- `open_time` / `close_time`: Business hours

### 2. Barber Schedules (`barber_schedules` table)
**Purpose**: Defines individual barber work schedules
- Personal working hours within barbershop hours
- Individual break times (lunch, etc.)
- Days off

**Key fields**:
- `barber_id`: Reference to the barber
- `day_of_week`: Day of the week
- `is_working`: Whether the barber works this day
- `start_time` / `end_time`: Barber's work hours
- `break_start` / `break_end`: Regular break times

### 3. Barber Breaks (`barber_breaks` table)
**Purpose**: Exceptional/temporary breaks
- Sick days
- Medical appointments
- Vacations
- Personal time off

**Key fields**:
- `barber_id`: Reference to the barber
- `date`: Specific date
- `start_time` / `end_time`: Break duration
- `break_type`: Type of break (temporary, vacation, sick, etc.)

## Business Rules

### Hierarchy
1. **Barbershop must be open** for barbers to work
2. **Barber work hours** must fall within barbershop hours
3. **Regular breaks** are defined in barber_schedules
4. **Exceptional breaks** override regular schedule

### Validation Rules
- Barber cannot start before barbershop opens
- Barber cannot work after barbershop closes
- Break times must be within work hours
- Minimum break duration: 15 minutes

## UI Components

### For Business Owners

#### BarbershopScheduleConfig
- Configure business operating hours only
- Set days closed
- Define maximum concurrent appointments

#### BarberManagement
- View all barber schedules
- Approve/reject time-off requests
- Monitor coverage

### For Barbers

#### BarberWorkSchedule
- Set personal work hours
- Define regular break times
- Must respect barbershop hours

#### BarberScheduleManager
- Request temporary time off
- View weekly schedule
- Manage exceptional breaks

## Migration Path

### From Old System
1. Barbershop break times → First active barber's break times
2. All barbers inherit barbershop schedule initially
3. Barbers can then customize their individual schedules

### Database Migration
Run migration `005_fix_scheduling_architecture.sql`:
- Creates `barber_schedules` table
- Removes break columns from `barbershop_hours`
- Migrates existing data
- Adds validation functions

### Rollback Plan
If needed, run `005_rollback_scheduling_architecture.sql`:
- Restores original `barbershop_hours` structure
- Removes `barber_schedules` table
- Preserves data integrity

## API Changes

### Services

#### barbershop-hours.service.ts
- Removed: Break time management
- Added: Simplified hours management
- Focus: Business operations only

#### barber-schedules.service.ts (NEW)
- Manages individual barber schedules
- Validates against barbershop hours
- Handles regular work patterns

### Endpoints Affected
- `GET /api/availability` - Now checks both barbershop and barber schedules
- `POST /api/appointments` - Validates against barber's actual availability
- `GET /api/barbers/:id/schedule` - Returns individual schedule

## Benefits

1. **Flexibility**: Each barber has independent schedule
2. **Coverage**: Staggered breaks ensure continuous service
3. **Clarity**: Clear separation of concerns
4. **Realism**: Matches real-world operations
5. **Scalability**: Easy to add shifts, part-time schedules

## Example Scenarios

### Scenario 1: Staggered Lunch Breaks
- Barbershop: Open 9 AM - 8 PM
- Barber A: Works 9 AM - 6 PM, lunch 12 PM - 1 PM
- Barber B: Works 10 AM - 8 PM, lunch 1 PM - 2 PM
- Result: Continuous coverage during lunch hours

### Scenario 2: Part-time Barber
- Barbershop: Open 9 AM - 8 PM (Mon-Sat)
- Barber C: Works only Mon, Wed, Fri (9 AM - 5 PM)
- Result: Barber unavailable on other days

### Scenario 3: Early/Late Shifts
- Barbershop: Open 9 AM - 9 PM
- Barber D: Early shift 9 AM - 5 PM
- Barber E: Late shift 1 PM - 9 PM
- Result: Extended coverage with overlap

## Future Enhancements

1. **Shift Templates**: Pre-defined shift patterns
2. **Rotation Schedules**: Automatic weekly rotations
3. **Coverage Analytics**: Identify understaffed periods
4. **Break Optimization**: AI-suggested break times
5. **Holiday Schedules**: Special holiday hours