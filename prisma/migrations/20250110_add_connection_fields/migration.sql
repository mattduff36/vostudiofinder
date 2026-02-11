-- AddConnectionFields
-- This migration adds 8 connection type fields to user_profiles table
-- These track which communication methods the studio supports

-- Add connection fields (all optional, defaults to NULL)
ALTER TABLE "user_profiles" 
  ADD COLUMN IF NOT EXISTS "connection1" VARCHAR(10), -- Source Connect
  ADD COLUMN IF NOT EXISTS "connection2" VARCHAR(10), -- Source Connect Nexus
  ADD COLUMN IF NOT EXISTS "connection3" VARCHAR(10), -- Phone Patch
  ADD COLUMN IF NOT EXISTS "connection4" VARCHAR(10), -- Session Link Pro
  ADD COLUMN IF NOT EXISTS "connection5" VARCHAR(10), -- Zoom or Teams
  ADD COLUMN IF NOT EXISTS "connection6" VARCHAR(10), -- Cleanfeed
  ADD COLUMN IF NOT EXISTS "connection7" VARCHAR(10), -- Riverside
  ADD COLUMN IF NOT EXISTS "connection8" VARCHAR(10); -- Google Hangouts

-- Note: We use VARCHAR(10) to store '0' (disabled) or '1' (enabled)
-- NULL means not set yet, '0' means explicitly disabled, '1' means enabled

