-- Migration 0011: Songs table, 1001Tracklists integration, video streaming URL
-- Adds a first-class "songs" entity with rich metadata from 1001tracklists.com,
-- links detections to songs, and adds 1001tracklists + video stream fields to sets.

-- ═══════════════════════════════════════════
-- 1. Songs table — individual tracks with rich metadata
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS songs (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  artist            TEXT NOT NULL,
  label             TEXT,            -- Record label (from 1001tracklists)
  album             TEXT,            -- Album name
  -- Cover art
  cover_art_url     TEXT,            -- External artwork URL (1001tracklists CDN, Last.fm, etc.)
  cover_art_r2_key  TEXT,            -- Locally cached artwork in R2
  -- External service links
  spotify_url       TEXT,
  apple_music_url   TEXT,
  soundcloud_url    TEXT,
  beatport_url      TEXT,
  youtube_url       TEXT,
  deezer_url        TEXT,
  bandcamp_url      TEXT,
  traxsource_url    TEXT,
  -- Last.fm enrichment (migrated from detections)
  lastfm_url        TEXT,
  lastfm_track_mbid TEXT,
  lastfm_album      TEXT,
  lastfm_album_art  TEXT,
  lastfm_duration_ms INTEGER,
  lastfm_tags       TEXT,            -- JSON array of tag strings
  lastfm_listeners  INTEGER,
  -- Provenance
  source            TEXT DEFAULT 'manual',  -- 'manual' | '1001tracklists' | 'lastfm' | 'youtube'
  external_id       TEXT,            -- 1001tracklists track ID or other external ref
  -- Timestamps
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_songs_artist_title ON songs (artist, title);
CREATE INDEX IF NOT EXISTS idx_songs_external_id ON songs (external_id);

-- ═══════════════════════════════════════════
-- 2. Link detections to songs
-- ═══════════════════════════════════════════

ALTER TABLE detections ADD COLUMN song_id TEXT REFERENCES songs(id);

CREATE INDEX IF NOT EXISTS idx_detections_song_id ON detections (song_id);

-- ═══════════════════════════════════════════
-- 3. Add 1001Tracklists fields to sets
-- ═══════════════════════════════════════════

ALTER TABLE sets ADD COLUMN tracklist_1001_url TEXT;
ALTER TABLE sets ADD COLUMN tracklist_1001_id TEXT;

-- ═══════════════════════════════════════════
-- 4. Add video streaming URL to sets
-- ═══════════════════════════════════════════

ALTER TABLE sets ADD COLUMN youtube_video_stream_url TEXT;
ALTER TABLE sets ADD COLUMN youtube_video_stream_expires INTEGER;
