-- Migration: Migrate guest customers to profiles table
-- This migration consolidates guest customers into the profiles table
-- to maintain referential integrity with appointments

BEGIN;

-- Step 1: Migrate existing guest customers to profiles table
-- Create profiles for all guest customers that don't already exist
INSERT INTO profiles (
    id,
    email,
    phone,
    full_name,
    role,
    is_active,
    preferred_language,
    notification_preferences,
    created_at,
    updated_at
)
SELECT 
    gc.id,
    gc.email,
    gc.phone,
    gc.full_name,
    'customer'::user_role,
    true,
    'es',
    '{
        "email": true,
        "sms": true,
        "push": true,
        "appointment_reminders": true,
        "promotions": false
    }'::jsonb,
    gc.created_at,
    gc.updated_at
FROM guest_customers gc
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = gc.id
)
ON CONFLICT (id) DO NOTHING; -- Skip if profile already exists

-- Step 2: Update any appointments that might be referencing guest_customers
-- This is a safety measure in case there are any existing appointments
UPDATE appointments 
SET customer_id = gc.id
FROM guest_customers gc
WHERE appointments.customer_id::text = gc.id::text
AND EXISTS (SELECT 1 FROM profiles WHERE id = gc.id);

-- Step 3: Add a flag to profiles to distinguish guest customers
-- This helps maintain the distinction between authenticated and guest users
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;

-- Mark migrated guest customers as guests
UPDATE profiles 
SET is_guest = true 
WHERE id IN (SELECT id FROM guest_customers);

-- Step 4: Create index for guest customer queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_guest ON profiles(is_guest);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_guest ON profiles(phone) WHERE is_guest = true;

-- Step 5: Update RLS policies to handle guest customers
-- Allow guests to be created without authentication
CREATE POLICY "Allow guest customer creation" ON profiles
    FOR INSERT 
    WITH CHECK (is_guest = true);

-- Allow reading guest customer data for appointments
CREATE POLICY "Allow reading guest customers for appointments" ON profiles
    FOR SELECT 
    USING (is_guest = true OR auth.uid() = id);

-- Step 6: Create a view for easy guest customer management
CREATE OR REPLACE VIEW guest_customers_view AS
SELECT 
    id,
    full_name,
    phone,
    email,
    created_at,
    updated_at
FROM profiles 
WHERE is_guest = true;

-- Step 7: Create function to create guest customers
CREATE OR REPLACE FUNCTION create_guest_customer(
    p_full_name TEXT,
    p_phone TEXT,
    p_email TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    customer_id UUID;
BEGIN
    -- Check if customer already exists by phone
    SELECT id INTO customer_id
    FROM profiles
    WHERE phone = p_phone AND is_guest = true
    LIMIT 1;
    
    IF customer_id IS NOT NULL THEN
        -- Update existing customer if email provided and different
        IF p_email IS NOT NULL AND p_email != '' THEN
            UPDATE profiles 
            SET email = p_email, updated_at = NOW()
            WHERE id = customer_id AND (email IS NULL OR email != p_email);
        END IF;
        
        RETURN customer_id;
    END IF;
    
    -- Create new guest customer
    INSERT INTO profiles (
        id,
        email,
        phone,
        full_name,
        role,
        is_active,
        is_guest,
        preferred_language,
        notification_preferences
    ) VALUES (
        gen_random_uuid(),
        NULLIF(p_email, ''),
        p_phone,
        p_full_name,
        'customer',
        true,
        true,
        'es',
        '{
            "email": true,
            "sms": true,
            "push": true,
            "appointment_reminders": true,
            "promotions": false
        }'::jsonb
    ) RETURNING id INTO customer_id;
    
    RETURN customer_id;
END;
$$;

-- Step 8: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_guest_customer TO authenticated, anon;

COMMIT;

-- Note: After confirming this migration works correctly, 
-- the guest_customers table can be dropped in a future migration
-- DROP TABLE guest_customers; -- Uncomment after verifying migration success