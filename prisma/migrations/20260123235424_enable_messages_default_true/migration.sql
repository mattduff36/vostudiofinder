-- AlterTable
-- Change default value of show_email from false to true
-- Also update existing profiles to enable messages

-- Update all existing profiles to enable messages
UPDATE studio_profiles 
SET show_email = true 
WHERE show_email = false;

-- Change default for new profiles
ALTER TABLE studio_profiles 
ALTER COLUMN show_email SET DEFAULT true;
