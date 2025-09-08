-- Migration: Add User Metadata Table
-- This will store the 121+ metadata fields from the legacy Turso database

-- Create UserMetadata table for flexible profile data
CREATE TABLE "user_metadata" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_metadata_pkey" PRIMARY KEY ("id")
);

-- Create indexes for performance
CREATE INDEX "user_metadata_user_id_idx" ON "user_metadata"("user_id");
CREATE INDEX "user_metadata_key_idx" ON "user_metadata"("key");
CREATE UNIQUE INDEX "user_metadata_user_id_key_key" ON "user_metadata"("user_id", "key");

-- Add foreign key constraint
ALTER TABLE "user_metadata" ADD CONSTRAINT "user_metadata_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create UserProfile table for commonly accessed fields (denormalized for performance)
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    
    -- Professional Information
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "about" TEXT,
    "short_about" TEXT,
    "location" TEXT,
    
    -- Pricing Information
    "rate_tier_1" TEXT,
    "rate_tier_2" TEXT,
    "rate_tier_3" TEXT,
    "show_rates" BOOLEAN DEFAULT false,
    
    -- Social Media Links
    "facebook_url" TEXT,
    "twitter_url" TEXT,
    "linkedin_url" TEXT,
    "instagram_url" TEXT,
    "youtube_url" TEXT,
    "vimeo_url" TEXT,
    "soundcloud_url" TEXT,
    
    -- Professional Status
    "is_crb_checked" BOOLEAN DEFAULT false,
    "is_featured" BOOLEAN DEFAULT false,
    "is_spotlight" BOOLEAN DEFAULT false,
    "verification_level" TEXT DEFAULT 'none', -- none, basic, verified, premium
    
    -- Equipment & Studio
    "home_studio_description" TEXT,
    "equipment_list" TEXT,
    "services_offered" TEXT,
    
    -- Contact Preferences
    "show_email" BOOLEAN DEFAULT false,
    "show_phone" BOOLEAN DEFAULT false,
    "show_address" BOOLEAN DEFAULT false,
    
    -- Timestamps
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint and indexes
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");
CREATE INDEX "user_profiles_is_featured_idx" ON "user_profiles"("is_featured");
CREATE INDEX "user_profiles_is_spotlight_idx" ON "user_profiles"("is_spotlight");
CREATE INDEX "user_profiles_verification_level_idx" ON "user_profiles"("verification_level");

-- Add foreign key constraint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
