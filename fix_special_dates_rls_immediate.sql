-- =====================================================
-- IMMEDIATE FIX FOR SPECIAL_DATES RLS ISSUE
-- =====================================================
-- Execute this script in Supabase SQL Editor to fix the RLS policy issue
-- URL: https://supabase.com/dashboard/project/[your-project-id]/sql

-- 1️⃣ CHECK CURRENT STATUS
SELECT 
    'CURRENT POLICIES:' as info,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'special_dates'
ORDER BY policyname;

-- 2️⃣ DROP EXISTING POLICIES
DROP POLICY IF EXISTS "Anyone can view special dates" ON special_dates;
DROP POLICY IF EXISTS "Owners can manage special dates" ON special_dates;
DROP POLICY IF EXISTS "Barbers can manage own special dates" ON special_dates;

-- 3️⃣ CREATE CORRECT POLICIES

-- Anyone can view special dates
CREATE POLICY "Anyone can view special dates" 
    ON special_dates FOR SELECT 
    USING (true);

-- Owners can manage special dates
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

-- Barbers can manage their own special dates
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

-- 4️⃣ VERIFY POLICIES WERE CREATED
SELECT 
    'UPDATED POLICIES:' as info,
    policyname,
    cmd,
    CASE 
        WHEN cmd = 'SELECT' THEN '✅ Read access for all'
        WHEN cmd = 'ALL' AND policyname LIKE '%Owners%' THEN '✅ Full access for owners'
        WHEN cmd = 'ALL' AND policyname LIKE '%Barbers%' THEN '✅ Full access for barbers'
        ELSE '❓ Unknown'
    END as description
FROM pg_policies 
WHERE tablename = 'special_dates'
ORDER BY policyname;

-- 5️⃣ TEST YOUR ACCESS
-- This will show what permissions you have
WITH your_access AS (
    SELECT 
        p.email,
        p.role,
        bs.id as owned_barbershop_id,
        bs.name as owned_barbershop_name,
        b.id as barber_id
    FROM profiles p
    LEFT JOIN barbershops bs ON bs.owner_id = p.id
    LEFT JOIN barbers b ON b.profile_id = p.id
    WHERE p.id = auth.uid()
)
SELECT 
    email,
    role,
    CASE 
        WHEN owned_barbershop_id IS NOT NULL THEN 
            '✅ You can manage holidays for barbershop: ' || owned_barbershop_name
        WHEN barber_id IS NOT NULL THEN 
            '✅ You can manage your personal special dates'
        ELSE 
            '❌ No special date management permissions'
    END as your_permissions
FROM your_access;

-- 6️⃣ FINAL MESSAGE
SELECT '🎉 RLS POLICIES FIXED! You should now be able to insert, update, and delete holidays.' as status;