-- CreateEnum: UserStatus
-- This enum tracks the user account status in the username reservation system
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED');

-- AlterTable: users
-- Add username reservation and payment tracking fields

-- Add the status column with default PENDING
ALTER TABLE "users" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'PENDING';

-- Add reservation expiry timestamp (NULL for users without active reservation)
ALTER TABLE "users" ADD COLUMN "reservation_expires_at" TIMESTAMP(3);

-- Add payment attempt tracking (NULL if payment hasn't been attempted yet)
ALTER TABLE "users" ADD COLUMN "payment_attempted_at" TIMESTAMP(3);

-- Add payment retry counter (tracks number of failed payment attempts)
ALTER TABLE "users" ADD COLUMN "payment_retry_count" INTEGER NOT NULL DEFAULT 0;

-- Create index on status for efficient querying of PENDING/EXPIRED users
CREATE INDEX "users_status_idx" ON "users"("status");

-- Create index on reservation_expires_at for cron job efficiency
CREATE INDEX "users_reservation_expires_at_idx" ON "users"("reservation_expires_at");

-- IMPORTANT: Update existing users to ACTIVE status
-- All current users have already completed payment and signup, so they should be ACTIVE
UPDATE "users" SET "status" = 'ACTIVE' WHERE "status" = 'PENDING';

-- Add comment explaining the new fields
COMMENT ON COLUMN "users"."status" IS 'User account status: PENDING (awaiting payment), ACTIVE (paid member), EXPIRED (reservation expired)';
COMMENT ON COLUMN "users"."reservation_expires_at" IS 'Timestamp when username reservation expires (7 days from signup)';
COMMENT ON COLUMN "users"."payment_attempted_at" IS 'Timestamp of first payment attempt (success or failure)';
COMMENT ON COLUMN "users"."payment_retry_count" IS 'Number of payment attempts (incremented on each failure)';

