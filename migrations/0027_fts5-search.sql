-- FTS5 virtual content tables (no data duplication — FTS reads from source tables)
CREATE VIRTUAL TABLE sets_fts USING fts5(
  id UNINDEXED, title, artist, venue, event, genre, description,
  content='sets', content_rowid='rowid'
);

CREATE VIRTUAL TABLE artists_fts USING fts5(
  id UNINDEXED, name, tags,
  content='artists', content_rowid='rowid'
);

CREATE VIRTUAL TABLE events_fts USING fts5(
  id UNINDEXED, name, series, location,
  content='events', content_rowid='rowid'
);

CREATE VIRTUAL TABLE tracks_fts USING fts5(
  id UNINDEXED, track_title, track_artist,
  content='detections', content_rowid='rowid'
);

-- Backfill existing data
INSERT INTO sets_fts(sets_fts) VALUES('rebuild');
INSERT INTO artists_fts(artists_fts) VALUES('rebuild');
INSERT INTO events_fts(events_fts) VALUES('rebuild');
INSERT INTO tracks_fts(tracks_fts) VALUES('rebuild');

-- Sync triggers: sets
CREATE TRIGGER sets_fts_insert AFTER INSERT ON sets BEGIN
  INSERT INTO sets_fts(rowid, id, title, artist, venue, event, genre, description)
  VALUES (new.rowid, new.id, new.title, new.artist, new.venue, new.event, new.genre, new.description);
END;
CREATE TRIGGER sets_fts_delete AFTER DELETE ON sets BEGIN
  INSERT INTO sets_fts(sets_fts, rowid, id, title, artist, venue, event, genre, description)
  VALUES ('delete', old.rowid, old.id, old.title, old.artist, old.venue, old.event, old.genre, old.description);
END;
CREATE TRIGGER sets_fts_update AFTER UPDATE ON sets BEGIN
  INSERT INTO sets_fts(sets_fts, rowid, id, title, artist, venue, event, genre, description)
  VALUES ('delete', old.rowid, old.id, old.title, old.artist, old.venue, old.event, old.genre, old.description);
  INSERT INTO sets_fts(rowid, id, title, artist, venue, event, genre, description)
  VALUES (new.rowid, new.id, new.title, new.artist, new.venue, new.event, new.genre, new.description);
END;

-- Sync triggers: artists
CREATE TRIGGER artists_fts_insert AFTER INSERT ON artists BEGIN
  INSERT INTO artists_fts(rowid, id, name, tags) VALUES (new.rowid, new.id, new.name, new.tags);
END;
CREATE TRIGGER artists_fts_delete AFTER DELETE ON artists BEGIN
  INSERT INTO artists_fts(artists_fts, rowid, id, name, tags)
  VALUES ('delete', old.rowid, old.id, old.name, old.tags);
END;
CREATE TRIGGER artists_fts_update AFTER UPDATE ON artists BEGIN
  INSERT INTO artists_fts(artists_fts, rowid, id, name, tags)
  VALUES ('delete', old.rowid, old.id, old.name, old.tags);
  INSERT INTO artists_fts(rowid, id, name, tags) VALUES (new.rowid, new.id, new.name, new.tags);
END;

-- Sync triggers: events
CREATE TRIGGER events_fts_insert AFTER INSERT ON events BEGIN
  INSERT INTO events_fts(rowid, id, name, series, location)
  VALUES (new.rowid, new.id, new.name, new.series, new.location);
END;
CREATE TRIGGER events_fts_delete AFTER DELETE ON events BEGIN
  INSERT INTO events_fts(events_fts, rowid, id, name, series, location)
  VALUES ('delete', old.rowid, old.id, old.name, old.series, old.location);
END;
CREATE TRIGGER events_fts_update AFTER UPDATE ON events BEGIN
  INSERT INTO events_fts(events_fts, rowid, id, name, series, location)
  VALUES ('delete', old.rowid, old.id, old.name, old.series, old.location);
  INSERT INTO events_fts(rowid, id, name, series, location)
  VALUES (new.rowid, new.id, new.name, new.series, new.location);
END;

-- Sync triggers: detections (tracks)
CREATE TRIGGER tracks_fts_insert AFTER INSERT ON detections BEGIN
  INSERT INTO tracks_fts(rowid, id, track_title, track_artist)
  VALUES (new.rowid, new.id, new.track_title, new.track_artist);
END;
CREATE TRIGGER tracks_fts_delete AFTER DELETE ON detections BEGIN
  INSERT INTO tracks_fts(tracks_fts, rowid, id, track_title, track_artist)
  VALUES ('delete', old.rowid, old.id, old.track_title, old.track_artist);
END;
CREATE TRIGGER tracks_fts_update AFTER UPDATE ON detections BEGIN
  INSERT INTO tracks_fts(tracks_fts, rowid, id, track_title, track_artist)
  VALUES ('delete', old.rowid, old.id, old.track_title, old.track_artist);
  INSERT INTO tracks_fts(rowid, id, track_title, track_artist)
  VALUES (new.rowid, new.id, new.track_title, new.track_artist);
END;
