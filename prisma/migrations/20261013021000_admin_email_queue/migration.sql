-- Expand-only email queue migration. Pause campaign starts/workers during rollout.
-- Deliberately do not infer snapshots/normalised keys for historical campaigns.
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'SKIPPED';
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'UNCERTAIN';

ALTER TABLE "email_templates" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
-- Use the existing monotonic history without inventing missing versions.
UPDATE "email_templates" t SET "revision" = GREATEST(1, v.latest)
FROM (SELECT template_id, MAX(version_number) AS latest FROM "email_template_versions" GROUP BY template_id) v
WHERE t.id = v.template_id;
ALTER TABLE "email_template_versions" ADD COLUMN "snapshot" JSONB;
ALTER TABLE "email_campaigns"
  ADD COLUMN "creation_request_key" TEXT,
  ADD COLUMN "creation_payload_hash" TEXT,
  ADD COLUMN "template_snapshot" JSONB,
  ADD COLUMN "template_revision" INTEGER,
  ADD COLUMN "audience_fingerprint" TEXT,
  ADD COLUMN "queue_version" INTEGER;
CREATE UNIQUE INDEX "email_campaigns_creation_request_key_key" ON "email_campaigns"("creation_request_key");

ALTER TABLE "email_deliveries"
  ADD COLUMN "reviewed_user_id" TEXT,
  ADD COLUMN "normalized_recipient" TEXT,
  ADD COLUMN "lease_token" TEXT,
  ADD COLUMN "lease_expires_at" TIMESTAMP(3),
  ADD COLUMN "attempt_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "next_attempt_at" TIMESTAMP(3),
  ADD COLUMN "submission_key" TEXT,
  ADD COLUMN "submission_payload" JSONB,
  ADD COLUMN "submission_payload_hash" TEXT,
  ADD COLUMN "first_submission_at" TIMESTAMP(3),
  ADD COLUMN "outcome_reason" TEXT,
  ADD COLUMN "retryable" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "email_deliveries_submission_key_key" ON "email_deliveries"("submission_key");
CREATE UNIQUE INDEX "email_deliveries_campaign_id_normalized_recipient_key" ON "email_deliveries"("campaign_id", "normalized_recipient");
CREATE INDEX "email_deliveries_status_next_attempt_at_idx" ON "email_deliveries"("status", "next_attempt_at");
CREATE INDEX "email_deliveries_lease_expires_at_idx" ON "email_deliveries"("lease_expires_at");
