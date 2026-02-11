-- AlterTable
ALTER TABLE "studio_profiles" ADD COLUMN "image_rights_confirmed_at" TIMESTAMP(3);
ALTER TABLE "studio_profiles" ADD COLUMN "image_rights_confirmed_text" TEXT;
ALTER TABLE "studio_profiles" ADD COLUMN "image_rights_confirmed_ip" VARCHAR(45);
