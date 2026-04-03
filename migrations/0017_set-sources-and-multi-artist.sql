-- Migration 0017: Set sources, multi-artist, and DB-backed requests
-- Replaces GitHub Issues approach for set requests.
-- Adds junction table for multiple artists per set.
-- Adds source_requests for suggesting stream sources on sourceless sets.

-- ─── set_artists junction table ───────────────────────────────────────────────
-- Allows a set to have multiple artists (b2b, collaborations, etc.)
-- The primary artist still lives in sets.artist for legacy display.
CREATE TABLE set_artists (
  set_id    TEXT NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  position  INTEGER NOT NULL DEFAULT 0, -- 0 = primary artist
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (set_id, artist_id)
);

CREATE INDEX idx_set_artists_set    ON set_artists(set_id);
CREATE INDEX idx_set_artists_artist ON set_artists(artist_id);

-- ─── set_requests table ───────────────────────────────────────────────────────
-- Logged-in users can request a new set to be added to the platform.
-- Replaces the GitHub Issues approach (petitions.ts).
CREATE TABLE set_requests (
  id          TEXT PRIMARY KEY NOT NULL,
  user_id     TEXT REFERENCES user(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  artist      TEXT NOT NULL,
  source_type TEXT,              -- 'youtube' | 'soundcloud' | 'hearthis' | NULL
  source_url  TEXT,              -- optional URL hint
  event       TEXT,
  genre       TEXT,
  notes       TEXT,
  status      TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'duplicate'
  admin_notes TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_set_requests_user   ON set_requests(user_id);
CREATE INDEX idx_set_requests_status ON set_requests(status);

-- ─── source_requests table ────────────────────────────────────────────────────
-- Logged-in users can suggest a stream source for a set that has no source.
-- Admins review and approve; approval auto-applies the source to the set.
CREATE TABLE source_requests (
  id          TEXT PRIMARY KEY NOT NULL,
  set_id      TEXT NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  user_id     TEXT REFERENCES user(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL,     -- 'youtube' | 'soundcloud' | 'hearthis'
  source_url  TEXT NOT NULL,
  notes       TEXT,
  status      TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  approved_by TEXT REFERENCES user(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_source_requests_set    ON source_requests(set_id);
CREATE INDEX idx_source_requests_user   ON source_requests(user_id);
CREATE INDEX idx_source_requests_status ON source_requests(status);
