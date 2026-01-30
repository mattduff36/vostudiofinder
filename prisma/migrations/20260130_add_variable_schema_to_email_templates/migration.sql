-- Add missing variable_schema column to email_templates table
ALTER TABLE "email_templates" ADD COLUMN "variable_schema" JSONB NOT NULL DEFAULT '{}'::JSONB;

-- Add missing from_name and from_email to email_template_versions
ALTER TABLE "email_template_versions" ADD COLUMN IF NOT EXISTS "from_name" TEXT;
ALTER TABLE "email_template_versions" ADD COLUMN IF NOT EXISTS "from_email" TEXT;
ALTER TABLE "email_template_versions" ADD COLUMN IF NOT EXISTS "reply_to_email" TEXT;
