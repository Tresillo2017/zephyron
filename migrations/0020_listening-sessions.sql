-- Migration 0020: Listening Sessions and Analytics
-- Track individual user listening sessions and pre-computed analytics

-- ─── listening_sessions table ─────────────────────────────────────────────────
-- Track individual user listening sessions with start/end times and completion metrics
CREATE TABLE listening_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  set_id TEXT NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,           -- ISO 8601 timestamp (UTC)
  ended_at TEXT,                      -- ISO 8601 timestamp
  duration_seconds INTEGER DEFAULT 0, -- Total session duration
  last_position_seconds REAL DEFAULT 0,
  percentage_completed REAL,
  qualifies INTEGER DEFAULT 0,        -- 1 if >= 15%, 0 otherwise
  session_date TEXT NOT NULL,         -- YYYY-MM-DD in Pacific timezone
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user
  ON listening_sessions(user_id, started_at DESC);
CREATE INDEX idx_sessions_set
  ON listening_sessions(set_id);
CREATE INDEX idx_sessions_date
  ON listening_sessions(session_date, user_id);
CREATE INDEX idx_sessions_qualifies
  ON listening_sessions(user_id, qualifies, session_date);

-- ─── user_monthly_stats table ─────────────────────────────────────────────────
-- Pre-computed monthly aggregations for each user
CREATE TABLE user_monthly_stats (
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  total_seconds INTEGER NOT NULL,
  qualifying_sessions INTEGER NOT NULL,
  unique_sets_count INTEGER NOT NULL,
  top_artists TEXT,                  -- JSON array
  top_genre TEXT,                    -- JSON array
  longest_set_id TEXT REFERENCES sets(id) ON DELETE SET NULL,
  discoveries_count INTEGER,
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, year, month)
);

-- ─── user_annual_stats table ──────────────────────────────────────────────────
-- Pre-computed annual aggregations for each user
CREATE TABLE user_annual_stats (
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_seconds INTEGER NOT NULL,
  qualifying_sessions INTEGER NOT NULL,
  unique_sets_count INTEGER NOT NULL,
  top_artists TEXT,                  -- JSON array
  top_genre TEXT,                    -- JSON array
  longest_streak_days INTEGER,
  discoveries_count INTEGER,
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, year)
);

-- ─── wrapped_images table ─────────────────────────────────────────────────────
-- R2 storage references for Wrapped PNG images
CREATE TABLE wrapped_images (
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, year)
);
