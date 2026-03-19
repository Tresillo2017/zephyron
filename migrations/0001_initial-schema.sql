-- Zephyron Initial Schema
-- DJ Set streaming platform with ML track detection and community annotations

-- DJ Sets (the primary content)
CREATE TABLE sets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  subgenre TEXT,
  venue TEXT,
  event TEXT,
  recorded_date TEXT,
  duration_seconds INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  r2_waveform_key TEXT,
  cover_image_r2_key TEXT,
  audio_format TEXT DEFAULT 'mp3',
  bitrate INTEGER,
  sample_rate INTEGER,
  file_size_bytes INTEGER,
  detection_status TEXT DEFAULT 'pending',
  detection_version INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sets_genre ON sets(genre);
CREATE INDEX idx_sets_artist ON sets(artist);
CREATE INDEX idx_sets_detection_status ON sets(detection_status);
CREATE INDEX idx_sets_created ON sets(created_at DESC);

-- Detected tracks within a set (timeline annotations / "chapters")
CREATE TABLE detections (
  id TEXT PRIMARY KEY,
  set_id TEXT NOT NULL,
  track_title TEXT NOT NULL,
  track_artist TEXT,
  start_time_seconds REAL NOT NULL,
  end_time_seconds REAL,
  confidence REAL NOT NULL,
  detection_method TEXT,
  ml_model_version TEXT,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  is_verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (set_id) REFERENCES sets(id) ON DELETE CASCADE
);

CREATE INDEX idx_detections_set ON detections(set_id, start_time_seconds);
CREATE INDEX idx_detections_track ON detections(track_title);
CREATE INDEX idx_detections_confidence ON detections(confidence);

-- Community corrections / annotations
CREATE TABLE annotations (
  id TEXT PRIMARY KEY,
  detection_id TEXT,
  set_id TEXT NOT NULL,
  user_id TEXT,
  anonymous_id TEXT,
  track_title TEXT NOT NULL,
  track_artist TEXT,
  start_time_seconds REAL NOT NULL,
  end_time_seconds REAL,
  annotation_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (detection_id) REFERENCES detections(id) ON DELETE SET NULL,
  FOREIGN KEY (set_id) REFERENCES sets(id) ON DELETE CASCADE
);

CREATE INDEX idx_annotations_set ON annotations(set_id);
CREATE INDEX idx_annotations_detection ON annotations(detection_id);
CREATE INDEX idx_annotations_status ON annotations(status);

-- Votes on detections
CREATE TABLE votes (
  id TEXT PRIMARY KEY,
  detection_id TEXT NOT NULL,
  user_id TEXT,
  anonymous_id TEXT,
  vote INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (detection_id) REFERENCES detections(id) ON DELETE CASCADE
);

CREATE INDEX idx_votes_detection ON votes(detection_id);
CREATE INDEX idx_votes_unique ON votes(detection_id, COALESCE(user_id, anonymous_id));

-- Users (optional signup)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'listener',
  reputation INTEGER DEFAULT 0,
  total_annotations INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Playlists
CREATE TABLE playlists (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  anonymous_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  is_public INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Playlist items
CREATE TABLE playlist_items (
  id TEXT PRIMARY KEY,
  playlist_id TEXT NOT NULL,
  set_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  added_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (set_id) REFERENCES sets(id) ON DELETE CASCADE
);

CREATE INDEX idx_playlist_items_playlist ON playlist_items(playlist_id, position);

-- Listening history
CREATE TABLE listen_history (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  anonymous_id TEXT,
  set_id TEXT NOT NULL,
  last_position_seconds REAL DEFAULT 0,
  listen_count INTEGER DEFAULT 1,
  last_listened_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (set_id) REFERENCES sets(id) ON DELETE CASCADE
);

CREATE INDEX idx_history_user ON listen_history(user_id);
CREATE INDEX idx_history_anonymous ON listen_history(anonymous_id);
CREATE INDEX idx_history_set ON listen_history(set_id);
