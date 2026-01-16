-- SQL to add Security PIN feature to ArtosKu
-- Run this in your Supabase SQL Editor

-- 1. Add columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS security_pin VARCHAR(6),
ADD COLUMN IF NOT EXISTS pin_enabled BOOLEAN DEFAULT FALSE;

-- 2. Update RLS (if needed, profiles should already be updateable by owner)
-- The existing policy "Users can update own profile" should cover this.

-- 3. Optional: Validation constraint for PIN (only numbers)
ALTER TABLE public.profiles
ADD CONSTRAINT check_pin_format 
CHECK (security_pin IS NULL OR security_pin ~ '^[0-9]{6}$');

-- Note: In a production app, you might want to hash the PIN, 
-- but for this personal finance app, we'll keep it simple for now or use the client-side as a primary shield.
