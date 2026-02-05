-- CreateEnum: MembershipTier
CREATE TYPE "MembershipTier" AS ENUM ('BASIC', 'PREMIUM');

-- AlterTable: Add membership_tier to users with BASIC default
ALTER TABLE "users" ADD COLUMN "membership_tier" "MembershipTier" NOT NULL DEFAULT 'BASIC';

-- Data Migration: Set existing users with an active subscription to PREMIUM
-- Any user who has at least one ACTIVE subscription with a future expiry date is Premium.
-- Admin accounts are also set to PREMIUM.
UPDATE "users"
SET "membership_tier" = 'PREMIUM'
WHERE "id" IN (
  SELECT DISTINCT u."id"
  FROM "users" u
  LEFT JOIN "subscriptions" s ON s."user_id" = u."id"
  WHERE
    u."role" = 'ADMIN'
    OR (
      s."status" = 'ACTIVE'
      AND s."current_period_end" IS NOT NULL
      AND s."current_period_end" > NOW()
    )
);

-- CreateIndex: for quick tier-based queries
CREATE INDEX "users_membership_tier_idx" ON "users"("membership_tier");
