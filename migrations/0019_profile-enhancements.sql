-- migrations/0019_profile-enhancements.sql

-- Add profile fields to user table
ALTER TABLE user ADD COLUMN bio TEXT DEFAULT NULL;
ALTER TABLE user ADD COLUMN is_profile_public INTEGER DEFAULT 0;

-- Index for public profile lookups
CREATE INDEX IF NOT EXISTS idx_user_public_profiles
  ON user(is_profile_public)
  WHERE is_profile_public = 1;
