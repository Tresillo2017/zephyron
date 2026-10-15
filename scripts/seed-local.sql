-- LOCAL ONLY fixture data for visual QA. Run via scripts/seed-local.sh (never --remote).
-- Idempotent: every insert is INSERT OR IGNORE with fixed ids. Safe to re-run.
-- Rows that belong to the QA user use INSERT ... SELECT from "user", so they are
-- silently skipped until that user exists (the .sh runs this file again after sign-up).
-- All names are invented. Images are https://picsum.photos placeholders; set/event
-- covers are copied into local R2 (AUDIO_BUCKET) under qa-seed/ keys by the .sh.

-- Invite codes (self-registration requires one)
INSERT OR IGNORE INTO invite_codes (id, code, created_by, max_uses, used_count, note)
VALUES ('qa-inv-01', 'QA-BETA-2026', NULL, 0, 0, 'local QA fixture');

-- Artists
INSERT OR IGNORE INTO artists (id, name, slug, image_url, background_url, bio_summary, bio_full, tags, listeners, playcount, instagram_url, soundcloud_url, x_url, youtube_url, created_at) VALUES
('qa-art-01', 'Nova Keys', 'nova-keys', 'https://picsum.photos/seed/zeph-artist-nova-keys/600/600', 'https://picsum.photos/seed/zeph-banner-nova-keys/1600/500', 'Deep house producer from Lisbon known for warm chord loops.', 'Nova Keys builds long, slow-burning deep house sets. Fixture bio for layout testing only.', '["deep house","garage","melodic house"]', 128000, 940000, 'https://instagram.com/example-nova', 'https://soundcloud.com/example-nova', 'https://x.com/example_nova', NULL, '2026-01-10T10:00:00Z'),
('qa-art-02', 'Helix Ward', 'helix-ward', 'https://picsum.photos/seed/zeph-artist-helix-ward/600/600', 'https://picsum.photos/seed/zeph-banner-helix-ward/1600/500', 'Techno and trance hybrid from Berlin.', 'Helix Ward blends hypnotic techno with uplifting trance builds. Fixture bio.', '["techno","trance","electro"]', 254000, 2100000, 'https://instagram.com/example-helix', NULL, NULL, 'https://youtube.com/@example-helix', '2026-01-11T10:00:00Z'),
('qa-art-03', 'Kaito Ember', 'kaito-ember', 'https://picsum.photos/seed/zeph-artist-kaito-ember/600/600', 'https://picsum.photos/seed/zeph-banner-kaito-ember/1600/500', 'Minimal and downtempo selector based in Osaka.', 'Kaito Ember favours sparse grooves and late-night downtempo. Fixture bio.', '["minimal","melodic house","downtempo"]', 67000, 410000, NULL, 'https://soundcloud.com/example-kaito', NULL, NULL, '2026-01-12T10:00:00Z'),
('qa-art-04', 'Lumen Drift', 'lumen-drift', 'https://picsum.photos/seed/zeph-artist-lumen-drift/600/600', 'https://picsum.photos/seed/zeph-banner-lumen-drift/1600/500', 'Ambient and progressive house project.', 'Lumen Drift makes slow, cinematic progressive journeys. Fixture bio.', '["ambient","progressive house"]', 41000, 230000, 'https://instagram.com/example-lumen', NULL, 'https://x.com/example_lumen', NULL, '2026-01-13T10:00:00Z'),
('qa-art-05', 'Varna Sol', 'varna-sol', 'https://picsum.photos/seed/zeph-artist-varna-sol/600/600', 'https://picsum.photos/seed/zeph-banner-varna-sol/1600/500', 'Afro house and peak-time techno DJ.', 'Varna Sol plays percussive afro house and driving peak-hour techno. Fixture bio.', '["afro house","tech house","techno"]', 189000, 1300000, 'https://instagram.com/example-varna', 'https://soundcloud.com/example-varna', NULL, 'https://youtube.com/@example-varna', '2026-01-14T10:00:00Z'),
('qa-art-06', 'Orbit Kin', 'orbit-kin', 'https://picsum.photos/seed/zeph-artist-orbit-kin/600/600', NULL, 'Drum and bass and breakbeat producer.', 'Orbit Kin works between liquid drum and bass and broken beats. Fixture bio.', '["drum and bass","breakbeat"]', 23000, 98000, NULL, NULL, 'https://x.com/example_orbit', NULL, '2026-01-15T10:00:00Z');

-- Events / festivals
INSERT OR IGNORE INTO events (id, name, slug, series, description, website, location, start_date, end_date, cover_image_r2_key, tags, year, instagram_url, aftermovie_url, created_at) VALUES
('qa-evt-01', 'Zephyron Fest 2026', 'zephyron-fest-2026', 'Zephyron Fest', 'Flagship two-day festival on the riverside. Fixture description.', 'https://example.com/zephyron-fest', 'Riverside Park, Lisbon', '2026-07-18', '2026-07-19', 'qa-seed/event-01.jpg', '["festival","open air"]', 2026, 'https://instagram.com/example-zfest', NULL, '2026-02-01T10:00:00Z'),
('qa-evt-02', 'Night Pulse Festival', 'night-pulse-festival', 'Night Pulse', 'Three nights of techno and trance in a converted dockyard. Fixture description.', 'https://example.com/night-pulse', 'Dockyard 4, Hamburg', '2026-08-08', '2026-08-10', 'qa-seed/event-02.jpg', '["techno","trance"]', 2026, NULL, 'https://youtube.com/watch?v=aftermovie-fixture', '2026-02-02T10:00:00Z'),
('qa-evt-03', 'Cobalt Sound Weekender', 'cobalt-sound-weekender', 'Cobalt Sound', 'Weekend of deep and melodic house in the hills. Fixture description.', NULL, 'Hills Estate, Porto', '2026-09-05', '2026-09-06', 'qa-seed/event-03.jpg', '["deep house","melodic house"]', 2026, NULL, NULL, '2026-02-03T10:00:00Z'),
('qa-evt-04', 'Solstice Warehouse Series', 'solstice-warehouse-series', 'Solstice', 'Single-night warehouse series around the summer solstice. Fixture description.', NULL, 'Warehouse 12, Berlin', '2026-06-21', '2026-06-21', 'qa-seed/event-04.jpg', '["warehouse","afro house"]', 2026, NULL, NULL, '2026-02-04T10:00:00Z');

-- Sets (audio is a placeholder key; playback is not expected to work)
INSERT OR IGNORE INTO sets (id, title, artist, description, genre, subgenre, venue, event, recorded_date, duration_seconds, r2_key, cover_image_r2_key, audio_format, bitrate, detection_status, play_count, created_at, updated_at, source_url, artist_id, event_id, stream_type) VALUES
('qa-set-01', 'Hangar Nine Opening', 'Nova Keys', 'Fixture set 01.', 'House', 'Deep House', 'Hangar 9', 'Zephyron Fest 2026', '2026-03-14', 3600, 'qa-seed/audio-placeholder.mp3', 'qa-seed/set-01.jpg', 'mp3', 320, 'completed', 1520, '2026-03-20T10:00:00Z', '2026-03-20T10:00:00Z', NULL, 'qa-art-01', 'qa-evt-01', 'invidious'),
('qa-set-02', 'Night Pulse Closing Set', 'Helix Ward', 'Fixture set 02.', 'Techno', 'Hard Techno', 'Dockyard 4', 'Night Pulse Festival', '2026-02-02', 5400, 'qa-seed/audio-placeholder.mp3', 'qa-seed/set-02.jpg', 'mp3', 320, 'completed', 8810, '2026-03-21T10:00:00Z', '2026-03-21T10:00:00Z', NULL, 'qa-art-02', 'qa-evt-02', 'invidious'),
('qa-set-03', 'Cobalt Sessions Vol. 4', 'Kaito Ember', 'Fixture set 03.', 'House', 'Melodic House', 'Hills Estate', 'Cobalt Sound Weekender', '2026-05-30', 4500, 'qa-seed/audio-placeholder.mp3', 'qa-seed/set-03.jpg', 'mp3', 256, 'completed', 402, '2026-03-22T10:00:00Z', '2026-03-22T10:00:00Z', NULL, 'qa-art-03', 'qa-evt-03', 'invidious'),
('qa-set-04', 'Solstice Warehouse Live', 'Lumen Drift', 'Fixture set 04.', 'Ambient', 'Downtempo', 'Warehouse 12', 'Solstice Warehouse Series', '2026-06-21', 3000, 'qa-seed/audio-placeholder.mp3', 'qa-seed/set-04.jpg', 'mp3', 256, 'pending', 77, '2026-03-23T10:00:00Z', '2026-03-23T10:00:00Z', NULL, 'qa-art-04', 'qa-evt-04', 'invidious'),
('qa-set-05', 'Dune Radio Mix 12', 'Varna Sol', 'Fixture set 05.', 'Afro House', NULL, 'Dune Radio Studio', NULL, '2026-01-18', 3900, 'qa-seed/audio-placeholder.mp3', 'qa-seed/set-05.jpg', 'mp3', 320, 'completed', 2290, '2026-03-24T10:00:00Z', '2026-03-24T10:00:00Z', NULL, 'qa-art-05', NULL, 'invidious'),
('qa-set-06', 'Orbit Kin Liquid Session', 'Orbit Kin', 'Fixture set 06.', 'Drum & Bass', 'Liquid', 'Studio A', NULL, '2026-04-02', 2700, 'qa-seed/audio-placeholder.mp3', 'qa-seed/set-06.jpg', 'mp3', 192, 'pending', 130, '2026-03-25T10:00:00Z', '2026-03-25T10:00:00Z', NULL, 'qa-art-06', NULL, 'invidious'),
('qa-set-07', 'Helix Ward Trance Ascent', 'Helix Ward', 'Fixture set 07.', 'Trance', 'Progressive Trance', 'Riverside Stage', 'Zephyron Fest 2026', '2025-11-08', 6000, 'qa-seed/audio-placeholder.mp3', 'qa-seed/set-07.jpg', 'mp3', 320, 'completed', 5602, '2026-03-26T10:00:00Z', '2026-03-26T10:00:00Z', NULL, 'qa-art-02', 'qa-evt-01', 'invidious'),
('qa-set-08', 'Lumen Drift Progressive Journey', 'Lumen Drift', 'Fixture set 08.', 'House', 'Progressive House', NULL, NULL, '2025-12-12', 4800, 'qa-seed/audio-placeholder.mp3', 'qa-seed/set-08.jpg', 'mp3', 256, 'none', 61, '2026-03-27T10:00:00Z', '2026-03-27T10:00:00Z', NULL, 'qa-art-04', NULL, 'invidious'),
('qa-set-09', 'Nova Keys Garage Fragments', 'Nova Keys', 'Fixture set 09.', 'Garage', 'UK Garage', NULL, NULL, '2026-02-20', 2400, 'qa-seed/audio-placeholder.mp3', 'qa-seed/set-09.jpg', 'mp3', 192, 'pending', 214, '2026-03-28T10:00:00Z', '2026-03-28T10:00:00Z', NULL, 'qa-art-01', NULL, 'invidious'),
('qa-set-10', 'Kaito Ember Minimal Night', 'Kaito Ember', 'Fixture set 10.', 'Minimal', NULL, 'Dockyard 4', 'Night Pulse Festival', '2026-02-02', 3300, 'qa-seed/audio-placeholder.mp3', 'qa-seed/set-10.jpg', 'mp3', 320, 'completed', 690, '2026-03-29T10:00:00Z', '2026-03-29T10:00:00Z', NULL, 'qa-art-03', 'qa-evt-02', 'invidious'),
('qa-set-11', 'Varna Sol Sunrise Tech', 'Varna Sol', 'Fixture set 11.', 'Tech House', NULL, 'Warehouse 12', 'Solstice Warehouse Series', '2026-06-21', 4200, 'qa-seed/audio-placeholder.mp3', 'qa-seed/set-11.jpg', 'mp3', 320, 'completed', 1775, '2026-03-30T10:00:00Z', '2026-03-30T10:00:00Z', NULL, 'qa-art-05', 'qa-evt-04', 'invidious'),
('qa-set-12', 'Orbit Kin Breaks Sampler', 'Orbit Kin', 'Fixture set 12.', 'Breakbeat', NULL, NULL, NULL, '2026-01-05', 1800, 'qa-seed/audio-placeholder.mp3', 'qa-seed/set-12.jpg', 'mp3', 192, 'none', 18, '2026-03-31T10:00:00Z', '2026-03-31T10:00:00Z', NULL, 'qa-art-06', NULL, 'invidious'),
('qa-set-13', 'Cobalt Crew Warmup', 'Nova Keys & Lumen Drift', 'Fixture set 13, multi-artist.', 'House', 'Deep House', 'Hills Estate', 'Cobalt Sound Weekender', '2026-09-05', 3600, 'qa-seed/audio-placeholder.mp3', 'qa-seed/set-13.jpg', 'mp3', 256, 'completed', 455, '2026-04-01T10:00:00Z', '2026-04-01T10:00:00Z', NULL, 'qa-art-01', 'qa-evt-03', 'invidious'),
('qa-set-14', 'Helix Ward Electro Pulse', 'Helix Ward', 'Fixture set 14.', 'Electro', NULL, NULL, NULL, '2026-03-01', 4000, 'qa-seed/audio-placeholder.mp3', 'qa-seed/set-14.jpg', 'mp3', 256, 'pending', 340, '2026-04-02T10:00:00Z', '2026-04-02T10:00:00Z', NULL, 'qa-art-02', NULL, 'invidious'),
('qa-set-15', 'Kaito Ember Downtempo Dusk', 'Kaito Ember', 'Fixture set 15.', 'Downtempo', NULL, NULL, NULL, '2025-10-10', 5100, 'qa-seed/audio-placeholder.mp3', 'qa-seed/set-15.jpg', 'mp3', 192, 'none', 27, '2026-04-03T10:00:00Z', '2026-04-03T10:00:00Z', NULL, 'qa-art-03', NULL, 'invidious'),
('qa-set-16', 'Varna Sol Peak Hour', 'Varna Sol', 'Fixture set 16.', 'Techno', 'Peak Time', 'Riverside Stage', 'Zephyron Fest 2026', '2026-07-19', 7200, 'qa-seed/audio-placeholder.mp3', 'qa-seed/set-16.jpg', 'mp3', 320, 'completed', 3380, '2026-04-04T10:00:00Z', '2026-04-04T10:00:00Z', NULL, 'qa-art-05', 'qa-evt-01', 'invidious');

-- Multi-artist links
INSERT OR IGNORE INTO set_artists (set_id, artist_id, position) VALUES
('qa-set-13', 'qa-art-01', 0), ('qa-set-13', 'qa-art-04', 1);

-- Songs and detected tracklists (sets 01, 02, 03, 07)
INSERT OR IGNORE INTO songs (id, title, artist, label, album, cover_art_url, source, created_at) VALUES
('qa-song-01', 'Quiet Harbour', 'Nova Keys', 'Fixture Records', 'Harbour EP', 'https://picsum.photos/seed/zeph-song-01/300/300', 'manual', '2026-03-01T10:00:00Z'),
('qa-song-02', 'Pressure Lines', 'Helix Ward', 'Fixture Records', 'Lines', 'https://picsum.photos/seed/zeph-song-02/300/300', 'manual', '2026-03-01T10:00:00Z'),
('qa-song-03', 'Warm Static', 'Kaito Ember', NULL, NULL, 'https://picsum.photos/seed/zeph-song-03/300/300', 'manual', '2026-03-01T10:00:00Z'),
('qa-song-04', 'Ascent (Fixture Mix)', 'Helix Ward', NULL, 'Ascent', 'https://picsum.photos/seed/zeph-song-04/300/300', 'manual', '2026-03-01T10:00:00Z');

INSERT OR IGNORE INTO detections (id, set_id, track_title, track_artist, start_time_seconds, end_time_seconds, confidence, detection_method, upvotes, downvotes, is_verified, created_at, song_id) VALUES
('qa-det-01', 'qa-set-01', 'Quiet Harbour', 'Nova Keys', 0, 420, 0.94, 'llm', 12, 0, 1, '2026-03-20T10:05:00Z', 'qa-song-01'),
('qa-det-02', 'qa-set-01', 'Unknown Edit', 'Nova Keys', 420, 880, 0.41, 'llm', 2, 3, 0, '2026-03-20T10:05:00Z', NULL),
('qa-det-03', 'qa-set-02', 'Pressure Lines', 'Helix Ward', 0, 600, 0.88, 'llm', 9, 1, 0, '2026-03-21T10:05:00Z', 'qa-song-02'),
('qa-det-04', 'qa-set-03', 'Warm Static', 'Kaito Ember', 1200, 1900, 0.79, 'llm', 4, 0, 0, '2026-03-22T10:05:00Z', 'qa-song-03'),
('qa-det-05', 'qa-set-07', 'Ascent (Fixture Mix)', 'Helix Ward', 0, 900, 0.97, 'llm', 31, 2, 1, '2026-03-26T10:05:00Z', 'qa-song-04');

INSERT OR IGNORE INTO annotations (id, detection_id, set_id, anonymous_id, track_title, track_artist, start_time_seconds, end_time_seconds, annotation_type, status, created_at) VALUES
('qa-ann-01', 'qa-det-02', 'qa-set-01', 'qa-anon-01', 'Unknown Edit', 'Nova Keys', 420, 880, 'correction', 'pending', '2026-03-21T09:00:00Z');

-- Playlists (public, not owned by a user) and their items
INSERT OR IGNORE INTO playlists (id, user_id, anonymous_id, title, description, is_public, created_at, updated_at) VALUES
('qa-pl-01', NULL, 'qa-anon-01', 'Late Night Deep', 'Fixture playlist.', 1, '2026-04-10T10:00:00Z', '2026-04-10T10:00:00Z'),
('qa-pl-02', NULL, 'qa-anon-01', 'Festival Warmup', 'Fixture playlist.', 1, '2026-04-11T10:00:00Z', '2026-04-11T10:00:00Z');
INSERT OR IGNORE INTO playlist_items (id, playlist_id, set_id, position, added_at) VALUES
('qa-pli-01', 'qa-pl-01', 'qa-set-01', 0, '2026-04-10T10:00:00Z'),
('qa-pli-02', 'qa-pl-01', 'qa-set-03', 1, '2026-04-10T10:00:00Z'),
('qa-pli-03', 'qa-pl-01', 'qa-set-09', 2, '2026-04-10T10:00:00Z'),
('qa-pli-04', 'qa-pl-02', 'qa-set-02', 0, '2026-04-11T10:00:00Z'),
('qa-pli-05', 'qa-pl-02', 'qa-set-16', 1, '2026-04-11T10:00:00Z');

-- ===== QA user rows: skipped until the QA user exists =====
-- Owned playlist for QA user
INSERT OR IGNORE INTO playlists (id, user_id, anonymous_id, title, description, is_public, created_at, updated_at)
SELECT 'qa-pl-03', id, NULL, 'QA Private Mix', 'Owned by qa@zephyron.test.', 0, '2026-04-12T10:00:00Z', '2026-04-12T10:00:00Z' FROM user WHERE email = 'qa@zephyron.test';
INSERT OR IGNORE INTO playlist_items (id, playlist_id, set_id, position, added_at)
SELECT 'qa-pli-06', 'qa-pl-03', 'qa-set-07', 0, '2026-04-12T10:00:00Z' FROM user WHERE email = 'qa@zephyron.test';

-- Listening history, likes, follows
INSERT OR IGNORE INTO listen_history (id, user_id, set_id, last_position_seconds, listen_count, last_listened_at)
SELECT 'qa-hist-' || s.n, u.id, s.set_id, 600, s.n, '2026-05-0' || s.n || 'T20:00:00Z'
FROM user u, (SELECT 1 AS n, 'qa-set-01' AS set_id UNION ALL SELECT 2, 'qa-set-02' UNION ALL SELECT 3, 'qa-set-07') s
WHERE u.email = 'qa@zephyron.test';
INSERT OR IGNORE INTO user_set_likes (user_id, set_id, liked_at)
SELECT u.id, s.set_id, '2026-05-01T12:00:00Z' FROM user u, (SELECT 'qa-set-01' AS set_id UNION ALL SELECT 'qa-set-07') s WHERE u.email = 'qa@zephyron.test';
INSERT OR IGNORE INTO user_song_likes (user_id, song_id, liked_at)
SELECT u.id, 'qa-song-01', '2026-05-01T12:00:00Z' FROM user u WHERE u.email = 'qa@zephyron.test';
INSERT OR IGNORE INTO artist_follows (user_id, artist_id, created_at)
SELECT u.id, a.artist_id, '2026-05-01T12:00:00Z' FROM user u, (SELECT 'qa-art-01' AS artist_id UNION ALL SELECT 'qa-art-02') a WHERE u.email = 'qa@zephyron.test';

-- Activity feed rows
INSERT OR IGNORE INTO activity_items (id, user_id, activity_type, metadata, is_public, created_at)
SELECT 'qa-act-01', u.id, 'song_liked', '{"songTitle":"Quiet Harbour","artist":"Nova Keys"}', 1, '2026-05-02T10:00:00Z' FROM user u WHERE u.email = 'qa@zephyron.test';
INSERT OR IGNORE INTO activity_items (id, user_id, activity_type, metadata, is_public, created_at)
SELECT 'qa-act-02', u.id, 'playlist_created', '{"playlistTitle":"QA Private Mix"}', 1, '2026-05-03T10:00:00Z' FROM user u WHERE u.email = 'qa@zephyron.test';
INSERT OR IGNORE INTO activity_items (id, user_id, activity_type, metadata, is_public, created_at)
SELECT 'qa-act-03', u.id, 'badge_earned', '{"badgeName":"First Listen"}', 1, '2026-05-04T10:00:00Z' FROM user u WHERE u.email = 'qa@zephyron.test';

-- QA admin user: promote + verify (the user row itself is created by the sign-up API in the .sh)
UPDATE user SET role = 'admin', emailVerified = 1, is_profile_public = 1, bio = 'Local QA account.'
WHERE email = 'qa@zephyron.test';
