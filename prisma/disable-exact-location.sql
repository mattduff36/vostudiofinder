-- Disable exact location for all users
-- This sets show_exact_location to false for all studio_profiles
UPDATE studio_profiles
SET show_exact_location = false
WHERE show_exact_location = true;

-- Verify the update
SELECT 
  COUNT(*) as total_profiles,
  SUM(CASE WHEN show_exact_location = true THEN 1 ELSE 0 END) as exact_location_on,
  SUM(CASE WHEN show_exact_location = false THEN 1 ELSE 0 END) as exact_location_off
FROM studio_profiles;
