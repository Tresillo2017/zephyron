-- User song likes table for discovery algorithm foundation
-- Users can like/unlike individual tracks across all sets

CREATE TABLE IF NOT EXISTS user_song_likes (
  user_id TEXT NOT NULL,
  song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  liked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, song_id)
);

-- Index for fetching user's liked songs
CREATE INDEX IF NOT EXISTS idx_user_song_likes_user ON user_song_likes(user_id, liked_at DESC);

-- Index for song like counts
CREATE INDEX IF NOT EXISTS idx_user_song_likes_song ON user_song_likes(song_id);
