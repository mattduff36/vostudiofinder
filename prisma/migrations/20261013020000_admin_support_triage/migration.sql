-- Additive only. No historical status is inferred to be a manual decision.
-- No foreign keys to disposable source records: retain outcome/triage evidence.
CREATE TABLE "support_reply_operations" (
  "id" TEXT PRIMARY KEY,
  "ticket_id" TEXT NOT NULL,
  "ticket_user_id" TEXT NOT NULL,
  "actor_id" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "payload_hash" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "requested_status" "SupportTicketStatus",
  "ticket_version" TIMESTAMP(3) NOT NULL,
  "provider_key" TEXT NOT NULL,
  "provider_status" TEXT NOT NULL DEFAULT 'PREPARED',
  "provider_message_id" TEXT,
  "status_result" TEXT NOT NULL DEFAULT 'PENDING',
  "error_code" TEXT,
  "first_attempt_at" TIMESTAMP(3),
  "lease_until" TIMESTAMP(3),
  "accepted_at" TIMESTAMP(3),
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "support_reply_provider_state" CHECK ("provider_status" IN ('PREPARED', 'SUBMITTING', 'ACCEPTED', 'REJECTED', 'UNKNOWN', 'REVIEW_REQUIRED')),
  CONSTRAINT "support_reply_status_state" CHECK ("status_result" IN ('PENDING', 'NOT_REQUESTED', 'APPLIED', 'CONFLICT', 'FAILED', 'TICKET_MISSING'))
);
CREATE UNIQUE INDEX "support_reply_operations_provider_key_key" ON "support_reply_operations" ("provider_key");
CREATE INDEX "support_reply_operations_ticket_id_created_at_idx" ON "support_reply_operations" ("ticket_id", "created_at");
CREATE INDEX "support_reply_operations_actor_id_created_at_idx" ON "support_reply_operations" ("actor_id", "created_at");
CREATE INDEX "support_reply_operations_provider_status_lease_until_idx" ON "support_reply_operations" ("provider_status", "lease_until");
CREATE TABLE "error_log_triage" (
  "sentry_issue_id" TEXT PRIMARY KEY,
  "local_status" "ErrorLogStatus" NOT NULL,
  "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deciding_admin_id" TEXT NOT NULL
);
CREATE INDEX "error_log_triage_local_status_idx" ON "error_log_triage" ("local_status");
