-- Events system

CREATE TABLE events (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  series TEXT,
  description TEXT,
  website TEXT,
  location TEXT,
  start_date TEXT,
  end_date TEXT,
  cover_image_r2_key TEXT,
  tags TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_series ON events(series);
CREATE INDEX idx_events_start_date ON events(start_date DESC);

-- Link sets to events
ALTER TABLE sets ADD COLUMN event_id TEXT;
CREATE INDEX idx_sets_event_id ON sets(event_id);
