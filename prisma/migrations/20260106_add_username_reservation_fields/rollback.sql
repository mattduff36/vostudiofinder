-- Rollback script for username reservation fields migration
-- WARNING: This will permanently delete all username reservation data!
-- Only use this if you need to undo the migration completely.

-- Drop the indexes
DROP INDEX IF EXISTS "users_reservation_expires_at_idx";
DROP INDEX IF EXISTS "users_status_idx";

-- Drop the columns
ALTER TABLE "users" DROP COLUMN IF EXISTS "day5_reminder_sent_at";
ALTER TABLE "users" DROP COLUMN IF EXISTS "day2_reminder_sent_at";
ALTER TABLE "users" DROP COLUMN IF EXISTS "payment_retry_count";
ALTER TABLE "users" DROP COLUMN IF EXISTS "payment_attempted_at";
ALTER TABLE "users" DROP COLUMN IF EXISTS "reservation_expires_at";
ALTER TABLE "users" DROP COLUMN IF EXISTS "status";

-- Drop the enum type
DROP TYPE IF EXISTS "UserStatus";

