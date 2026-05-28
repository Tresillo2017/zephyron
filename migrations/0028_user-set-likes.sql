-- User set likes
CREATE TABLE user_set_likes (
  user_id TEXT NOT NULL,
  set_id  TEXT NOT NULL,
  liked_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, set_id),
  FOREIGN KEY (set_id) REFERENCES sets(id) ON DELETE CASCADE
);

CREATE INDEX idx_set_likes_user ON user_set_likes(user_id);
CREATE INDEX idx_set_likes_set  ON user_set_likes(set_id);
