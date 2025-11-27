-- Add city field to studios table
-- This field will store the city name extracted from full_address
ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "city" TEXT NOT NULL DEFAULT '';

-- Note: A separate migration script will populate this field for existing studios

