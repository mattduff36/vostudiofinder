-- ============================================
-- MIGRATION: Merge user_profiles + studios → studio_profiles
-- ============================================

SET search_path = public;

SELECT '=== CREATING STUDIO_PROFILES TABLE ===' as info;

-- Step 1: Create new unified table
CREATE TABLE IF NOT EXISTS studio_profiles (
  id                          TEXT PRIMARY KEY,
  user_id                     TEXT UNIQUE NOT NULL,
  
  -- Studio identity
  name                        TEXT NOT NULL,
  description                 TEXT,
  short_about                 TEXT,
  about                       TEXT,
  
  -- Location
  full_address                TEXT,
  abbreviated_address         TEXT,
  city                        TEXT NOT NULL DEFAULT '',
  location                    TEXT,
  latitude                    DECIMAL(10,8),
  longitude                   DECIMAL(11,8),
  
  -- Contact
  phone                       TEXT,
  website_url                 TEXT,
  show_email                  BOOLEAN DEFAULT false,
  show_phone                  BOOLEAN DEFAULT false,
  show_address                BOOLEAN DEFAULT false,
  show_directions             BOOLEAN DEFAULT false,
  
  -- Professional
  equipment_list              TEXT,
  services_offered            TEXT,
  home_studio_description     TEXT,
  last_name                   TEXT,
  
  -- Pricing
  rate_tier_1                 TEXT,
  rate_tier_2                 TEXT,
  rate_tier_3                 TEXT,
  show_rates                  BOOLEAN DEFAULT false,
  
  -- Social media
  facebook_url                TEXT,
  twitter_url                 TEXT,
  x_url                       TEXT,
  linkedin_url                TEXT,
  instagram_url               TEXT,
  tiktok_url                  TEXT,
  threads_url                 TEXT,
  youtube_url                 TEXT,
  vimeo_url                   TEXT,
  soundcloud_url              TEXT,
  
  -- Connections
  connection1                 VARCHAR(10),
  connection2                 VARCHAR(10),
  connection3                 VARCHAR(10),
  connection4                 VARCHAR(10),
  connection5                 VARCHAR(10),
  connection6                 VARCHAR(10),
  connection7                 VARCHAR(10),
  connection8                 VARCHAR(10),
  connection9                 VARCHAR(10),
  connection10                VARCHAR(10),
  connection11                VARCHAR(10),
  connection12                VARCHAR(10),
  custom_connection_methods   TEXT[],
  
  -- Status
  status                      TEXT DEFAULT 'ACTIVE',
  is_premium                  BOOLEAN DEFAULT false,
  is_verified                 BOOLEAN DEFAULT false,
  is_profile_visible          BOOLEAN DEFAULT true,
  is_featured                 BOOLEAN DEFAULT false,
  is_spotlight                BOOLEAN DEFAULT false,
  is_crb_checked              BOOLEAN DEFAULT false,
  verification_level          TEXT DEFAULT 'none',
  use_coordinates_for_map     BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at                  TIMESTAMP DEFAULT NOW(),
  updated_at                  TIMESTAMP DEFAULT NOW(),
  
  -- Foreign key
  CONSTRAINT fk_studio_profiles_user FOREIGN KEY (user_id) 
    REFERENCES users(id) ON DELETE CASCADE
);

SELECT 'Created studio_profiles table' as status;

SELECT '=== MIGRATING DATA ===' as info;

-- Step 2: Migrate data from both tables
INSERT INTO studio_profiles (
  id, user_id,
  name, description, short_about, about,
  full_address, abbreviated_address, city, location, latitude, longitude,
  phone, website_url, show_email, show_phone, show_address, show_directions,
  equipment_list, services_offered, home_studio_description, last_name,
  rate_tier_1, rate_tier_2, rate_tier_3, show_rates,
  facebook_url, twitter_url, x_url, linkedin_url, instagram_url, tiktok_url, threads_url, youtube_url, vimeo_url, soundcloud_url,
  connection1, connection2, connection3, connection4, connection5, connection6, connection7, connection8, connection9, connection10, connection11, connection12, custom_connection_methods,
  status, is_premium, is_verified, is_profile_visible, is_featured, is_spotlight, is_crb_checked, verification_level, use_coordinates_for_map,
  created_at, updated_at
)
SELECT 
  s.id, s.owner_id,
  s.name, s.description, up.short_about, up.about,
  s.full_address, s.abbreviated_address, s.city, up.location, s.latitude, s.longitude,
  COALESCE(s.phone, up.phone), s.website_url, up.show_email, up.show_phone, up.show_address, up.show_directions,
  up.equipment_list, up.services_offered, up.home_studio_description, up.last_name,
  up.rate_tier_1, up.rate_tier_2, up.rate_tier_3, up.show_rates,
  up.facebook_url, up.twitter_url, up.x_url, up.linkedin_url, up.instagram_url, up.tiktok_url, up.threads_url, up.youtube_url, up.vimeo_url, up.soundcloud_url,
  up.connection1, up.connection2, up.connection3, up.connection4, up.connection5, up.connection6, up.connection7, up.connection8, up.connection9, up.connection10, up.connection11, up.connection12, up.custom_connection_methods,
  s.status::TEXT, s.is_premium, s.is_verified, s.is_profile_visible, up.is_featured, up.is_spotlight, up.is_crb_checked, up.verification_level, up.use_coordinates_for_map,
  LEAST(s.created_at, up.created_at), GREATEST(s.updated_at, up.updated_at)
FROM studios s
INNER JOIN user_profiles up ON s.owner_id = up.user_id;

SELECT 'Migrated data to studio_profiles' as status, COUNT(*) as records FROM studio_profiles;

SELECT '=== UPDATING FOREIGN KEYS ===' as info;

-- Step 3: Update foreign keys in related tables
ALTER TABLE studio_images DROP CONSTRAINT IF EXISTS studio_images_studio_id_fkey;
ALTER TABLE studio_images ADD CONSTRAINT studio_images_studio_profile_id_fkey 
  FOREIGN KEY (studio_id) REFERENCES studio_profiles(id) ON DELETE CASCADE;

ALTER TABLE studio_services DROP CONSTRAINT IF EXISTS studio_services_studio_id_fkey;
ALTER TABLE studio_services ADD CONSTRAINT studio_services_studio_profile_id_fkey 
  FOREIGN KEY (studio_id) REFERENCES studio_profiles(id) ON DELETE CASCADE;

ALTER TABLE studio_studio_types DROP CONSTRAINT IF EXISTS studio_studio_types_studio_id_fkey;
ALTER TABLE studio_studio_types ADD CONSTRAINT studio_studio_types_studio_profile_id_fkey 
  FOREIGN KEY (studio_id) REFERENCES studio_profiles(id) ON DELETE CASCADE;

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_studio_id_fkey;
ALTER TABLE reviews ADD CONSTRAINT reviews_studio_profile_id_fkey 
  FOREIGN KEY (studio_id) REFERENCES studio_profiles(id) ON DELETE CASCADE;

ALTER TABLE pending_subscriptions DROP CONSTRAINT IF EXISTS pending_subscriptions_studio_id_fkey;
ALTER TABLE pending_subscriptions ADD CONSTRAINT pending_subscriptions_studio_profile_id_fkey 
  FOREIGN KEY (studio_id) REFERENCES studio_profiles(id) ON DELETE CASCADE;

SELECT 'Updated foreign key constraints' as status;

SELECT '=== CREATING INDEXES ===' as info;

-- Step 4: Create performance indices
CREATE INDEX IF NOT EXISTS idx_studio_profiles_user_id ON studio_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_profiles_city ON studio_profiles(city);
CREATE INDEX IF NOT EXISTS idx_studio_profiles_status ON studio_profiles(status);
CREATE INDEX IF NOT EXISTS idx_studio_profiles_is_premium ON studio_profiles(is_premium);
CREATE INDEX IF NOT EXISTS idx_studio_profiles_is_verified ON studio_profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_studio_profiles_is_featured ON studio_profiles(is_featured);
CREATE INDEX IF NOT EXISTS idx_studio_profiles_verification_level ON studio_profiles(verification_level);

SELECT 'Created indexes' as status;

SELECT '=== VERIFICATION ===' as info;

SELECT 'studio_profiles' as table, COUNT(*) as count FROM studio_profiles
UNION ALL
SELECT 'studios (old)', COUNT(*) FROM studios
UNION ALL
SELECT 'user_profiles (old)', COUNT(*) FROM user_profiles;

SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM studio_profiles) = (SELECT COUNT(*) FROM studios)
    THEN '✅ Migration successful - all studios migrated'
    ELSE '❌ MIGRATION ERROR - counts do not match!'
  END as migration_status;

SELECT '=== MIGRATION COMPLETE ===' as info;
SELECT 'Old tables (studios, user_profiles) still exist for safety' as note;
SELECT 'Run Prisma migrations to update schema and drop old tables' as next_step;

