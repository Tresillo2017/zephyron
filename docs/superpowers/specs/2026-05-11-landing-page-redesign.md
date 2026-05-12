# Landing Page Redesign

**Date:** 2026-05-11
**Status:** Approved, ready for implementation

## Goal

Replace the current landing page with a content-forward design that shows real sets from the catalog up front. Target audience is the electronic music enthusiast crowd — people who know what DJ sets are and respond to seeing actual content rather than feature bullets.

## Structure (top to bottom)

1. **Nav** — logo, Sign In link, Get Access button (links to `/register`)
2. **Hero** — full-bleed dark background with most-played set's cover art, headline bottom-left, featured set info bottom-right
3. **Catalog grid** — "Recently Added", 6 sets in a 3-column grid
4. **Features** — 2 cards: AI Detection + Community Verification
5. **CTA** — centered, "Ready to listen?"
6. **Footer** — as today, minus "By invitation only"

**Removed from current page:**
- Feature 3 (Self-Improving ML) — the feedback loop has been removed from the codebase; this section is now false
- Tech Stack section — developer-facing, not visitor-facing

## Data

No new API endpoints. Two parallel calls to existing public routes on mount:

```
GET /api/sets?sort=popular&pageSize=1   → featured set (hero)
GET /api/sets?sort=newest&pageSize=6    → recent sets (catalog grid)
```

Both routes are already public (no auth). `sort=popular` → `ORDER BY play_count DESC`, `sort=newest` → `ORDER BY created_at DESC` (default). No backend changes required.

## Components

`LandingPage.tsx` is fully replaced (self-contained, no shared state with the app).

### `useLandingData()` hook (internal, not exported)

- Fires both fetch calls in parallel via `Promise.all` on mount
- Returns `{ featured: DjSet | null, recent: DjSet[], loading: boolean }`
- No error state surfaced to visitor — silent fallback on failure

### Hero

- **Background**: if `featured.cover_image_r2_key` is set, render `<img>` as `position: absolute, object-fit: cover` with a dark overlay (gradient from transparent at top to `--b6` at bottom). If null, pure CSS gradient fallback identical to current page.
- **Bottom-left**: headline + subline + two CTAs
- **Bottom-right**: featured set title, artist, genre tag — all wrapped in a `<Link to="/app/sets/:id">` (auth-gates to login, acceptable for beta)
- **Waveform**: static CSS bar decoration, purely visual, no audio

### Catalog grid

- 3 columns on desktop (`lg:`), 2 on tablet (`sm:`), 1 on mobile
- Each card: cover image or deterministic color gradient fallback (derived from set `id`), title, artist, duration, genre tag
- Clicking a card → `<Link to="/app/sets/:id">` (same auth-gate)
- **No hover play button** — that's app behaviour, not landing page behaviour
- Track count omitted — not in `listSets` response

### Inline `LandingSetCard` component (inside `LandingPage.tsx`, not exported)

A minimal card component with no player integration or auth dependencies. Separate from the app's full `SetCard` component intentionally.

### Features section

- 2 cards side-by-side (stacked on mobile)
- **AI Track Detection**: icon, title, description, hardcoded stat `94%` / "average detection accuracy"
- **Community Verification**: icon, title, description, hardcoded stat `12k+` / "community corrections"
- Stats are manually maintained — not pulled from DB

## Copy

| Location | Old | New |
|---|---|---|
| Hero badge | `INVITE-ONLY BETA` | `INVITE-ONLY BETA` (keep) |
| Hero headline | "The platform for DJ sets" | "Every DJ set, every track identified." |
| Hero subline | "Curated festival and club mixes with AI-powered tracklists that get smarter with every listen." | "Curated festival and club mixes with community-verified tracklists. Find sets by artist, event, or track." |
| Hero primary CTA | "Request Access" | "Request Access" (keep) |
| Bottom CTA subline | "Join the community shaping the future of DJ set discovery." | "Join the community building the most complete database of DJ set tracklists." |
| Footer | "© 2026 Zephyron — By invitation only" | "© 2026 Zephyron" |

## Edge Cases

| Case | Behaviour |
|---|---|
| Loading | Skeleton placeholders (dark rounded rects) for hero background and each grid card |
| Featured fetch fails | Hero renders with gradient-only background, no set info in corner |
| Recent fetch fails or returns empty | Catalog grid section hidden entirely |
| Set has no `cover_image_r2_key` | Deterministic HSL gradient derived from `set.id` (same approach as app) |
| Set has no genre | Genre tag omitted from card |

## Files Changed

| File | Change |
|---|---|
| `src/pages/LandingPage.tsx` | Full rewrite |

No other files touched. No backend changes.
