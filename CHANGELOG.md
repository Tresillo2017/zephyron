# Changelog

All notable changes to Zephyron will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0-alpha] - 2026-03-30

### Added
- 1001Tracklists integration — paste a tracklist page source to import tracks with artwork, cue times, labels, and streaming links
- Songs are now a first-class entity — each track in a tracklist links to a song record with rich metadata
- CoverFlow fullscreen player — Apple Music-style 3D album art carousel with keyed sliding transitions between tracks, pixel-based directional movement, and 5-card perspective depth (±2 visible)
- Audio/Video toggle in fullscreen — pill switch between CoverFlow (audio) and YouTube video streaming. Dual-element sync keeps audio and video within 150ms. Video is muted; audio element remains the source of truth
- Ambilight effect — real-time TV-backlight glow behind the video, sampling frames at 60fps via a 64×36 offscreen canvas with CSS `blur(60px) saturate(2)`. Colors adapt instantly to the video content
- Animated background — album colors extracted via node-vibrant drive a 4-point gradient mesh with slow drift animation. In video mode, the ambilight canvas replaces the gradient
- Fullscreen slide-up animation with state machine (hidden → entering → visible → exiting)
- Stacked "w/" tracks on CoverFlow — simultaneous tracks appear as offset cards behind the primary. On hover, they slide out from behind the cover's bottom center into a row below, with glass labels (backdrop blur + inset border)
- Video tracklist panel — slides out from the video player's right edge with a small toggle button that moves with the panel. Video shifts left when the panel opens. Panel matches the video height with scrollable tracks
- VolumeSlider component — reusable volume control with accent-filled track, hover thumb, and mute button. Two variants: `bar` (PlayerBar theme colors) and `fullscreen` (white-on-dark)
- Songs admin tab — browse, search, edit, and manage all songs with cover art, 8 streaming service URLs, and Last.fm data
- Autocomplete for Artist and Event fields when creating or editing a set
- Cover art queue — Cloudflare Queue processes cover art downloads and Last.fm enrichment in background
- Video stream URL storage — YouTube video URLs resolved from Invidious with 6-hour cache TTL
- Streaming service icons using react-icons (Spotify, Apple Music, SoundCloud, Beatport, YouTube, Deezer, Bandcamp, Traxsource)

### Changed
- Fullscreen player is now CoverFlow-only (removed dual tracklist/coverflow mode toggle)
- CoverFlow transitions use pixel-based `translateX` (320px spacing) for true left-to-right sliding like Apple CoverFlow, replacing percentage-based transforms
- Service link pills in fullscreen use neutral glass default state with brand-colored hover (accent glow shadow)
- Play button in fullscreen matches PlayerBar design (accent color with glow shadow)
- Progress bar fill uses accent color `hsl(var(--h3))` instead of white
- Tracklist design — tracks show album art thumbnails and clickable streaming service icons
- Simultaneous tracks ("w/") visually grouped with nested sub-rows
- Set editing consolidated into tabbed panel (Metadata, Tracklist, Danger Zone)
- Detection pipeline uses 1001Tracklists as primary source (0.98 confidence)
- Tracklist HTML parsing runs entirely client-side
- Detection imports use batched D1 writes
- Cover art caching moved to async Cloudflare Queue
- PlayerBar volume control replaced with styled VolumeSlider component

### Fixed
- Tracklist timestamps correctly inherit from parent tracks for sub-position/mashup entries
- Equalizer animation only shows when actively playing, not just loaded
- Cover art caching reads into ArrayBuffer first (fixes stream length error)
- Cover art fetches have 10-second timeout and 2MB size limit
- Labels correctly extracted from HTML-encoded publisher metadata
- Video pauses when audio pauses (from PlayerBar, keyboard, or fullscreen controls)
- Video time sync uses 200ms interval with 150ms drift tolerance for tighter alignment

### Removed
- Browser Rendering / Puppeteer dependency
- Legacy audio upload UI
- Hover vote/edit overlay on tracklist rows
- `fullScreenMode` / `setFullScreenMode` from player store (CoverFlow is the only fullscreen mode now)
- `useVideoColors` hook (replaced by ambilight canvas)

## [0.2.3] - 2026-03-29

### Added
- Sets now stream directly from YouTube — no more uploading audio files to add a set
- Hover over the progress bar while listening to see a thumbnail preview of that moment in the video
- Event pages now show a full artist lineup, a genre breakdown, and stats like total plays and listening time
- Events can now have a separate logo and a background cover photo, both uploadable from the admin panel
- Year badges now appear on events everywhere — so "Tomorrowland 2015" and "Tomorrowland 2026" are always easy to tell apart

### Changed
- Event pages have a new banner design — the cover photo is used as a blurred background with the logo displayed clearly on the side
- DJ set pages now show the linked event as a card with the event's cover image, instead of just plain text
- Events also appear as a label on set cards in grid view
- Adding a new set is now just: paste a YouTube link, review what was auto-detected, and save — no file upload needed

### Fixed
- Audio playback was blocked by browser security restrictions — this has been resolved and sets now play reliably
- Uploading a new event cover image now shows immediately without needing to refresh

## [0.2.2] - 2026-03-21

### Added
- Cookie consent banner — you'll now be asked whether you'd like to allow analytics cookies before any tracking happens
- Your choice is remembered, so you'll only see the banner once

### Changed
- Analytics only loads after you explicitly accept — declining means zero tracking scripts are loaded

## [0.2.1] - 2026-03-21

### Fixed
- Invite codes are no longer used up when registration fails
- Fixed missing database updates for events and two-factor authentication
- Fixed a migration ordering issue that could prevent updates from applying

### Changed
- GitHub repo: added description, topics, and enabled Discussions

## [0.2.0] - 2026-03-21

### Added
- "Request a Set" — submit a set you'd like to see on Zephyron, complete with bot protection
- Changelog page — see what's new from the navigation menu or settings
- "Report Issue" button — quickly report bugs from the user menu, settings, or about page
- Proper page not found screen instead of a silent redirect
- Better link previews when sharing Zephyron on social media

### Changed
- Admin dashboard redesigned with sidebar navigation and search across all sections
- "Add Set" is now part of the Sets tab as a collapsible form
- Events are automatically created when detecting a new set if they don't exist yet

### Fixed
- Event creation during set detection no longer silently fails
- Search in the admin panel now works across all relevant fields

### Security
- Admin pages are now fully protected with server-side authentication
- Stronger security for cross-origin requests

## [0.1.0] - 2026-03-20

### Added
- Stream DJ sets with waveform visualization and live listener counts
- AI-powered tracklist detection — tracks are automatically identified from YouTube metadata
- Track details enriched with album art, tags, and listener counts from Last.fm
- Community annotations — suggest corrections and vote on tracklist accuracy
- Artist pages with auto-created profiles and Last.fm enrichment
- Event pages linking related sets together
- Search across sets, artists, and tracks
- Create and manage playlists
- Listening history with resume-from-where-you-left-off
- 4 themes (Dark, Darker, OLED, Light) and 10 accent color presets with a custom hue slider
- Two-factor authentication with authenticator apps and backup codes
- Invite-only beta access system
