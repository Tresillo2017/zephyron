-- Artist follows: user follows an artist to get notifications
CREATE TABLE artist_follows (
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, artist_id)
);
CREATE INDEX idx_artist_follows_artist ON artist_follows(artist_id);
CREATE INDEX idx_artist_follows_user ON artist_follows(user_id);

-- In-app notifications (pre-rendered title+body, no joins needed at read time)
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at);
