-- User Badges (junction table for earned badges)
CREATE TABLE user_badges (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id, earned_at DESC);
CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);

-- Activity Feed
CREATE TABLE activity_items (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  metadata TEXT,
  is_public INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_user ON activity_items(user_id, created_at DESC);
CREATE INDEX idx_activity_public ON activity_items(is_public, created_at DESC);
CREATE INDEX idx_activity_type ON activity_items(activity_type, created_at DESC);

-- Activity Privacy Settings
CREATE TABLE activity_privacy_settings (
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  is_visible INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, activity_type)
);
