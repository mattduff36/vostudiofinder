-- CreateEnum
CREATE TYPE "WaitlistType" AS ENUM ('GENERAL', 'FEATURED');

-- AlterTable
ALTER TABLE "waitlist" ADD COLUMN "type" "WaitlistType" NOT NULL DEFAULT 'GENERAL';

-- CreateIndex
CREATE INDEX "waitlist_type_idx" ON "waitlist"("type");

-- CreateIndex (composite unique constraint)
CREATE UNIQUE INDEX "waitlist_email_type_key" ON "waitlist"("email", "type");

-- Add check constraint for featured studios
ALTER TABLE "studio_profiles" 
ADD CONSTRAINT "featured_requires_expiry" 
CHECK (NOT is_featured OR featured_until IS NOT NULL);
