-- Migration: Fix special_dates RLS policies
-- Version: 003
-- Date: 2025-01-30
-- Description: Applies missing INSERT, UPDATE, DELETE policies for special_dates table

-- =====================================================
-- STEP 1: Drop existing policies
-- =====================================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can view special dates" ON special_dates;
DROP POLICY IF EXISTS "Owners can manage special dates" ON special_dates;
DROP POLICY IF EXISTS "Barbers can manage own special dates" ON special_dates;

-- =====================================================
-- STEP 2: Recreate all policies correctly
-- =====================================================

-- Policy 1: Anyone can view special dates (SELECT only)
CREATE POLICY "Anyone can view special dates" 
    ON special_dates FOR SELECT 
    USING (true);

-- Policy 2: Barbershop owners can manage special dates (ALL operations)
CREATE POLICY "Owners can manage special dates" 
    ON special_dates FOR ALL 
    USING (
        (
            barbershop_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM barbershops bs
                WHERE bs.id = special_dates.barbershop_id
                AND bs.owner_id = auth.uid()
            )
        ) OR (
            barber_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM barbers b
                JOIN barbershops bs ON bs.id = b.barbershop_id
                WHERE b.id = special_dates.barber_id
                AND bs.owner_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        (
            barbershop_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM barbershops bs
                WHERE bs.id = barbershop_id
                AND bs.owner_id = auth.uid()
            )
        ) OR (
            barber_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM barbers b
                JOIN barbershops bs ON bs.id = b.barbershop_id
                WHERE b.id = barber_id
                AND bs.owner_id = auth.uid()
            )
        )
    );

-- Policy 3: Barbers can manage their own special dates (ALL operations)
CREATE POLICY "Barbers can manage own special dates" 
    ON special_dates FOR ALL 
    USING (
        barber_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM barbers b
            WHERE b.id = special_dates.barber_id
            AND b.profile_id = auth.uid()
        )
    )
    WITH CHECK (
        barber_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM barbers b
            WHERE b.id = barber_id
            AND b.profile_id = auth.uid()
        )
    );

-- =====================================================
-- STEP 3: Verify policies were created correctly
-- =====================================================

DO $$
DECLARE
    policy_count INTEGER;
    select_count INTEGER;
    all_count INTEGER;
BEGIN
    -- Count total policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'special_dates';
    
    -- Count SELECT policies
    SELECT COUNT(*) INTO select_count
    FROM pg_policies
    WHERE tablename = 'special_dates'
    AND cmd = 'SELECT';
    
    -- Count ALL policies
    SELECT COUNT(*) INTO all_count
    FROM pg_policies
    WHERE tablename = 'special_dates'
    AND cmd = 'ALL';
    
    RAISE NOTICE 'Special dates policies created:';
    RAISE NOTICE '  Total policies: %', policy_count;
    RAISE NOTICE '  SELECT policies: %', select_count;
    RAISE NOTICE '  ALL policies: %', all_count;
    
    IF policy_count = 3 AND select_count = 1 AND all_count = 2 THEN
        RAISE NOTICE 'Success: All RLS policies created correctly!';
    ELSE
        RAISE WARNING 'Warning: Expected 3 policies (1 SELECT, 2 ALL) but found % policies', policy_count;
    END IF;
END $$;

-- =====================================================
-- STEP 4: Display current policies for verification
-- =====================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'special_dates'
ORDER BY policyname;

-- =====================================================
-- STEP 5: Test policy effectiveness
-- =====================================================

-- This query helps verify if the current user can insert into special_dates
WITH user_info AS (
    SELECT 
        p.id,
        p.email,
        p.role,
        bs.id as barbershop_id,
        bs.name as barbershop_name,
        b.id as barber_id
    FROM profiles p
    LEFT JOIN barbershops bs ON bs.owner_id = p.id
    LEFT JOIN barbers b ON b.profile_id = p.id
    WHERE p.id = auth.uid()
)
SELECT 
    'Current user info:' as info_type,
    email,
    role,
    CASE 
        WHEN barbershop_id IS NOT NULL THEN 'Can manage barbershop holidays'
        WHEN barber_id IS NOT NULL THEN 'Can manage personal special dates'
        ELSE 'No special date permissions'
    END as permissions
FROM user_info;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON POLICY "Anyone can view special dates" ON special_dates IS 
'Allows all users to view special dates for availability checking';

COMMENT ON POLICY "Owners can manage special dates" ON special_dates IS 
'Allows barbershop owners to create, update, and delete holidays for their barbershop or barbers';

COMMENT ON POLICY "Barbers can manage own special dates" ON special_dates IS 
'Allows barbers to manage their personal special dates and time off';