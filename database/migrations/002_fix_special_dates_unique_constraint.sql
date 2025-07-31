-- Migration: Fix special_dates unique constraint
-- Version: 002
-- Date: 2025-01-30
-- Description: Adds unique constraint to prevent duplicate holidays for the same barbershop and date

-- =====================================================
-- STEP 1: Clean up existing duplicates
-- =====================================================

-- First, let's see if there are any duplicates
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT barbershop_id, date, COUNT(*) as count
        FROM special_dates
        WHERE barbershop_id IS NOT NULL
        GROUP BY barbershop_id, date
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE NOTICE 'Found % duplicate holiday entries. Cleaning up...', duplicate_count;
        
        -- Remove duplicates, keeping the most recently created one
        DELETE FROM special_dates
        WHERE id NOT IN (
            SELECT DISTINCT ON (barbershop_id, date) id
            FROM special_dates
            WHERE barbershop_id IS NOT NULL
            ORDER BY barbershop_id, date, created_at DESC
        )
        AND barbershop_id IS NOT NULL;
        
        RAISE NOTICE 'Duplicates removed successfully.';
    ELSE
        RAISE NOTICE 'No duplicate holidays found.';
    END IF;
END $$;

-- =====================================================
-- STEP 2: Add unique constraint
-- =====================================================

-- Add unique constraint for barbershop holidays
ALTER TABLE special_dates 
ADD CONSTRAINT unique_barbershop_date 
UNIQUE (barbershop_id, date) 
WHERE barbershop_id IS NOT NULL;

-- Add unique constraint for barber-specific dates
ALTER TABLE special_dates 
ADD CONSTRAINT unique_barber_date 
UNIQUE (barber_id, date) 
WHERE barber_id IS NOT NULL;

-- =====================================================
-- STEP 3: Add helpful indexes
-- =====================================================

-- Index for faster lookups by barbershop and date
CREATE INDEX IF NOT EXISTS idx_special_dates_barbershop_date 
ON special_dates(barbershop_id, date) 
WHERE barbershop_id IS NOT NULL;

-- Index for faster lookups by barber and date
CREATE INDEX IF NOT EXISTS idx_special_dates_barber_date 
ON special_dates(barber_id, date) 
WHERE barber_id IS NOT NULL;

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_special_dates_date 
ON special_dates(date);

-- =====================================================
-- STEP 4: Add comments for documentation
-- =====================================================

COMMENT ON CONSTRAINT unique_barbershop_date ON special_dates IS 
'Ensures only one holiday entry per barbershop per date';

COMMENT ON CONSTRAINT unique_barber_date ON special_dates IS 
'Ensures only one special date entry per barber per date';

-- =====================================================
-- STEP 5: Create helper function for upsert operations
-- =====================================================

-- Function to safely upsert a special date
CREATE OR REPLACE FUNCTION upsert_special_date(
    p_barbershop_id UUID,
    p_barber_id UUID,
    p_date DATE,
    p_is_holiday BOOLEAN,
    p_custom_hours JSONB,
    p_reason TEXT
)
RETURNS special_dates AS $$
DECLARE
    v_result special_dates;
BEGIN
    -- Validate that either barbershop_id or barber_id is provided, but not both
    IF (p_barbershop_id IS NULL AND p_barber_id IS NULL) OR 
       (p_barbershop_id IS NOT NULL AND p_barber_id IS NOT NULL) THEN
        RAISE EXCEPTION 'Either barbershop_id or barber_id must be provided, but not both';
    END IF;
    
    -- Try to update first
    IF p_barbershop_id IS NOT NULL THEN
        UPDATE special_dates
        SET 
            is_holiday = p_is_holiday,
            custom_hours = p_custom_hours,
            reason = p_reason
        WHERE barbershop_id = p_barbershop_id AND date = p_date
        RETURNING * INTO v_result;
    ELSE
        UPDATE special_dates
        SET 
            is_holiday = p_is_holiday,
            custom_hours = p_custom_hours,
            reason = p_reason
        WHERE barber_id = p_barber_id AND date = p_date
        RETURNING * INTO v_result;
    END IF;
    
    -- If no rows were updated, insert a new one
    IF v_result.id IS NULL THEN
        INSERT INTO special_dates (
            barbershop_id,
            barber_id,
            date,
            is_holiday,
            custom_hours,
            reason
        ) VALUES (
            p_barbershop_id,
            p_barber_id,
            p_date,
            p_is_holiday,
            p_custom_hours,
            p_reason
        )
        RETURNING * INTO v_result;
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION upsert_special_date IS 
'Safely creates or updates a special date entry, avoiding duplicate key violations';

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- Run this query to verify the migration worked correctly
DO $$
DECLARE
    constraint_exists BOOLEAN;
    index_count INTEGER;
BEGIN
    -- Check if constraints exist
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_barbershop_date'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE 'Success: unique_barbershop_date constraint created';
    ELSE
        RAISE WARNING 'Failed: unique_barbershop_date constraint not found';
    END IF;
    
    -- Check indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE tablename = 'special_dates'
    AND indexname IN (
        'idx_special_dates_barbershop_date',
        'idx_special_dates_barber_date',
        'idx_special_dates_date'
    );
    
    RAISE NOTICE 'Created % indexes on special_dates table', index_count;
END $$;