-- ============================================
-- MIGRATION: Merge user_profiles + studios → studio_profiles
-- ============================================
-- This script:
-- 1. Creates new unified studio_profiles table
-- 2. Migrates data from both user_profiles and studios
-- 3. Updates foreign keys in related tables
-- 4. Creates performance indices
-- 5. Runs verification queries
-- ============================================

-- Step 1: Create new unified table
SELECT '=== CREATING studio_profiles TABLE ===' as info;

CREATE TABLE studio_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  
  -- Studio identity (from studios table)
  name TEXT NOT NULL,
  description TEXT,
  
  -- Extended bio (from user_profiles)
  short_about TEXT,
  about TEXT,
  
  -- Location data (merged from both)
  full_address TEXT,
  abbreviated_address TEXT,
  city TEXT NOT NULL DEFAULT '',
  location TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  
  -- Contact info (merged from both)
  phone TEXT,
  website_url TEXT,
  show_email BOOLEAN DEFAULT false,
  show_phone BOOLEAN DEFAULT false,
  show_address BOOLEAN DEFAULT false,
  show_directions BOOLEAN DEFAULT false,
  
  -- Professional details (from user_profiles)
  equipment_list TEXT,
  services_offered TEXT,
  home_studio_description TEXT,
  last_name TEXT,
  
  -- Pricing (from user_profiles)
  rate_tier_1 TEXT,
  rate_tier_2 TEXT,
  rate_tier_3 TEXT,
  show_rates BOOLEAN DEFAULT false,
  
  -- Social media (from user_profiles)
  facebook_url TEXT,
  twitter_url TEXT,
  x_url TEXT,
  linkedin_url TEXT,
  instagram_url TEXT,
  tiktok_url TEXT,
  threads_url TEXT,
  youtube_url TEXT,
  vimeo_url TEXT,
  soundcloud_url TEXT,
  
  -- Connection methods (from user_profiles)
  connection1 VARCHAR(10),
  connection2 VARCHAR(10),
  connection3 VARCHAR(10),
  connection4 VARCHAR(10),
  connection5 VARCHAR(10),
  connection6 VARCHAR(10),
  connection7 VARCHAR(10),
  connection8 VARCHAR(10),
  connection9 VARCHAR(10),
  connection10 VARCHAR(10),
  connection11 VARCHAR(10),
  connection12 VARCHAR(10),
  custom_connection_methods TEXT[],
  
  -- Status & visibility (from studios)
  status TEXT DEFAULT 'ACTIVE',
  is_premium BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  is_profile_visible BOOLEAN DEFAULT true,
  
  -- Features & verification (from user_profiles)
  is_featured BOOLEAN DEFAULT false,
  is_spotlight BOOLEAN DEFAULT false,
  is_crb_checked BOOLEAN DEFAULT false,
  verification_level TEXT DEFAULT 'none',
  use_coordinates_for_map BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Foreign key
  CONSTRAINT fk_studio_profiles_user FOREIGN KEY (user_id) 
    REFERENCES users(id) ON DELETE CASCADE
);

SELECT '✅ studio_profiles table created' as status;

-- Step 2: Migrate data from both tables
SELECT '=== MIGRATING DATA ===' as info;

INSERT INTO studio_profiles (
  id,
  user_id,
  name,
  description,
  short_about,
  about,
  full_address,
  abbreviated_address,
  city,
  location,
  latitude,
  longitude,
  phone,
  website_url,
  show_email,
  show_phone,
  show_address,
  show_directions,
  equipment_list,
  services_offered,
  home_studio_description,
  last_name,
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
  custom_connection_methods,
  status,
  is_premium,
  is_verified,
  is_profile_visible,
  is_featured,
  is_spotlight,
  is_crb_checked,
  verification_level,
  use_coordinates_for_map,
  created_at,
  updated_at
)
SELECT 
  s.id,
  s.owner_id,
  s.name,
  s.description,
  up.short_about,
  up.about,
  s.full_address,
  s.abbreviated_address,
  s.city,
  up.location,
  s.latitude,
  s.longitude,
  COALESCE(s.phone, up.phone), -- Prefer studio phone, fallback to profile
  s.website_url,
  up.show_email,
  up.show_phone,
  up.show_address,
  up.show_directions,
  up.equipment_list,
  up.services_offered,
  up.home_studio_description,
  up.last_name,
  up.rate_tier_1,
  up.rate_tier_2,
  up.rate_tier_3,
  up.show_rates,
  up.facebook_url,
  up.twitter_url,
  up.x_url,
  up.linkedin_url,
  up.instagram_url,
  up.tiktok_url,
  up.threads_url,
  up.youtube_url,
  up.vimeo_url,
  up.soundcloud_url,
  up.connection1,
  up.connection2,
  up.connection3,
  up.connection4,
  up.connection5,
  up.connection6,
  up.connection7,
  up.connection8,
  up.connection9,
  up.connection10,
  up.connection11,
  up.connection12,
  up.custom_connection_methods,
  s.status,
  s.is_premium,
  s.is_verified,
  s.is_profile_visible,
  up.is_featured,
  up.is_spotlight,
  up.is_crb_checked,
  up.verification_level,
  up.use_coordinates_for_map,
  LEAST(s.created_at, up.created_at), -- Use earliest creation date
  GREATEST(s.updated_at, up.updated_at) -- Use latest update date
FROM studios s
INNER JOIN user_profiles up ON s.owner_id = up.user_id;

SELECT '✅ Data migration complete' as status, COUNT(*) as migrated_records 
FROM studio_profiles;

-- Step 3: Update foreign keys in related tables
SELECT '=== UPDATING FOREIGN KEY CONSTRAINTS ===' as info;

-- studio_images
ALTER TABLE studio_images 
  DROP CONSTRAINT IF EXISTS studio_images_studio_id_fkey,
  ADD CONSTRAINT studio_images_studio_profile_id_fkey 
    FOREIGN KEY (studio_id) REFERENCES studio_profiles(id) ON DELETE CASCADE;

-- studio_services
ALTER TABLE studio_services 
  DROP CONSTRAINT IF EXISTS studio_services_studio_id_fkey,
  ADD CONSTRAINT studio_services_studio_profile_id_fkey 
    FOREIGN KEY (studio_id) REFERENCES studio_profiles(id) ON DELETE CASCADE;

-- studio_studio_types
ALTER TABLE studio_studio_types 
  DROP CONSTRAINT IF EXISTS studio_studio_types_studio_id_fkey,
  ADD CONSTRAINT studio_studio_types_studio_profile_id_fkey 
    FOREIGN KEY (studio_id) REFERENCES studio_profiles(id) ON DELETE CASCADE;

-- reviews
ALTER TABLE reviews 
  DROP CONSTRAINT IF EXISTS reviews_studio_id_fkey,
  ADD CONSTRAINT reviews_studio_profile_id_fkey 
    FOREIGN KEY (studio_id) REFERENCES studio_profiles(id) ON DELETE CASCADE;

-- pending_subscriptions
ALTER TABLE pending_subscriptions 
  DROP CONSTRAINT IF EXISTS pending_subscriptions_studio_id_fkey,
  ADD CONSTRAINT pending_subscriptions_studio_profile_id_fkey 
    FOREIGN KEY (studio_id) REFERENCES studio_profiles(id) ON DELETE CASCADE;

SELECT '✅ Foreign key constraints updated' as status;

-- Step 4: Create performance indices
SELECT '=== CREATING PERFORMANCE INDICES ===' as info;

CREATE INDEX idx_studio_profiles_user_id ON studio_profiles(user_id);
CREATE INDEX idx_studio_profiles_city ON studio_profiles(city);
CREATE INDEX idx_studio_profiles_status ON studio_profiles(status);
CREATE INDEX idx_studio_profiles_is_premium ON studio_profiles(is_premium);
CREATE INDEX idx_studio_profiles_is_verified ON studio_profiles(is_verified);
CREATE INDEX idx_studio_profiles_is_featured ON studio_profiles(is_featured);
CREATE INDEX idx_studio_profiles_verification_level ON studio_profiles(verification_level);

SELECT '✅ Performance indices created' as status;

-- Step 5: Verification queries
SELECT '=== MIGRATION VERIFICATION ===' as info;

SELECT 'studio_profiles created' as check, COUNT(*) as count 
FROM studio_profiles;

SELECT 'old studios count' as check, COUNT(*) as count 
FROM studios;

SELECT 'old profiles count' as check, COUNT(*) as count 
FROM user_profiles;

-- Verify all studios were migrated
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM studio_profiles) = (SELECT COUNT(*) FROM studios)
    THEN '✅ ALL STUDIOS MIGRATED SUCCESSFULLY'
    ELSE '❌ MIGRATION COUNT MISMATCH - INVESTIGATE!'
  END as migration_status;

-- Verify no data loss
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM studio_profiles WHERE name IS NULL) = 0
    THEN '✅ No null names - data integrity good'
    ELSE '❌ Found null names - data integrity issue!'
  END as data_integrity_check;

-- Sample data check
SELECT '=== SAMPLE RECORDS ===' as info;
SELECT id, user_id, name, city, is_premium, is_verified, status
FROM studio_profiles
LIMIT 5;

-- Check related tables still work
SELECT '=== RELATED TABLE CHECK ===' as info;
SELECT 
  'studio_images' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT studio_id) as unique_studios
FROM studio_images
UNION ALL
SELECT 
  'studio_services',
  COUNT(*),
  COUNT(DISTINCT studio_id)
FROM studio_services
UNION ALL
SELECT 
  'studio_studio_types',
  COUNT(*),
  COUNT(DISTINCT studio_id)
FROM studio_studio_types;

SELECT '=== MIGRATION COMPLETE ===' as info;
SELECT 'Old tables (studios, user_profiles) can now be dropped after code is updated and tested' as next_steps;

