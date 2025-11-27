-- AddFullAddressAndAbbreviatedAddress
-- This migration adds full_address and abbreviated_address fields to studios table
-- IMPORTANT: This migration does NOT copy data to prevent overwriting existing values

-- Add full_address field
ALTER TABLE "studios" 
  ADD COLUMN IF NOT EXISTS "full_address" TEXT;

-- Add abbreviated_address field
ALTER TABLE "studios" 
  ADD COLUMN IF NOT EXISTS "abbreviated_address" TEXT;

-- REMOVED: Data migration to prevent overwriting existing full_address values
-- Original migration incorrectly copied "address" field over existing full_address data
-- Data should be migrated manually using dedicated scripts if needed

-- Note: The legacy "address" field is kept for backward compatibility
-- but new code should use full_address and abbreviated_address

