-- Disable exact location for all users
-- This sets show_exact_location to '0' for all profiles
UPDATE profiles
SET show_exact_location = '0'
WHERE show_exact_location = '1' OR show_exact_location IS NULL;

-- Verify the update
SELECT 
  COUNT(*) as total_profiles,
  SUM(CASE WHEN show_exact_location = '1' THEN 1 ELSE 0 END) as exact_location_on,
  SUM(CASE WHEN show_exact_location = '0' THEN 1 ELSE 0 END) as exact_location_off
FROM profiles;
