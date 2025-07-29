# Fix for Barber Creation Error

## Problem
The error "Error creating manual barber" occurs because the required database tables (`barber_invitations` and `provisional_barbers`) don't exist in your Supabase database.

## Solution

### Step 1: Run the Database Migration

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy the entire contents of `database/run_barber_invitations_migration.sql`
4. Paste it into the SQL editor
5. Click "Run" to execute the migration

This will create:
- `barber_invitations` table
- `provisional_barbers` table
- Required indexes
- Row Level Security policies
- Helper functions for invitation codes
- Triggers for automatic updates

### Step 2: Regenerate TypeScript Types (Optional but Recommended)

After running the migration, regenerate your TypeScript types:

```bash
npx supabase gen types typescript --project-id your-project-id > src/types/database.generated.ts
```

Replace `your-project-id` with your actual Supabase project ID.

### Step 3: Test the Fix

1. Go to your barbershop owner dashboard
2. Navigate to "Gestionar barberos"
3. Click "Agregar barbero"
4. Try the "Crear acceso manual" tab
5. Fill in the barber details
6. Click "Crear barbero"

You should now see:
- A success message
- An invitation code displayed
- A URL for the barber to use for registration

## What Changed

1. **Improved Error Handling**: The error messages now include the error code from Supabase, making debugging easier.

2. **Database Schema**: Added two new tables:
   - `barber_invitations`: Tracks both email and manual invitations
   - `provisional_barbers`: Stores details for manually created barbers

3. **Invitation System**: 
   - Email invitations: Send invites to barbers with email
   - Manual creation: Generate access codes for barbers without email

## Next Steps

After fixing this error, you'll need to:

1. Create the barber onboarding page at `/barber/onboarding`
2. Set up email sending (optional, for email invitations)
3. Test the complete barber registration flow

## Troubleshooting

If you still get errors after running the migration:

1. Check the browser console for the specific error code
2. Verify your user has the "owner" role and owns a barbershop
3. Check that RLS is enabled on your tables
4. Make sure you're logged in when testing