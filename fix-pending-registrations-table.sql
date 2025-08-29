-- Fix pending_registrations table - Add missing columns
-- Run this in Supabase SQL Editor

-- Add missing field and course columns
ALTER TABLE pending_registrations 
ADD COLUMN IF NOT EXISTS field TEXT,
ADD COLUMN IF NOT EXISTS course TEXT;

-- Add phone column if it doesn't exist (API uses 'phone' not 'mobile_number')
ALTER TABLE pending_registrations 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update any existing records to have proper status
UPDATE pending_registrations 
SET status = 'pending' 
WHERE status = 'pending_approval';

-- Add comments for documentation
COMMENT ON COLUMN pending_registrations.field IS 'Field of study (B.E/B.Tech, BCA, MCA, etc.)';
COMMENT ON COLUMN pending_registrations.course IS 'Specific course within the field (CSE, IT, etc.)';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pending_registrations_field ON pending_registrations(field);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_course ON pending_registrations(course);

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'pending_registrations' 
ORDER BY ordinal_position;
