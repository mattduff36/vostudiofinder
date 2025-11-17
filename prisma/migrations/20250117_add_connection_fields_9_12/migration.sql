-- AddConnectionFields9to12
-- This migration adds 4 additional connection type fields to user_profiles table
-- These track which communication methods the studio supports

-- Add connection fields (all optional, defaults to NULL)
ALTER TABLE "user_profiles" 
  ADD COLUMN IF NOT EXISTS "connection9" VARCHAR(10),  -- ipDTL
  ADD COLUMN IF NOT EXISTS "connection10" VARCHAR(10), -- SquadCast
  ADD COLUMN IF NOT EXISTS "connection11" VARCHAR(10), -- Zencastr
  ADD COLUMN IF NOT EXISTS "connection12" VARCHAR(10); -- Other (See profile)

-- Note: We use VARCHAR(10) to store '0' (disabled) or '1' (enabled)
-- NULL means not set yet, '0' means explicitly disabled, '1' means enabled

