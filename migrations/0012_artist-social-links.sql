-- Add social/service link columns to artists table
-- Populated when importing artists from 1001Tracklists DJ pages

ALTER TABLE artists ADD COLUMN spotify_url TEXT;
ALTER TABLE artists ADD COLUMN soundcloud_url TEXT;
ALTER TABLE artists ADD COLUMN beatport_url TEXT;
ALTER TABLE artists ADD COLUMN traxsource_url TEXT;
ALTER TABLE artists ADD COLUMN youtube_url TEXT;
ALTER TABLE artists ADD COLUMN facebook_url TEXT;
ALTER TABLE artists ADD COLUMN instagram_url TEXT;
ALTER TABLE artists ADD COLUMN x_url TEXT;
