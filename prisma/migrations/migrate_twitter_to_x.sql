-- Migrate existing twitter_url data to x_url
-- This ensures backward compatibility and preserves existing data

UPDATE user_profiles 
SET x_url = twitter_url 
WHERE twitter_url IS NOT NULL 
  AND (x_url IS NULL OR x_url = '');

-- Verify the migration
-- SELECT 
--   COUNT(*) as total_migrated,
--   COUNT(DISTINCT user_id) as unique_users
-- FROM user_profiles 
-- WHERE x_url IS NOT NULL;

