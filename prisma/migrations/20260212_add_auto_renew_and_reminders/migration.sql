-- AlterTable: Add auto_renew and renewal reminder tracking to users
ALTER TABLE "users" ADD COLUMN "auto_renew" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "renewal_reminder_30_sent_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "renewal_reminder_14_sent_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "renewal_reminder_7_sent_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "renewal_reminder_1_sent_at" TIMESTAMP(3);
