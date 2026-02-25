-- Add retry limit and counter to email_campaigns
ALTER TABLE "email_campaigns" ADD COLUMN "max_retries" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "email_campaigns" ADD COLUMN "retry_count" INTEGER NOT NULL DEFAULT 0;
