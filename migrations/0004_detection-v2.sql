-- Detection v2: source_url, artists table, Last.fm enrichment fields

-- Add source_url to sets for YouTube description retrieval
ALTER TABLE sets ADD COLUMN source_url TEXT;

-- Link sets to artists table
ALTER TABLE sets ADD COLUMN artist_id TEXT;

-- Artists table (enriched from Last.fm)
CREATE TABLE artists (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  lastfm_url TEXT,
  lastfm_mbid TEXT,
  image_url TEXT,
  bio_summary TEXT,
  bio_full TEXT,
  tags TEXT,
  similar_artists TEXT,
  listeners INTEGER DEFAULT 0,
  playcount INTEGER DEFAULT 0,
  last_synced_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_artists_name ON artists(name);
CREATE INDEX idx_artists_slug ON artists(slug);

-- Add Last.fm fields to detections
ALTER TABLE detections ADD COLUMN lastfm_url TEXT;
ALTER TABLE detections ADD COLUMN lastfm_track_mbid TEXT;
ALTER TABLE detections ADD COLUMN lastfm_album TEXT;
ALTER TABLE detections ADD COLUMN lastfm_album_art TEXT;
ALTER TABLE detections ADD COLUMN lastfm_duration_ms INTEGER;
ALTER TABLE detections ADD COLUMN lastfm_tags TEXT;
ALTER TABLE detections ADD COLUMN lastfm_listeners INTEGER;
