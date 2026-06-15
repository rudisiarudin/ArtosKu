-- Migration to add security columns to profiles table

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS security_pin TEXT,
ADD COLUMN IF NOT EXISTS pin_enabled BOOLEAN DEFAULT FALSE;

-- Optional: Update RLS policies if necessary (usually existing update policy covers it if columns are added)
-- Ensure 'security_pin' is protected if it wasn't already (RLS policies are row-based, so generally fine)
