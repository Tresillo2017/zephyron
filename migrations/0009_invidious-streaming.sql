-- Migration 0009: Invidious-based streaming
-- Adds YouTube/Invidious metadata columns to sets table.
-- Audio is now streamed from YouTube via Invidious instead of stored in R2.
-- Old R2 columns (r2_key, r2_waveform_key, audio_format, bitrate, sample_rate, file_size_bytes)
-- are kept for legacy sets but deprecated for new ones.

-- Stream source type: 'invidious' (new default) or 'r2' (legacy)
ALTER TABLE sets ADD COLUMN stream_type TEXT DEFAULT 'invidious';

-- YouTube video ID (extracted from source_url, stored for quick Invidious lookups)
ALTER TABLE sets ADD COLUMN youtube_video_id TEXT;

-- YouTube channel metadata
ALTER TABLE sets ADD COLUMN youtube_channel_id TEXT;
ALTER TABLE sets ADD COLUMN youtube_channel_name TEXT;

-- YouTube publish date (ISO epoch from Invidious)
ALTER TABLE sets ADD COLUMN youtube_published_at TEXT;

-- YouTube engagement metrics (snapshot at import time)
ALTER TABLE sets ADD COLUMN youtube_view_count INTEGER;
ALTER TABLE sets ADD COLUMN youtube_like_count INTEGER;

-- Storyboard data for thumbnail scrubber (JSON array from Invidious)
ALTER TABLE sets ADD COLUMN storyboard_data TEXT;

-- Keywords/tags from YouTube (JSON array)
ALTER TABLE sets ADD COLUMN keywords TEXT;

-- Music tracks detected by YouTube (JSON array from Invidious musicTracks)
ALTER TABLE sets ADD COLUMN youtube_music_tracks TEXT;

-- Mark existing sets with R2 audio as legacy stream type
UPDATE sets SET stream_type = 'r2' WHERE r2_key IS NOT NULL AND r2_key != '';
