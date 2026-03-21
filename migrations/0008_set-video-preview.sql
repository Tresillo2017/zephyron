-- Add video preview clip column to sets table
-- Stores the R2 key for a ~30s MP4 video preview used as the banner background
ALTER TABLE sets ADD COLUMN video_preview_r2_key TEXT;
