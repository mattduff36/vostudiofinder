-- Add database indexes for better search performance

-- Index for studio name searches
CREATE INDEX IF NOT EXISTS idx_studios_name_gin ON studios USING gin(to_tsvector('english', name));

-- Index for studio description searches
CREATE INDEX IF NOT EXISTS idx_studios_description_gin ON studios USING gin(to_tsvector('english', description));

-- Index for address/location searches
CREATE INDEX IF NOT EXISTS idx_studios_address ON studios(address);
CREATE INDEX IF NOT EXISTS idx_studios_address_gin ON studios USING gin(to_tsvector('english', address));

-- Index for studio status and premium status
CREATE INDEX IF NOT EXISTS idx_studios_status_premium ON studios(status, is_premium);

-- Index for studio type
CREATE INDEX IF NOT EXISTS idx_studios_type ON studios(studio_type);

-- Index for geospatial searches (if using coordinates)
CREATE INDEX IF NOT EXISTS idx_studios_location ON studios(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Index for studio services
CREATE INDEX IF NOT EXISTS idx_studio_services_service ON studio_services(service);

-- Index for reviews (for rating calculations)
CREATE INDEX IF NOT EXISTS idx_reviews_studio_rating ON reviews(studio_id, rating, status);

-- Index for user searches
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Composite index for common search patterns
CREATE INDEX IF NOT EXISTS idx_studios_search_composite ON studios(status, is_premium, created_at);

-- Index for saved searches
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id, created_at);
