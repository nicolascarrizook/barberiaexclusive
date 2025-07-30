# Implementation Guide: New Scheduling Architecture

## Step-by-Step Implementation

### Phase 1: Database Migration

1. **Review the migration script**
   ```bash
   cat database/migrations/005_fix_scheduling_architecture.sql
   ```

2. **Apply the migration in Supabase**
   - Go to SQL Editor in Supabase Dashboard
   - Copy and paste the migration script
   - Execute the script
   - Verify tables are created/modified correctly

3. **Verify data migration**
   ```sql
   -- Check barber_schedules were created
   SELECT * FROM barber_schedules LIMIT 10;
   
   -- Check barbershop_hours no longer has break columns
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'barbershop_hours';
   ```

### Phase 2: Update Frontend Components

1. **Replace barber schedule management**
   - Old: `BarberScheduleManager.tsx` (for breaks only)
   - New: `BarberScheduleManagerV2.tsx` (unified interface)
   
   ```tsx
   // In your barber dashboard
   import { BarberScheduleManagerV2 } from '@/components/barber/BarberScheduleManagerV2'
   
   <BarberScheduleManagerV2
     barberId={barberId}
     barbershopId={barbershopId}
     barberName={barberName}
   />
   ```

2. **Update owner dashboard**
   - `BarbershopScheduleConfig.tsx` now only shows business hours
   - Add barber schedule overview component for owners

### Phase 3: Update Service Layer

1. **Update imports in existing services**
   ```typescript
   // In availability.service.ts
   import { barberSchedulesService } from './barber-schedules.service'
   
   // Update availability calculations to check barber schedules
   ```

2. **Update appointment validation**
   - Check barbershop is open
   - Check barber is working
   - Check not during barber's break
   - Check no temporary breaks

### Phase 4: Testing

1. **Test barbershop hours configuration**
   - Set business hours
   - Verify breaks are removed
   - Test day closed functionality

2. **Test barber schedule configuration**
   - Set individual work hours
   - Configure personal breaks
   - Test validation against barbershop hours

3. **Test availability calculation**
   - Book appointment during barber break → should fail
   - Book appointment outside barber hours → should fail
   - Book appointment when barbershop closed → should fail

### Phase 5: Data Cleanup

1. **After successful testing**
   ```sql
   -- Remove old table backup
   DROP TABLE IF EXISTS barbershop_hours_old;
   ```

2. **Update existing barber schedules**
   - Allow barbers to customize their schedules
   - Remove uniform break times

## Common Issues & Solutions

### Issue 1: Barber schedules not showing
**Solution**: Ensure migration created schedules for all active barbers
```sql
INSERT INTO barber_schedules (barber_id, day_of_week, is_working, start_time, end_time)
SELECT id, 'monday', true, '09:00', '20:00'
FROM barbers WHERE is_active = true
AND NOT EXISTS (
  SELECT 1 FROM barber_schedules 
  WHERE barber_id = barbers.id AND day_of_week = 'monday'
);
```

### Issue 2: Validation errors
**Solution**: Check RLS policies are updated
```sql
-- Verify barbers can update their own schedules
SELECT * FROM barber_schedules 
WHERE barber_id IN (
  SELECT id FROM barbers WHERE profile_id = auth.uid()
);
```

### Issue 3: Break times still showing in UI
**Solution**: Clear cache and verify component updates
```bash
npm run dev -- --force
```

## Rollback Procedure

If issues arise:

1. **Apply rollback migration**
   ```sql
   -- In Supabase SQL Editor
   -- Run: database/migrations/005_rollback_scheduling_architecture.sql
   ```

2. **Revert frontend components**
   ```bash
   git checkout HEAD -- src/components/owner/BarbershopScheduleConfig.tsx
   git checkout HEAD -- src/services/barbershop-hours.service.ts
   ```

3. **Remove new files**
   ```bash
   rm src/services/barber-schedules.service.ts
   rm src/components/barber/BarberWorkSchedule.tsx
   rm src/components/barber/BarberScheduleManagerV2.tsx
   ```

## Monitoring

After implementation, monitor:

1. **Error logs**
   ```sql
   -- Check Supabase logs for RLS violations
   SELECT * FROM mcp__supabase__get_logs WHERE service = 'postgres'
   AND message LIKE '%barber_schedules%';
   ```

2. **User feedback**
   - Barbers can set schedules successfully
   - Appointments respect new schedule rules
   - No double bookings during breaks

3. **Performance**
   - Query times for availability checks
   - Page load times for schedule components