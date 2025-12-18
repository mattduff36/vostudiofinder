-- Add email verification token fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS verification_token TEXT,
ADD COLUMN IF NOT EXISTS verification_token_expiry TIMESTAMPTZ;

-- Create index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
