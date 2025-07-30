# Fix Barbershop Hours Migration Plan

## Issue Summary
The `barbershop_hours` table incorrectly includes `break_start` and `break_end` columns. These should only exist at the individual barber level (in the `working_hours` table), not at the barbershop level.

## Migration Overview

### What This Migration Does
1. **Removes break columns** from `barbershop_hours` table
2. **Updates functions** that reference these columns
3. **Preserves all existing data** (open/close times remain intact)
4. **Maintains backward compatibility** with the existing system

### Database Structure After Migration

#### Barbershop Level (`barbershop_hours`)
- `open_time` - When the barbershop opens
- `close_time` - When the barbershop closes
- `is_closed` - Whether the barbershop is closed that day
- **NO BREAK TIMES** - These are handled individually

#### Individual Barber Level
- `working_hours` table - Individual schedules with breaks
- `barber_breaks` table - Dynamic/temporary breaks
- `special_dates` table - Exceptions and holidays

## Implementation Steps

### 1. Apply the Migration
```sql
-- Run the migration file
\i database/migrations/006_fix_barbershop_hours_breaks.sql
```

### 2. Verify the Changes
```sql
-- Check table structure
\d barbershop_hours

-- Verify no break columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'barbershop_hours' 
AND column_name IN ('break_start', 'break_end');
```

### 3. Update TypeScript Types
After applying the migration, regenerate types:
```bash
npx supabase gen types typescript --project-id $PROJECT_ID > src/types/database.generated.ts
```

### 4. Frontend Updates Required

#### Components to Update:
1. **BarbershopScheduleConfig.tsx** - Remove break time inputs
2. **Any forms editing barbershop hours** - Remove break fields
3. **Availability calculations** - Ensure they use individual barber breaks

#### Example Code Changes:
```typescript
// Before
interface BarbershopHours {
  open_time: string;
  close_time: string;
  break_start?: string; // Remove
  break_end?: string;   // Remove
}

// After
interface BarbershopHours {
  open_time: string;
  close_time: string;
}
```

## Testing Checklist

### Database Level
- [ ] Migration runs without errors
- [ ] All existing data is preserved
- [ ] Functions work correctly without break columns
- [ ] Views return expected results

### Application Level
- [ ] Barbershop hours can be created/updated
- [ ] Individual barber breaks still work
- [ ] Availability calculations are correct
- [ ] No TypeScript errors after type regeneration

### Integration Tests
- [ ] Booking flow respects barbershop hours
- [ ] Barber individual breaks are respected
- [ ] Schedule conflicts are properly detected
- [ ] RLS policies work as expected

## Rollback Plan

If issues arise, the migration includes rollback instructions:

```sql
-- 1. Re-add the columns
ALTER TABLE barbershop_hours 
ADD COLUMN break_start TIME,
ADD COLUMN break_end TIME;

-- 2. Re-add constraints
ALTER TABLE barbershop_hours
ADD CONSTRAINT valid_break CHECK (
    (break_start IS NULL AND break_end IS NULL) OR
    (break_start IS NOT NULL AND break_end IS NOT NULL AND 
     break_start >= open_time AND break_end <= close_time AND
     break_end > break_start)
);

-- 3. Restore original functions from backup
```

## Benefits of This Change

1. **Clearer separation of concerns** - Barbershop hours vs individual schedules
2. **More flexibility** - Each barber can have different break times
3. **Simpler barbershop configuration** - Only need to set open/close times
4. **Better scalability** - Easier to add features like multiple breaks per barber

## Notes

- This migration is **non-destructive** - no data is lost
- The change aligns with the original design intent
- Individual barber breaks continue to work as before
- Default barbershop hours are updated automatically

## Related Files

- Migration: `/database/migrations/006_fix_barbershop_hours_breaks.sql`
- Original migration: `/database/migrations/004_barbershop_hours_system.sql`
- Working hours table: Uses `working_hours` table (already has breaks)
- Integration: `/database/migrations/005_integrate_working_hours.sql`