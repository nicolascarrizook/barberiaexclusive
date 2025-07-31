-- =====================================================
-- Fix RLS policies for profiles table to allow customer creation
-- =====================================================

-- Drop all existing INSERT policies for profiles to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can create customer profiles" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Public can create customer profiles" ON profiles;
DROP POLICY IF EXISTS "Anonymous can create customer profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can create customer profiles" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile with auth" ON profiles;

-- Create a single, clear policy for customer profile creation
-- This allows ANYONE (including anonymous users) to create customer profiles
CREATE POLICY "Anyone can create customer profiles" 
    ON profiles 
    FOR INSERT 
    WITH CHECK (
        role = 'customer'
    );

-- Create a separate policy for authenticated users creating their own non-customer profiles
-- This is for when owners, barbers, or admins register
CREATE POLICY "Users can create own profile with auth" 
    ON profiles 
    FOR INSERT 
    WITH CHECK (
        auth.uid() = id AND 
        role != 'customer'
    );

-- Note: These policies allow:
-- 1. Anyone (including anonymous users) to create customer profiles for booking flow
-- 2. Authenticated users to create their own profile when registering as owner/barber/admin