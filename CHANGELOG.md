# Changelog

All notable changes to Zephyron will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0-alpha] - 2026-03-30

### Added
- New fullscreen player with a smooth cover art carousel
- Quick switch between audio and video with matching backgrounds
- Slide-out playlist in video view and easy song importing

### Changed
- Fullscreen now always uses the CoverFlow style with consistent controls

### Fixed
- Audio and video stay in sync, timestamps line up, and cover art loads more reliably

### Removed
- Older fullscreen modes, the legacy upload UI, and hover overlays

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
