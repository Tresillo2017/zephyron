-- migrations/0023_privacy-granular.sql
-- Granular privacy controls

ALTER TABLE user ADD COLUMN show_activity INTEGER DEFAULT 1;
ALTER TABLE user ADD COLUMN show_liked_songs INTEGER DEFAULT 1;
