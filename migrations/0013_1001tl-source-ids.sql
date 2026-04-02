-- Migration 0013: Add 1001Tracklists source IDs and event social links
-- source_1001_id stores the short slug used in 1001TL URLs (e.g. /dj/johnsummit/ -> "johnsummit")
-- For artists: from /dj/<dj_id>/ pages
-- For events:  from /source/<source_id>/ pages

ALTER TABLE artists ADD COLUMN source_1001_id TEXT;
ALTER TABLE events ADD COLUMN source_1001_id TEXT;

-- Social link columns for events (artists already have these from migration 0012)
ALTER TABLE events ADD COLUMN facebook_url TEXT;
ALTER TABLE events ADD COLUMN instagram_url TEXT;
ALTER TABLE events ADD COLUMN youtube_url TEXT;
ALTER TABLE events ADD COLUMN x_url TEXT;

-- Index for fast lookup by 1001TL ID
CREATE INDEX IF NOT EXISTS idx_artists_source_1001_id ON artists(source_1001_id) WHERE source_1001_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_source_1001_id ON events(source_1001_id) WHERE source_1001_id IS NOT NULL;
