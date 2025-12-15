-- ============================================
-- ROLLBACK SCRIPT - Emergency use only
-- ============================================
-- This script recreates studios and user_profiles from studio_profiles
-- Use ONLY if critical issues discovered after migration
-- ============================================

SELECT '=== STARTING ROLLBACK ===' as info;
SELECT 'WARNING: This will restore the old schema from studio_profiles data' as warning;

-- Step 1: Recreate user_profiles table
SELECT '=== RECREATING user_profiles TABLE ===' as info;

CREATE TABLE user_profiles_restored AS 
SELECT 
  gen_random_uuid()::text as id,
  user_id,
  last_name,
  phone,
  about,
  short_about,
  location,
  rate_tier_1,
  rate_tier_2,
  rate_tier_3,
  show_rates,
  facebook_url,
  twitter_url,
  x_url,
  linkedin_url,
  instagram_url,
  tiktok_url,
  threads_url,
  youtube_url,
  vimeo_url,
  soundcloud_url,
  is_crb_checked,
  is_featured,
  is_spotlight,
  verification_level,
  home_studio_description,
  equipment_list,
  services_offered,
  show_email,
  show_phone,
  show_address,
  show_directions,
  use_coordinates_for_map,
  created_at,
  updated_at,
  name as studio_name, -- Studio name goes back to user_profiles
  connection1,
  connection2,
  connection3,
  connection4,
  connection5,
  connection6,
  connection7,
  connection8,
  connection9,
  connection10,
  connection11,
  connection12,
  custom_connection_methods
FROM studio_profiles;

SELECT '✅ user_profiles_restored created' as status, COUNT(*) as records
FROM user_profiles_restored;

-- Step 2: Recreate studios table
SELECT '=== RECREATING studios TABLE ===' as info;

CREATE TABLE studios_restored AS
SELECT 
  id,
  user_id as owner_id,
  name,
  description,
  NULL::text as address, -- Legacy field, set to NULL
  full_address,
  abbreviated_address,
  city,
  latitude,
  longitude,
  website_url,
  phone,
  is_premium,
  is_verified,
  is_profile_visible,
  status,
  created_at,
  updated_at
FROM studio_profiles;

SELECT '✅ studios_restored created' as status, COUNT(*) as records
FROM studios_restored;

-- Step 3: Drop old tables and rename
SELECT '=== SWAPPING TABLES ===' as info;

DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS studios CASCADE;

ALTER TABLE user_profiles_restored RENAME TO user_profiles;
ALTER TABLE studios_restored RENAME TO studios;

-- Step 4: Restore constraints
SELECT '=== RESTORING CONSTRAINTS ===' as info;

-- user_profiles constraints
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);
ALTER TABLE user_profiles 
  ADD CONSTRAINT user_profiles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- studios constraints
ALTER TABLE studios ADD CONSTRAINT studios_pkey PRIMARY KEY (id);
ALTER TABLE studios 
  ADD CONSTRAINT studios_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 5: Restore foreign keys in related tables
SELECT '=== RESTORING RELATED TABLE FOREIGN KEYS ===' as info;

ALTER TABLE studio_images 
  DROP CONSTRAINT IF EXISTS studio_images_studio_profile_id_fkey,
  ADD CONSTRAINT studio_images_studio_id_fkey 
    FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE;

ALTER TABLE studio_services 
  DROP CONSTRAINT IF EXISTS studio_services_studio_profile_id_fkey,
  ADD CONSTRAINT studio_services_studio_id_fkey 
    FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE;

ALTER TABLE studio_studio_types 
  DROP CONSTRAINT IF EXISTS studio_studio_types_studio_profile_id_fkey,
  ADD CONSTRAINT studio_studio_types_studio_id_fkey 
    FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE;

ALTER TABLE reviews 
  DROP CONSTRAINT IF EXISTS reviews_studio_profile_id_fkey,
  ADD CONSTRAINT reviews_studio_id_fkey 
    FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE;

ALTER TABLE pending_subscriptions 
  DROP CONSTRAINT IF EXISTS pending_subscriptions_studio_profile_id_fkey,
  ADD CONSTRAINT pending_subscriptions_studio_id_fkey 
    FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE;

-- Step 6: Recreate indices
SELECT '=== RECREATING INDICES ===' as info;

CREATE INDEX IF NOT EXISTS idx_user_profiles_is_featured ON user_profiles(is_featured);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_spotlight ON user_profiles(is_spotlight);
CREATE INDEX IF NOT EXISTS idx_user_profiles_verification_level ON user_profiles(verification_level);

CREATE INDEX IF NOT EXISTS idx_studios_owner_id ON studios(owner_id);
CREATE INDEX IF NOT EXISTS idx_studios_city ON studios(city);
CREATE INDEX IF NOT EXISTS idx_studios_status ON studios(status);
CREATE INDEX IF NOT EXISTS idx_studios_is_premium ON studios(is_premium);
CREATE INDEX IF NOT EXISTS idx_studios_is_verified ON studios(is_verified);

-- Step 7: Drop studio_profiles
SELECT '=== REMOVING studio_profiles TABLE ===' as info;

DROP TABLE IF EXISTS studio_profiles CASCADE;

-- Step 8: Verification
SELECT '=== ROLLBACK VERIFICATION ===' as info;

SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL
SELECT 'studios', COUNT(*) FROM studios;

SELECT '✅ ROLLBACK COMPLETE' as status;
SELECT 'Old schema restored - you must also revert code changes!' as important_note;

