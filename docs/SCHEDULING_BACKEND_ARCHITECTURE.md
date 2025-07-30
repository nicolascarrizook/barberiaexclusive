# Scheduling Backend Architecture

## Overview

The barbershop scheduling system is designed to handle complex scheduling requirements including business hours, individual barber schedules, capacity management, and dynamic availability. The system is built with flexibility and scalability in mind.

## Current State vs Future State

### Current Implementation (Before Migrations)

1. **Working Hours Table** (`working_hours`)
   - Basic weekly schedule for each barber
   - Fixed break times
   - Simple is_working flag

2. **Special Dates Table** (`special_dates`)
   - Holidays and exceptions
   - Custom hours in JSONB format
   - Can be barbershop-wide or barber-specific

### Future Implementation (After Migrations)

1. **Barbershop Hours System** (Migration 004)
   - `barbershop_hours`: Business-wide default hours
   - `barber_breaks`: Dynamic break management
   - `capacity_config`: Capacity settings per time slot
   - `peak_hours`: Peak hour definitions with multipliers

2. **Advanced Schedule Templates** (Migration 001)
   - `schedule_templates`: Multiple templates per barber
   - `schedule_template_blocks`: Flexible time blocks
   - `schedule_exceptions`: Date-specific overrides
   - `barber_schedules_current`: Materialized current schedule

## Database Schema

### Core Tables (Existing)

```sql
-- Basic weekly schedule
working_hours
├── id
├── barber_id
├── day_of_week
├── start_time
├── end_time
├── is_working
├── break_start
└── break_end

-- Date-specific overrides
special_dates
├── id
├── barbershop_id / barber_id
├── date
├── is_holiday
├── custom_hours (JSONB)
└── reason
```

### New Tables (After Migrations)

```sql
-- Barbershop default hours
barbershop_hours
├── id
├── barbershop_id (NULL = system default)
├── day_of_week
├── is_closed
├── open_time
├── close_time
├── break_start
└── break_end

-- Dynamic barber breaks
barber_breaks
├── id
├── barber_id
├── date
├── start_time
├── end_time
├── reason
├── is_recurring
└── recurrence_end_date

-- Capacity configuration
capacity_config
├── id
├── barbershop_id
├── time_slot
├── day_of_week (optional)
├── max_capacity
├── current_capacity
├── peak_hour_multiplier
├── allow_overbooking
└── overbooking_limit

-- Peak hours definition
peak_hours
├── id
├── barbershop_id
├── day_of_week
├── start_time
├── end_time
├── multiplier
└── description
```

## Service Layer Architecture

### 1. BarbershopHoursService
- **Purpose**: Manage business-wide operating hours
- **Current**: Uses `working_hours` as fallback
- **Future**: Will use `barbershop_hours` table
- **Key Methods**:
  - `getBarbershopSchedule()`: Get weekly schedule
  - `updateBarbershopSchedule()`: Update all days
  - `isOpen()`: Check if open at specific time

### 2. BarberScheduleService
- **Purpose**: Manage individual barber schedules
- **Current**: Uses `working_hours` table
- **Future**: Will integrate with schedule templates
- **Key Methods**:
  - `getWeeklySchedule()`: Get barber's weekly template
  - `getEffectiveSchedule()`: Get schedule for specific date
  - `checkScheduleConflict()`: Validate time slots
  - `getAvailableSlots()`: Generate bookable slots

### 3. AvailabilityService
- **Purpose**: Calculate real-time availability
- **Features**:
  - Combines barbershop hours, barber schedules, and breaks
  - Checks for time-off and special dates
  - Generates available time slots
  - Provides capacity statistics and heatmaps

### 4. ScheduleTemplatesService
- **Purpose**: Advanced template management
- **Status**: Placeholder implementation
- **Future Features**:
  - Multiple templates per barber
  - Template activation/deactivation
  - Copy templates between barbers
  - Exception management

### 5. CapacityManagementService
- **Purpose**: Dynamic capacity control
- **Features**:
  - Time-slot specific capacity
  - Peak hour multipliers
  - Overbooking management
  - Capacity forecasting
  - Auto-optimization suggestions

## Key Functions and Algorithms

### 1. Schedule Generation
```sql
-- Function: generate_barber_schedule()
-- Combines templates and exceptions to generate actual schedule
-- Handles priority: exceptions > templates > defaults
```

### 2. Capacity Calculation
```sql
-- Function: check_capacity_available()
-- Calculates available capacity considering:
-- - Base capacity (number of barbers)
-- - Peak hour multipliers
-- - Current bookings
-- - Overbooking limits
```

### 3. Conflict Detection
```typescript
// Algorithm for checking scheduling conflicts:
1. Check appointment conflicts
2. Check break conflicts
3. Verify within working hours
4. Check capacity limits
5. Validate business rules
```

## Migration Strategy

### Phase 1: Database Setup
1. Run Migration 004: Create barbershop hours tables
2. Run Migration 001: Create schedule template system
3. Run Migration 005: Create integration functions

### Phase 2: Data Migration
1. Migrate existing `working_hours` to templates
2. Set default barbershop hours
3. Initialize capacity configurations

### Phase 3: Service Updates
1. Update services to use new tables
2. Remove temporary implementations
3. Enable full functionality

## API Endpoints (Recommended)

### Barbershop Hours
- `GET /api/barbershops/{id}/hours` - Get business hours
- `PUT /api/barbershops/{id}/hours` - Update business hours
- `POST /api/barbershops/{id}/hours/copy-defaults` - Copy from defaults

### Barber Schedules
- `GET /api/barbers/{id}/schedule` - Get weekly schedule
- `PUT /api/barbers/{id}/schedule/{day}` - Update specific day
- `GET /api/barbers/{id}/schedule/effective?date={date}` - Get effective schedule
- `POST /api/barbers/{id}/breaks` - Create break
- `POST /api/barbers/{id}/special-dates` - Create exception

### Availability
- `GET /api/availability/barber/{id}?start={date}&end={date}` - Get availability
- `GET /api/availability/barbershop/{id}/heatmap` - Get availability heatmap
- `GET /api/availability/slots?barber={id}&date={date}&duration={min}` - Get available slots

### Capacity Management
- `GET /api/barbershops/{id}/capacity` - Get capacity config
- `PUT /api/barbershops/{id}/capacity` - Update capacity
- `GET /api/barbershops/{id}/capacity/stats?date={date}` - Get statistics
- `POST /api/barbershops/{id}/capacity/simulate` - Simulate changes

### Schedule Templates
- `GET /api/barbers/{id}/templates` - List templates
- `POST /api/barbers/{id}/templates` - Create template
- `PUT /api/barbers/{id}/templates/{id}/activate` - Activate template
- `POST /api/barbers/{id}/templates/copy` - Copy from another barber

## Performance Considerations

1. **Indexing Strategy**
   - Index on (barber_id, date) for appointments
   - Index on (barbershop_id, day_of_week) for hours
   - Index on schedule_date for current schedules

2. **Caching**
   - Cache barbershop hours (changes infrequently)
   - Cache barber weekly schedules
   - Invalidate on schedule changes

3. **Materialized Views**
   - `barber_schedules_current` for fast lookups
   - Update via triggers on template/exception changes

## Security Considerations

1. **Row Level Security (RLS)**
   - Owners can manage their barbershop settings
   - Barbers can manage their own schedules
   - Everyone can view availability

2. **Validation**
   - Time range validation
   - Capacity limit enforcement
   - Conflict prevention

## Future Enhancements

1. **Machine Learning Integration**
   - Demand forecasting
   - Optimal capacity suggestions
   - No-show prediction

2. **Advanced Features**
   - Recurring appointments
   - Group bookings
   - Resource allocation (chairs, equipment)

3. **Integration Points**
   - Calendar sync (Google, Outlook)
   - SMS/Email notifications
   - Analytics dashboard

## Troubleshooting

### Common Issues

1. **Services returning empty data**
   - Check if migrations have been applied
   - Verify table existence in database

2. **Capacity calculations incorrect**
   - Ensure peak_hours are configured
   - Check capacity_config settings

3. **Schedule conflicts not detected**
   - Verify time zone handling
   - Check appointment status filters

### Debug Queries

```sql
-- Check effective schedule for a barber
SELECT * FROM get_barber_effective_schedule('barber_id', '2024-01-30');

-- Check capacity for a time slot
SELECT * FROM check_capacity_available('barbershop_id', '2024-01-30', '14:00');

-- View unified availability
SELECT * FROM v_unified_availability WHERE barber_id = 'xxx';
```

## Conclusion

The scheduling backend provides a robust foundation for complex scheduling requirements. The phased migration approach ensures backward compatibility while enabling advanced features. Services are designed to work with both current and future database schemas, making the transition seamless.