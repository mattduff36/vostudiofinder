-- AddCustomConnectionMethods
-- This migration adds a JSON field to store custom connection methods
-- Each user can add up to 2 custom connection method names

-- Add custom_connection_methods field (stores array of strings)
ALTER TABLE "user_profiles" 
  ADD COLUMN IF NOT EXISTS "custom_connection_methods" TEXT[];

-- Create index for faster queries on custom connection methods
CREATE INDEX IF NOT EXISTS "idx_custom_connection_methods" ON "user_profiles" USING GIN ("custom_connection_methods");

-- Note: This field stores an array of custom connection method names
-- Example: ['Discord', 'WhatsApp'] or ['Slack'] or [] (empty array)

