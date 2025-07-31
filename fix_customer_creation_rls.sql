-- =====================================================
-- QUICK FIX: Run this in Supabase SQL Editor to fix customer creation
-- =====================================================

-- Allow any request (authenticated or anonymous) to create customer profiles
CREATE POLICY "Allow customer profile creation" 
    ON profiles 
    FOR INSERT 
    WITH CHECK (
        role = 'customer'
    );

-- This simple policy allows the booking flow to create customer profiles
-- without requiring authentication, which is needed for guest bookings