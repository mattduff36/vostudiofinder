-- AddFullAddressAndAbbreviatedAddress
-- This migration adds full_address and abbreviated_address fields to studios table
-- and migrates existing address data to both fields

-- Add full_address field
ALTER TABLE "studios" 
  ADD COLUMN IF NOT EXISTS "full_address" TEXT;

-- Add abbreviated_address field
ALTER TABLE "studios" 
  ADD COLUMN IF NOT EXISTS "abbreviated_address" TEXT;

-- Migrate existing address data to both new fields
UPDATE "studios" 
SET 
  "full_address" = "address",
  "abbreviated_address" = "address"
WHERE "address" IS NOT NULL AND "address" != '';

-- Note: The legacy "address" field is kept for backward compatibility
-- but new code should use full_address and abbreviated_address

