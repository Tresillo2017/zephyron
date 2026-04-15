-- migrations/0022_profile-banner.sql
-- Add profile banner support

ALTER TABLE user ADD COLUMN banner_url TEXT DEFAULT NULL;
