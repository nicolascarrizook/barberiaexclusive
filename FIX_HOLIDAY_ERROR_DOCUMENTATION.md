# Fix for Holiday Save Error PGRST116

## Error Description
When saving a holiday, the following error occurs:
```json
{
    "code": "PGRST116",
    "details": "The result contains 0 rows",
    "hint": null,
    "message": "JSON object requested, multiple (or no) rows returned"
}
```

## Root Cause
The `special_dates` table allows duplicate entries for the same barbershop and date. When the holiday service tries to fetch a single record using `.single()`, it fails because multiple rows are returned.

## Solution

### 1. Immediate Fix (Run in Supabase SQL Editor)

Execute the SQL script: `fix_holiday_duplicates_quick.sql`

This script will:
- Remove existing duplicates (keeping the most recent)
- Add unique constraints to prevent future duplicates
- Create performance indexes
- Verify the fix was applied

### 2. Code Fix (Already Applied)

The `holidays.service.ts` has been updated to:
- Use `.maybeSingle()` instead of `.single()` to handle 0 or multiple rows gracefully
- Add retry logic for unique constraint violations
- Enhanced error logging for debugging

### 3. Full Migration (Recommended)

For a complete solution, apply the migration:
```bash
database/migrations/002_fix_special_dates_unique_constraint.sql
```

This migration includes:
- Duplicate cleanup with detailed logging
- Unique constraints with proper naming
- Performance indexes
- Helper function `upsert_special_date` for safe operations
- Documentation comments

## Verification Steps

1. **Check for duplicates:**
```sql
SELECT barbershop_id, date, COUNT(*) as count
FROM special_dates
WHERE barbershop_id IS NOT NULL
GROUP BY barbershop_id, date
HAVING COUNT(*) > 1;
```

2. **Verify constraints exist:**
```sql
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'special_dates'::regclass
AND conname LIKE 'unique_%';
```

3. **Test holiday creation:**
- Create a new holiday
- Try to create the same holiday again
- Should update instead of creating duplicate

## Prevention

The unique constraints will prevent this error from occurring in the future by:
- Enforcing one holiday per barbershop per date
- Enforcing one special date per barber per date
- Database-level validation that cannot be bypassed

## Related Files
- `/src/services/holidays.service.ts` - Updated service with better error handling
- `/database/migrations/002_fix_special_dates_unique_constraint.sql` - Full migration
- `/fix_holiday_duplicates_quick.sql` - Quick fix script