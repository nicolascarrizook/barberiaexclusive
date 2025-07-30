# Schedule System Implementation Test Plan

## Completed Implementation

### 1. Route Configuration ✅
- Added `/owner/hours` route to `src/routes/index.tsx`
- Created `BarbershopHours` page component at `src/pages/owner/BarbershopHours.tsx`
- Imported the component in the router

### 2. Page Component ✅
The `BarbershopHours` page includes:
- Fetches barbershop data for the authenticated owner
- Handles loading and error states
- Shows informative alerts about schedule configuration
- Integrates the existing `BarbershopScheduleConfig` component
- Provides navigation back to dashboard

### 3. Database Schema ✅
The `barbershop_hours` table exists (migration 004) with:
- Support for weekly schedules
- Open/close times per day
- Break/lunch times
- Closed days configuration
- Default system-wide schedules (barbershop_id = NULL)

### 4. Migration Created ✅
- Created migration `005_add_max_concurrent_appointments.sql`
- Adds `max_concurrent_appointments` column to barbershops table
- Includes proper constraints and documentation

### 5. Existing Services ✅
- `barbershop-hours.service.ts` - Full CRUD operations for schedules
- `availability.service.ts` - Complex availability calculations
- `barbershopService.updateBarbershop()` - Handles updating barbershop settings

### 6. UI Component ✅
`BarbershopScheduleConfig.tsx` provides:
- Form for configuring weekly schedules
- Day-by-day time configuration
- Open/closed toggle per day
- Break time configuration
- Max concurrent appointments setting
- Save and reset to defaults functionality

## Required Actions Before Testing

1. **Apply Database Migration**
   ```sql
   -- Run in Supabase SQL editor:
   -- Content of database/migrations/005_add_max_concurrent_appointments.sql
   ```

2. **Regenerate TypeScript Types**
   ```bash
   npx supabase gen types typescript --project-id [your-project-id] > src/types/database.generated.ts
   ```

3. **Verify Environment Variables**
   - Ensure `.env` has correct Supabase credentials
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY

## Testing Steps

### As a Barbershop Owner:

1. **Navigate to Schedule Configuration**
   - Login as an owner account
   - From dashboard, click "Configurar horarios" button
   - Should navigate to `/owner/hours`

2. **Configure Business Hours**
   - Set open/close times for each day
   - Mark Sunday as closed
   - Add lunch break (e.g., 13:00-14:00)
   - Set max concurrent appointments (e.g., 3)

3. **Save Configuration**
   - Click "Guardar cambios"
   - Should see success toast
   - Data should persist in database

4. **Test Special Cases**
   - Try invalid time ranges (close before open)
   - Set break outside business hours
   - Reset to default values

### Verification in Database:

```sql
-- Check saved schedules
SELECT * FROM barbershop_hours 
WHERE barbershop_id = '[your-barbershop-id]'
ORDER BY day_of_week;

-- Check max concurrent appointments
SELECT id, name, max_concurrent_appointments 
FROM barbershops 
WHERE owner_id = '[your-user-id]';
```

### Expected Results:

1. **UI Flow**
   - Smooth navigation from dashboard to hours configuration
   - Form pre-populated with default or existing values
   - Clear validation messages for errors
   - Success feedback after saving

2. **Data Persistence**
   - All 7 days should have entries in barbershop_hours
   - Closed days have is_closed = true
   - Open days have valid time ranges
   - Max concurrent appointments updated in barbershops table

3. **Business Logic**
   - Cannot save invalid time ranges
   - Break times must be within business hours
   - Changes reflected immediately in booking availability

## Next Steps (Phase 2)

1. **Individual Barber Schedules**
   - Create UI for barbers to set their schedules
   - Ensure barber hours are within shop hours
   - Add validation logic

2. **Integration with Booking Flow**
   - Update availability calculations
   - Show only valid booking slots
   - Respect max concurrent appointments

3. **Visual Enhancements**
   - Add schedule preview/calendar view
   - Show impact of changes on availability
   - Add copy schedule feature for similar days