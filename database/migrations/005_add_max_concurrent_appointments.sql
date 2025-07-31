-- Migration: Add max_concurrent_appointments to barbershops
-- Version: 005
-- Date: 2025-01-30
-- Description: Adds max_concurrent_appointments column to barbershops table

-- Add column to barbershops table
ALTER TABLE barbershops
ADD COLUMN IF NOT EXISTS max_concurrent_appointments INTEGER DEFAULT 1
CONSTRAINT max_concurrent_positive CHECK (max_concurrent_appointments > 0);

-- Add comment
COMMENT ON COLUMN barbershops.max_concurrent_appointments IS 'Maximum number of appointments that can be scheduled at the same time slot';