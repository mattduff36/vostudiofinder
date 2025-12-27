-- Add password reset fields to users table
-- These fields enable the forgot password functionality
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_token" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_token_expiry" TIMESTAMP(3);

-- Add index for faster token lookups
CREATE INDEX IF NOT EXISTS "users_reset_token_idx" ON "users"("reset_token");








