# Changelog

All notable changes to Zephyron will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-03-21

### Added
- Server-side admin route authentication (all `/api/admin/*` routes now require valid admin session)
- React error boundary for graceful crash recovery
- 404 "Page Not Found" page (replaces silent redirect)
- Health check API endpoint (`GET /api/health`)
- "Request a Set" petition form with Cloudflare Turnstile verification (creates GitHub Issues)
- Changelog page accessible from navigation and settings
- "Report Issue" links in user dropdown, settings, and about page
- Proper HTML meta tags, Open Graph tags, and theme-color for the root page
- GitHub Issue template for set requests
- CORS origin validation (locked to production domain)
- API client request timeouts (30s)
- Changesets configuration for release management

### Changed
- Admin page now uses sidebar navigation instead of horizontal tabs
- Sets, Artists, and Events admin tabs redesigned with consistent card-based layout and search
- "Add Set" merged into the Sets tab as a collapsible form
- Events are now auto-created during detection when no matching event exists (`ensureEvent`)
- Removed hardcoded auth secret fallback (production must set `BETTER_AUTH_SECRET`)

### Fixed
- Event auto-detection during set detection now creates new event records instead of silently failing
- Events tab, Artists tab, and Sets tab search now filters client-side across all relevant fields

### Security
- All admin API routes now validate session cookie and admin role server-side
- Removed hardcoded development auth secret from production fallback path
- CORS locked to production origin instead of wildcard `*`

## [0.1.0] - 2026-03-20

### Added
- Audio streaming from Cloudflare R2 with waveform visualization and live listener counts
- AI-powered tracklist detection from YouTube metadata (Llama 3.2 3B + regex fallback)
- Last.fm track enrichment with album art, tags, and listener counts
- Community annotation system with voting (upvote/downvote/verify)
- Artist pages with auto-created profiles and Last.fm enrichment
- Event pages with set linking
- Full-text and semantic search (Cloudflare Vectorize)
- Playlist creation and management
- Listening history with resume-from-position
- HSL-parametric color system with 4 themes and 10 accent presets
- Custom hue slider and font weight customization
- Two-factor authentication with TOTP and backup codes
- Invite code system for beta access
- Admin dashboard with set management, ML pipeline controls, and moderation queue
- Self-evolving ML prompts based on community feedback
- Server-side OG meta tags for social sharing
- CI/CD with GitHub Actions, Dependabot, PR template, issue templates
