-- Add logo column to events table
-- Logo: square image (e.g. festival logo) displayed in the banner
-- Cover: wide image used as the blurred background
ALTER TABLE events ADD COLUMN logo_r2_key TEXT;
