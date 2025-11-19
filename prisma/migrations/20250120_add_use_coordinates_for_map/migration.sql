-- Add use_coordinates_for_map field to user_profiles table
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "use_coordinates_for_map" BOOLEAN DEFAULT false;

