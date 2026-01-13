-- AlterEnum
-- Replace EDITING with AUDIO_PRODUCER in StudioType enum

-- Step 1: Create the new enum with AUDIO_PRODUCER instead of EDITING
ALTER TYPE "StudioType" RENAME TO "StudioType_old";
CREATE TYPE "StudioType" AS ENUM ('HOME', 'RECORDING', 'VO_COACH', 'AUDIO_PRODUCER', 'PODCAST', 'VOICEOVER');

-- Step 2: Update the column to use the new enum, converting EDITING to AUDIO_PRODUCER
ALTER TABLE "studio_studio_types" 
  ALTER COLUMN "studio_type" TYPE "StudioType" 
  USING (
    CASE 
      WHEN "studio_type"::text = 'EDITING' THEN 'AUDIO_PRODUCER'::"StudioType"
      ELSE "studio_type"::text::"StudioType"
    END
  );

-- Step 3: Drop the old enum
DROP TYPE "StudioType_old";
