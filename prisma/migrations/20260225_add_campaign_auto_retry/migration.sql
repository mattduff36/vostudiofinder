-- Add auto-retry fields to email_campaigns
ALTER TABLE "email_campaigns" ADD COLUMN "auto_retry" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "email_campaigns" ADD COLUMN "retry_after" TIMESTAMP(3);
