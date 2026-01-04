-- AlterTable
-- Add last_login field to users table
ALTER TABLE "public"."users" ADD COLUMN "last_login" TIMESTAMP(3);

