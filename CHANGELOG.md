# Changelog

All notable changes to Zephyron will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Here's the full rewritten changelog for Zephyron. I made every entry shorter, used simple everyday words, and focused on what it means for you as a user — like faster listening or easier navigation. [keepachangelog](https://keepachangelog.com/en/1.1.0/)

## [0.4.0-alpha] - 2026-04-14

### New
- Profile system with listening stats, heatmaps, and weekday patterns.
- Badge system with 20 achievements — earn them by listening, discovering, and participating.
- Activity feed shows your listening milestones, badges earned, and playlist updates.
- Wrapped feature generates annual and monthly analytics with shareable images.
- Skeleton loaders throughout the app show placeholders while content loads.
- Artists now have profile images stored on R2 with automatic multi-size generation.
- Session tracking automatically saves your listening history and position.

### Improved
- Profile pages show quick stats overview with total hours, sessions, and top artists.
- Avatars now generate in multiple sizes (40px, 80px, 200px) for better performance.
- What's New popout redesigned to match app design with proper card styling.
- GitHub Actions now automatically check TypeScript, run tests, and scan for security issues.
- Admin panel can auto-upload artist images from 1001Tracklists.

### Fixed
- Build now works properly — resolved all 66 TypeScript errors across the entire codebase.
- Album color extraction works again (node-vibrant v4 compatibility fix).
- Cloudflare Workers environment types are now consistent and won't conflict during builds.
- Profile stats API correctly validates Better Auth user IDs.
- Avatar URLs persist properly in Better Auth sessions.
- Toast notifications are now readable on dark backgrounds.
- Stats endpoint uses proper DB-querying functions instead of raw queries.

## [0.3.4-alpha] - 2026-04-03

### New
- Theater mode: storyboard thumbnail preview on progress bar hover, with detection chapter markers.
- Theater mode: Now Playing overlay shows concurrent tracks (w/) with cover art, title, and artist.
- Theater mode: Up Next notification shows a stacked cover art and `+x` badge when the next slot has simultaneous tracks, plus a `w/ Track A, Track B` line.
- Fullscreen player: storyboard thumbnail preview and detection markers on both progress bars (theater and standard).

### Improved
- Player bar: volume slider is always visible (no longer hover-only); play/pause button is properly centered.
- Player bar: progress bar is taller and higher contrast, easier to see at low playback progress.
- Player bar hides completely in theater mode — theater controls overlay takes over.
- Theater mode progress bar matches the standard fullscreen design (5 px, same track color).
- Theater mode controls overlay uses a drop shadow gradient instead of a backdrop blur.
- Now Playing overlay no longer shifts right when the tracklist panel is open.
- Theater mode animations rewritten with spring easing curves and motion blur — smoother entry, flash, and exit throughout.

### Fixed
- Play/pause button in player bar is now correctly centered relative to the other controls.
- Now Playing overlay no longer disappears for a moment after the track-change flash animation ends.

## [0.3.3-alpha] - 2026-04-03

### New
- Add sets from SoundCloud, HearThis.at, or with no source at all — not just YouTube.
- Sets without a stream show "Not Available" and let logged-in users suggest a source (YouTube, SoundCloud, or HearThis link).
- SoundCloud/HearThis sets link out to the original platform with a "Listen on..." button.
- Multiple artists per set — add co-DJs for b2b sets when creating or editing.
- Request a set without needing a YouTube link; pick a source type or leave it blank.
- Admin edit buttons on Set, Artist, and Event pages — one click to jump to the admin editor.
- Admins: Filter sets by genre, source type, detection status, or search by title/artist/event/venue.
- Admins: Select multiple sets and batch delete, re-detect, or update genre/status.
- Admins: Server-side pagination (50 per page) with page controls.
- Admins: Inline panel to review and approve/reject source requests and set requests.
- Admins: Edit modal now supports adding/removing co-artists with autocomplete.
- Extension: Importing a duplicate artist now updates its info instead of failing.

### Improved
- Set requests now save to the database instead of creating GitHub issues — no more Turnstile captcha.
- Source type is set correctly when creating sets (was always "invidious" before, even without a YouTube link).
- Admin set list shows source type, duration, detection status, and play count columns.

### Fixed
- Edit modal can now be closed when opened from Set/Artist/Event page edit buttons.

## [0.3.2-alpha] - 2026-04-03

### New
- Your volume setting now saves, so it stays the same every time you open the app.
- Tracklists load right away when you play a set from home or search — no extra clicks needed.
- Usernames must be unique; you'll know instantly if yours is taken.
- Admins: Easily manage users — set passwords, log in as them, ban with reasons and dates, or delete accounts.
- Admins: Search users by email in the list.

### Improved
- Tracklists in video player now always show group tracks (like "w/") with clear labels.
- Switching audio/video in player now has smooth fades and better animations.
- Top navigation has a nice blurred glass effect.
- Dropdown arrows match your theme; highlights and scrollbars look better everywhere.

### Fixed
- Top navigation blur now works properly when scrolling.

## [0.3.1-alpha] - 2026-04-02

### New
- Events can have a YouTube aftermovie that plays as the background video.
- Link events/artists to 1001Tracklists for future auto-updates.
- Artist pages show streaming and social links in the sidebar.
- Event pages show social links and a "Connect" section.
- Search now finds events too — try "Ultra 2025".
- Events have a year field for easy edition switching like Tomorrowland 2024/2025.
- Event pages let you switch years with a simple bar.
- Artist and event pages use the same clean banner design as sets.
- Admins: Import from 1001Tracklists fills in links, images, and more.
- Admins: Easy section to update from 1001Tracklists.
- Admins: Link/unlink sets to events right in the edit screen.

### Improved
- Events sort by newest year first.
- Event/artist headers match set page style.

## [0.3.0-alpha] - 2026-03-30

### New
- Fullscreen player with smooth cover art slides.
- Quick audio/video toggle with matching visuals.
- Easy playlist slide-out and song adds in video mode.

### Improved
- Fullscreen always uses the smooth CoverFlow style.

### Fixed
- Audio/video syncs perfectly; covers load reliably.

### Removed
- Old fullscreen options and upload screens.

## [0.2.3] - 2026-03-29

### New
- Stream sets straight from YouTube — no file uploads.
- Hover progress bar for video previews.
- Event pages show full lineup, genres, and stats like total plays.
- Events get logos and cover photos.
- Year badges on all events for easy spotting.

### Improved
- Event banners use blurred covers with clear logos.
- Sets show linked events as nice cards.
- Add sets faster: paste YouTube link, review, save.

### Fixed
- Audio now plays without browser blocks.
- New event covers show instantly.

## [0.2.2] - 2026-03-21

### New
- Cookie banner asks if you want analytics — your choice sticks.

### Improved
- No tracking until you say yes.

## [0.2.1] - 2026-03-21

### Fixed
- Invite codes don't expire on failed sign-ups.
- Event and 2FA database issues resolved.
- Update process fixed.

### Improved
- GitHub repo has better info and discussions.

## [0.2.0] - 2026-03-21

### New
- Request missing sets with spam protection.
- Changelog page in menu/settings.
- Quick "Report Issue" button.
- Friendly 404 page.
- Better social media previews.

### Improved
- Admin dashboard with sidebar and search.
- "Add Set" now folds into Sets tab.
- Events auto-create when adding sets.

### Fixed
- Event creation works reliably.
- Admin search covers all fields.

### Security
- Admin areas fully login-protected.
- Safer web requests.

## [0.1.0] - 2026-03-20

### New
- Stream DJ sets with waveforms and live listener counts.
- Auto-detect tracks from YouTube.
- Tracks show art, tags, and Last.fm stats.
- Vote on and suggest tracklist fixes.
- Artist pages with auto-profiles.
- Event pages link related sets.
- Search sets, artists, tracks.
- Playlists and listening history with resume.
- 4 themes, 10 colors, custom accents.
- 2FA with apps and backups.
- Invite-only access.
