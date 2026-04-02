-- Add explicit year column to events table
-- Year is auto-populated from start_date but can be manually overridden
ALTER TABLE events ADD COLUMN year INTEGER;

-- Backfill year from start_date for existing events
UPDATE events SET year = CAST(SUBSTR(start_date, 1, 4) AS INTEGER)
  WHERE start_date IS NOT NULL AND LENGTH(start_date) >= 4;

-- Indexes for year-based queries and series+year combination
CREATE INDEX IF NOT EXISTS idx_events_year ON events(year DESC);
CREATE INDEX IF NOT EXISTS idx_events_series_year ON events(series, year DESC);
