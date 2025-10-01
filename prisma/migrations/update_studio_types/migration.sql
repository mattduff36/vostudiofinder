-- Safe migration to rename existing StudioType enum values
-- This preserves all existing data in the database

-- Step 1: Create a temporary new enum with the new names
CREATE TYPE "StudioType_new" AS ENUM ('HOME', 'RECORDING', 'VO_COACH', 'EDITING', 'PODCAST', 'VOICEOVER');

-- Step 2: Update the studio_studio_types table to use the new enum
-- Map old values to new values:
-- VOICEOVER -> VOICEOVER (no change)
-- RECORDING -> RECORDING (no change)
-- PODCAST -> PODCAST (no change)
-- PRODUCTION -> EDITING (renamed)
-- MOBILE -> VO_COACH (renamed)
-- HOME -> HOME (no change)

ALTER TABLE "studio_studio_types" 
  ALTER COLUMN "studio_type" TYPE "StudioType_new" 
  USING (
    CASE "studio_type"::text
      WHEN 'VOICEOVER' THEN 'VOICEOVER'
      WHEN 'RECORDING' THEN 'RECORDING'
      WHEN 'PODCAST' THEN 'PODCAST'
      WHEN 'PRODUCTION' THEN 'EDITING'
      WHEN 'MOBILE' THEN 'VO_COACH'
      WHEN 'HOME' THEN 'HOME'
      ELSE 'HOME'
    END::"StudioType_new"
  );

-- Step 3: Drop the old enum and rename the new one
DROP TYPE "StudioType";
ALTER TYPE "StudioType_new" RENAME TO "StudioType";

