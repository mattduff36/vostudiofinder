-- DropForeignKey
ALTER TABLE "refunds" DROP CONSTRAINT "refunds_processed_by_fkey";

-- AlterTable
ALTER TABLE "refunds" ADD COLUMN     "operation_id" TEXT,
ADD COLUMN     "provider_checked_at" TIMESTAMP(3),
ADD COLUMN     "provider_status" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'LEGACY',
ALTER COLUMN "processed_by" DROP NOT NULL;

-- CreateTable
CREATE TABLE "refund_operations" (
    "id" TEXT NOT NULL,
    "request_key" TEXT,
    "payload_hash" TEXT NOT NULL,
    "payment_id" TEXT,
    "user_reference" TEXT NOT NULL,
    "actor_id" TEXT,
    "source" TEXT NOT NULL DEFAULT 'ADMIN',
    "stripe_payment_intent_id" TEXT NOT NULL,
    "stripe_refund_id" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "reason" TEXT,
    "comment" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "money_status" TEXT NOT NULL DEFAULT 'PREPARED',
    "provider_status" TEXT,
    "submitted_at" TIMESTAMP(3),
    "provider_checked_at" TIMESTAMP(3),
    "lease_token" TEXT,
    "lease_expires_at" TIMESTAMP(3),
    "reconciliation_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error_code" TEXT,
    "benefit_action" TEXT,
    "benefit_status" TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
    "benefit_grant_id" TEXT,
    "billing_action" TEXT,
    "billing_status" TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
    "stripe_subscription_id" TEXT,
    "billing_effective_at" TIMESTAMP(3),
    "billing_idempotency_key" TEXT NOT NULL,
    "billing_submitted_at" TIMESTAMP(3),
    "billing_evidence" JSONB,
    "eligibility_snapshot" JSONB,
    "access_review_required" BOOLEAN NOT NULL DEFAULT false,
    "notification_status" TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
    "notification_provider_id" TEXT,
    "notification_submitted_at" TIMESTAMP(3),
    "notification_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_benefit_grants" (
    "id" TEXT NOT NULL,
    "source_key" TEXT NOT NULL,
    "payment_id" TEXT,
    "user_reference" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "subscription_id" TEXT,
    "studio_id" TEXT,
    "stripe_invoice_id" TEXT,
    "stripe_subscription_id" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "mapping_source" TEXT NOT NULL,
    "evidence" JSONB,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_benefit_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refund_operations_request_key_key" ON "refund_operations"("request_key");

-- CreateIndex
CREATE UNIQUE INDEX "refund_operations_stripe_refund_id_key" ON "refund_operations"("stripe_refund_id");

-- CreateIndex
CREATE UNIQUE INDEX "refund_operations_idempotency_key_key" ON "refund_operations"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "refund_operations_billing_idempotency_key_key" ON "refund_operations"("billing_idempotency_key");

-- CreateIndex
CREATE INDEX "refund_operations_payment_id_money_status_idx" ON "refund_operations"("payment_id", "money_status");

-- CreateIndex
CREATE INDEX "refund_operations_money_status_lease_expires_at_idx" ON "refund_operations"("money_status", "lease_expires_at");

-- CreateIndex
CREATE INDEX "refund_operations_billing_status_idx" ON "refund_operations"("billing_status");

-- CreateIndex
CREATE INDEX "refund_operations_notification_status_idx" ON "refund_operations"("notification_status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_benefit_grants_source_key_key" ON "payment_benefit_grants"("source_key");

-- CreateIndex
CREATE INDEX "payment_benefit_grants_payment_id_idx" ON "payment_benefit_grants"("payment_id");

-- CreateIndex
CREATE INDEX "payment_benefit_grants_user_reference_kind_status_idx" ON "payment_benefit_grants"("user_reference", "kind", "status");

-- CreateIndex
CREATE INDEX "payment_benefit_grants_subscription_id_idx" ON "payment_benefit_grants"("subscription_id");

-- CreateIndex
CREATE INDEX "payment_benefit_grants_studio_id_idx" ON "payment_benefit_grants"("studio_id");

-- CreateIndex
CREATE INDEX "payment_benefit_grants_stripe_invoice_id_idx" ON "payment_benefit_grants"("stripe_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_operation_id_key" ON "refunds"("operation_id");

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "refund_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_operations" ADD CONSTRAINT "refund_operations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_operations" ADD CONSTRAINT "refund_operations_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_operations" ADD CONSTRAINT "refund_operations_benefit_grant_id_fkey" FOREIGN KEY ("benefit_grant_id") REFERENCES "payment_benefit_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_benefit_grants" ADD CONSTRAINT "payment_benefit_grants_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_benefit_grants" ADD CONSTRAINT "payment_benefit_grants_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_benefit_grants" ADD CONSTRAINT "payment_benefit_grants_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studio_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Refund-only replay bookkeeping on the existing signed event inbox.
ALTER TABLE "stripe_webhook_events" ADD COLUMN "last_attempt_at" TIMESTAMP(3),
  ADD COLUMN "attempt_count" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "stripe_webhook_events_processed_type_last_attempt_at_idx"
  ON "stripe_webhook_events"("processed", "type", "last_attempt_at");

-- New-table invariants are additive; no historic refund row is reinterpreted here.
ALTER TABLE "refund_operations" ADD CONSTRAINT "refund_operations_positive_amount" CHECK (amount > 0),
  ADD CONSTRAINT "refund_operations_money_status_check" CHECK (money_status IN ('PREPARED','SUBMITTING','UNKNOWN','PENDING','ACTION_REQUIRED','SUCCEEDED','FAILED','CANCELLED','REVIEW')),
  ADD CONSTRAINT "refund_operations_benefit_action_check" CHECK (benefit_action IS NULL OR benefit_action IN ('KEEP','END')),
  ADD CONSTRAINT "refund_operations_billing_action_check" CHECK (billing_action IS NULL OR billing_action IN ('KEEP','CANCEL_AT_PERIOD_END'));
ALTER TABLE "payment_benefit_grants" ADD CONSTRAINT "payment_benefit_grants_interval_check" CHECK (ends_at > starts_at),
  ADD CONSTRAINT "payment_benefit_grants_kind_check" CHECK (kind IN ('PREMIUM','FEATURED')),
  ADD CONSTRAINT "payment_benefit_grants_status_check" CHECK (status IN ('ACTIVE','REVOKED')),
  ADD CONSTRAINT "payment_benefit_grants_mapping_check" CHECK (mapping_source IN ('PURCHASE','OBSERVED_BASELINE'));
