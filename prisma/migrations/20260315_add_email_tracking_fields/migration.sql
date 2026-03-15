-- Add email open/click tracking fields to email_deliveries
ALTER TABLE "email_deliveries" ADD COLUMN "opened_at" TIMESTAMP(3);
ALTER TABLE "email_deliveries" ADD COLUMN "clicked_at" TIMESTAMP(3);
ALTER TABLE "email_deliveries" ADD COLUMN "clicked_link" TEXT;

-- Add index on resend_id for webhook lookups
CREATE INDEX "email_deliveries_resend_id_idx" ON "email_deliveries"("resend_id");
