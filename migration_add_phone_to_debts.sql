-- Migration script to add 'phone' column to the 'debts' table
-- Run this script in your Supabase SQL Editor

ALTER TABLE debts 
ADD COLUMN IF NOT EXISTS phone TEXT;
