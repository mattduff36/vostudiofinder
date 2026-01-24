-- Enable 'Enable Messages' (show_email) for all existing profiles
-- Also change the default to true for new profiles
-- 
-- This is a one-time data migration script.
-- Execute via: scripts/production-enable-messages.ts

-- Update all existing profiles to enable messages
UPDATE studio_profiles 
SET show_email = true 
WHERE show_email = false;

-- Change default for new profiles
ALTER TABLE studio_profiles 
ALTER COLUMN show_email SET DEFAULT true;
