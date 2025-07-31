-- Quick Fix for Holiday Duplicates Error
-- Run this in Supabase SQL Editor to fix the PGRST116 error

-- Step 1: Check for duplicates (informational)
SELECT barbershop_id, date, COUNT(*) as duplicate_count
FROM special_dates
WHERE barbershop_id IS NOT NULL
GROUP BY barbershop_id, date
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, date DESC;

-- Step 2: Remove duplicates, keeping the most recently created one
DELETE FROM special_dates
WHERE id NOT IN (
    SELECT DISTINCT ON (barbershop_id, date) id
    FROM special_dates
    WHERE barbershop_id IS NOT NULL
    ORDER BY barbershop_id, date, created_at DESC
)
AND barbershop_id IS NOT NULL;

-- Step 3: Add unique constraints to prevent future duplicates
ALTER TABLE special_dates 
ADD CONSTRAINT unique_barbershop_date 
UNIQUE (barbershop_id, date) 
WHERE barbershop_id IS NOT NULL;

ALTER TABLE special_dates 
ADD CONSTRAINT unique_barber_date 
UNIQUE (barber_id, date) 
WHERE barber_id IS NOT NULL;

-- Step 4: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_special_dates_barbershop_date 
ON special_dates(barbershop_id, date) 
WHERE barbershop_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_special_dates_barber_date 
ON special_dates(barber_id, date) 
WHERE barber_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_special_dates_date 
ON special_dates(date);

-- Step 5: Verify the fix
SELECT 'Constraints created successfully' as status
WHERE EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_barbershop_date'
);