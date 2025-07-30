# Barber Schedule Validation Fix

## Issues Fixed
1. The error "Start and end times are required when working" was appearing when trying to save barber working hours
2. Barbers could select hours outside the barbershop's operating hours
3. Database error "null value in column 'start_time' violates not-null constraint" when saving non-working days
4. PGRST116 error when copying barbershop hours to barber schedule

## Root Causes
1. The component was using methods that didn't exist in the service (`getBarberWeeklySchedule`, `updateBarberWeeklySchedule`)
2. The service was trying to use a table (`barber_working_hours`) that hasn't been created yet (migration 007 is PENDING)
3. The validation was too strict with empty strings vs null values
4. No client-side validation to prevent saving hours outside barbershop hours
5. The `working_hours` table has NOT NULL constraints on `start_time` and `end_time`, but we were trying to save null values for non-working days
6. The `getWeeklySchedule` method was using a complex join with `barbers!inner` that was causing PGRST116 errors
7. Poor error handling in `copyBarbershopHours` when the barber wasn't found
8. Multiple `.single()` queries that expected exactly one row but were getting zero rows, causing PGRST116 errors

## Changes Made

### 1. Service Layer (`src/services/barber-schedules.service.ts`)
- Added missing methods for backward compatibility with the component
- Updated to use the existing `working_hours` table instead of the pending `barber_working_hours` table
- Fixed validation to handle empty strings properly
- Added the `WeeklyBarberSchedule` type for component usage
- **Fixed NULL constraint issue**: Changed approach to DELETE records for non-working days instead of saving with null times
- Updated `upsertDaySchedule` to return null for non-working days
- Modified `updateWeeklySchedule` to handle null returns properly
- **Fixed PGRST116 error**: Removed problematic `barbers!inner` join from `getWeeklySchedule`
- **Improved error handling**: Added specific error messages for when barber is not found or barbershop has no hours
- **Fixed all .single() queries**: Replaced `.single()` with `.maybeSingle()` in:
  - `validateScheduleAgainstBarbershop` (line 417)
  - `copyBarbershopHours` (line 350)
  - `copyScheduleFromBarber` (lines 303 and 318)
  - `getDaySchedule` (line 112)
- **Added better error handling**: Added null checks and specific error messages for all barber queries
- **Added debugging logs**: Added console.log in `copyBarbershopHours` to help track barberId issues

### 2. Component Layer (`src/components/barber/BarberWorkSchedule.tsx`)
- Added client-side validation in `onSubmit` to prevent saving invalid schedules
- Updated form schema to properly validate empty strings
- Shows error toast when trying to save hours outside barbershop hours
- Improved Spanish error messages
- **Updated data loading logic**: Now properly handles missing records as non-working days
- Initialize all days with default values, then update with actual data

## Testing Instructions

1. **Test as a barber user:**
   - Log in as a barber
   - Go to your schedule configuration
   - Try to set working hours outside the barbershop hours (you should get an error)
   - Set valid hours within barbershop hours (should save successfully)
   - Mark a day as non-working and save (should work without requiring times)

2. **Test validation scenarios:**
   - Try to save with empty time fields when marked as working (should show error)
   - Try to set start time after end time (should show error)
   - Try to set hours before barbershop opens or after it closes (should show error)

3. **Test copy functionality:**
   - If there are other barbers, try copying their schedule
   - Verify the copied schedule respects barbershop hours

4. **Test copy barbershop hours (FIXED):**
   - Click "Copiar horarios de la barbería" button
   - Should copy the barbershop's operating hours to the barber
   - **No more PGRST116 errors** - The service now uses `.maybeSingle()` instead of `.single()`
   - Check that appropriate error messages are shown:
     - "No se encontró el barbero" if barber doesn't exist
     - "La barbería no tiene horarios definidos" if barbershop has no hours
   - Check browser console for barberId log to help debug any issues

## Database Behavior

With the new implementation:
- **Working days**: A record exists in the `working_hours` table with times
- **Non-working days**: No record exists in the table (deleted if previously existed)
- This approach respects the NOT NULL constraints of the database schema

## PGRST116 Error Resolution

The PGRST116 error "JSON object requested, multiple (or no) rows returned" has been fixed by:

1. **Replacing all `.single()` with `.maybeSingle()`**: The `.single()` method expects exactly one row and throws PGRST116 when it gets zero rows. Using `.maybeSingle()` returns null instead of throwing an error.

2. **Added proper error handling**: Each query now checks for errors and null results separately, providing specific error messages.

3. **Improved logging**: Added console.log statements to help debug barberId issues.

The fix ensures that:
- If a barber record doesn't exist, a user-friendly error message is shown
- If RLS policies prevent access, the error is handled gracefully
- The copy functionality works without PGRST116 errors

## Future Improvements

1. **Apply migration 007** to create the proper `barber_working_hours` table
2. **Update the service** to use the new table once migration is applied
3. **Add visual indicators** in the UI to show barbershop hours limits
4. **Implement auto-adjustment** of barber hours to fit within barbershop hours
5. **Add RLS policy checks** to ensure barbers can only access their own schedules

## Related Files
- `src/services/barber-schedules.service.ts`
- `src/components/barber/BarberWorkSchedule.tsx`
- `database/migrations/007_barber_working_hours.sql` (PENDING)