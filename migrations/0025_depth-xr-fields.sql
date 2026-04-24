-- Migration 0025: Depth XR fields on sets table
-- depth_scene_key: R2 key for the .dsf depth scene file (null = not processed)
-- depth_processed_at: ISO-8601 timestamp when depth-cli ran

ALTER TABLE sets ADD COLUMN depth_scene_key TEXT;
ALTER TABLE sets ADD COLUMN depth_processed_at TEXT;

CREATE INDEX IF NOT EXISTS idx_sets_depth ON sets(depth_scene_key)
  WHERE depth_scene_key IS NOT NULL;
