-- Migration 0030: stable 1001Tracklists upsert keys
--
-- Lets the crawler re-run imports idempotently: a set/artist/event is looked up by its
-- 1001Tracklists ID and updated in place instead of duplicated.
--
-- Step 1 un-keys duplicates WITHOUT deleting rows: for every duplicated key, only the
-- oldest row (lowest rowid) keeps the key; the others get NULL so the unique index can
-- be created. Check for duplicates on prod before applying (see README / gap doc).

UPDATE sets SET tracklist_1001_id = NULL
WHERE tracklist_1001_id IS NOT NULL
  AND rowid NOT IN (
    SELECT MIN(rowid) FROM sets WHERE tracklist_1001_id IS NOT NULL GROUP BY tracklist_1001_id
  );

UPDATE artists SET source_1001_id = NULL
WHERE source_1001_id IS NOT NULL
  AND rowid NOT IN (
    SELECT MIN(rowid) FROM artists WHERE source_1001_id IS NOT NULL GROUP BY source_1001_id
  );

UPDATE events SET source_1001_id = NULL
WHERE source_1001_id IS NOT NULL
  AND rowid NOT IN (
    SELECT MIN(rowid) FROM events WHERE source_1001_id IS NOT NULL GROUP BY source_1001_id
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_sets_tracklist_1001_id
  ON sets(tracklist_1001_id) WHERE tracklist_1001_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_artists_source_1001_id
  ON artists(source_1001_id) WHERE source_1001_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_events_source_1001_id
  ON events(source_1001_id) WHERE source_1001_id IS NOT NULL;

-- Change tracking for the sync job: hash of the last imported tracklist, and when the
-- set's 1001 metadata was last synced.
ALTER TABLE sets ADD COLUMN tracklist_1001_hash TEXT;
ALTER TABLE sets ADD COLUMN tracklist_1001_synced_at TEXT;
