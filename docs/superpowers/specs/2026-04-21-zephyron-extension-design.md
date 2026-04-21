# Zephyron Chrome Extension — Design Spec

**Date:** 2026-04-21  
**Status:** Approved  
**Folder:** `../zephyron-extension` (sibling to main repo)

---

## Overview

A Chrome extension (Manifest V3) that runs as a side panel on `1001tracklists.com`. Detects page context (tracklist / event / artist), extracts structured data from the live DOM, and bulk-imports sets, artists, and events into a Zephyron instance via the admin API. Authenticated with a static admin API key configured in extension settings.

---

## Architecture

### Components

| Component | File | Purpose |
|---|---|---|
| Content script | `src/content/index.ts` | DOM scraping + Schema.org extraction on 1001TL pages |
| Side panel | `src/panel/` | React UI — preview, configure, confirm imports |
| Background worker | `src/background/index.ts` | Side panel lifecycle, message relay |
| Settings page | `src/options/` | Configure Zephyron URL + admin API key |

### Communication Flow

```
1001TL page DOM
  → content script (detect page type, extract microdata)
  → background worker (relay via chrome.runtime.sendMessage)
  → side panel (preview + user confirmation)
  → Zephyron Admin API (create set / artist / event)
```

The side panel requests a scrape by sending `{ type: 'SCRAPE_PAGE' }` to the background worker, which forwards it to the active tab's content script. The content script responds with structured `PageData`.

---

## Page Detection & Data Extraction

The content script detects page type from the URL path and extracts data using Schema.org `itemprop` microdata — the same approach proven in `worker/services/tracklists-1001.ts`.

### Tracklist page (`/tracklist/*`)

```ts
interface TracklistPageData {
  type: 'tracklist'
  tracklist_id: string         // from URL
  title: string                // set/mix title
  dj_name: string
  date?: string                // ISO date
  venue?: string
  event_name?: string
  duration_seconds?: number
  tracks: TrackItem[]
}

interface TrackItem {
  position: number
  artist: string
  title: string
  cue_time?: string
  start_seconds?: number
  duration_seconds?: number
  is_continuation?: boolean
  is_identified?: boolean
  spotify_url?: string
  apple_music_url?: string
  soundcloud_url?: string
  beatport_url?: string
  youtube_url?: string
  deezer_url?: string
  bandcamp_url?: string
  traxsource_url?: string
  track_content_id?: string
  artwork_url?: string
  label?: string
}
```

### Event page (`/source/*` or `/event/*`)

```ts
interface EventPageData {
  type: 'event'
  event_name: string
  date?: string
  venue?: string
  location?: string
  sets: EventSetItem[]
}

interface EventSetItem {
  dj_name: string
  set_title?: string
  tracklist_url?: string       // 1001TL tracklist URL if linked
}
```

### Artist page (`/dj/*`)

```ts
interface ArtistPageData {
  type: 'artist'
  name: string
  genres?: string[]
  bio?: string
  website?: string
  tracklists: ArtistTracklistItem[]
}

interface ArtistTracklistItem {
  title: string
  date?: string
  tracklist_url: string
  tracklist_id: string
}
```

---

## Side Panel UI Flows

### Tracklist import

1. Panel opens — shows parsed set metadata (title, DJ, date, venue, track count, identified/unidentified ratio)
2. Fields editable before import: title, artist, genre, venue, event name, date
3. Track list preview (scrollable, first 10 shown, expand for all)
4. **Find on YouTube** → calls `GET /api/admin/youtube-search?q=<dj+title>` → shows top 3 matches with thumbnails; user picks one or skips
5. **Import** → `POST /api/admin/sets` + `POST /api/admin/sets/:id/import-1001tracklists` → success toast with link to set in admin

### Event import

1. Panel shows event metadata (name, date, venue) + list of all sets with DJ names
2. Checkboxes to select/deselect individual sets (all selected by default)
3. **Find YouTube for all** → batch Invidious search, spinner per row, populates match inline
4. Any row can override its YouTube match via a search field
5. **Import selected** → creates event (if not exists) + creates each selected set linked to `event_id`, sequentially with per-row progress

### Artist import

1. Panel shows DJ name + list of their recent tracklists (title, date)
2. Sets already in Zephyron (matched by `tracklist_1001_url`) shown as grey/disabled
3. Checkboxes for remaining sets (all selected by default)
4. **Import selected** → for each selected: background service worker fetches the 1001TL tracklist URL directly (no CORS restriction from service workers), runs the ported Schema.org microdata extraction, then calls `adminCreateSet` + `import1001Tracklists` for each set sequentially

---

## Zephyron API Integration

### New endpoint required (add to main repo)

```
GET /api/admin/youtube-search?q=<query>
```

Proxies to the configured Invidious instance, returns top 5 results:
```ts
{ data: { video_id: string; title: string; author: string; thumbnail: string; duration_seconds: number }[] }
```

Wrapped with `withAdmin` — requires the same session/API key as other admin routes.

### Extension API client

The extension calls existing admin endpoints directly:

- `POST /api/admin/sets` — create set
- `POST /api/admin/sets/:id/import-1001tracklists` — import tracks
- `POST /api/admin/artists` — create artist (if not exists)
- `POST /api/admin/events` — create event (if not exists)
- `GET /api/admin/youtube-search?q=` — YouTube search proxy (new)

Authentication: `X-Admin-API-Key: <api_key>` header on all requests. The main app's `requireAdmin` uses Better Auth sessions (cookie-based) and won't work from the extension context. Add a new check at the top of `requireAdmin`: if `X-Admin-API-Key` header is present and matches `env.ADMIN_API_KEY` (a new Worker secret), grant admin access. Fall through to the existing session check otherwise.

---

## Settings

Stored in `chrome.storage.sync`:

```ts
interface ExtensionSettings {
  zephyron_url: string         // e.g. https://zephyron.app
  api_key: string              // admin API key
}
```

Settings page (`options.html`) has two fields + a **Test Connection** button that calls `GET /api/health` and shows success/error.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Zephyron unreachable | Red status dot in panel header; import buttons disabled |
| Duplicate set (`youtube_video_id` already exists) | Row shows "Already imported" badge; skipped silently |
| YouTube match not found | Set created with no stream source; flagged with warning badge |
| Partial event import failure | Completed rows stay green; failed rows show inline retry button; no rollback |
| Artist import fetch failure | Failed sets stay in list with retry; successfully imported ones are not re-imported |

---

## Tech Stack

- **React 18 + TypeScript** (Vite build, `dist/` is the unpacked extension)
- **Tailwind CSS 4** — dark theme matching Zephyron aesthetic
- **No external component library** — custom primitives matching the main app's patterns
- **`chrome.storage.sync`** for settings persistence
- **Manifest V3** permissions: `sidePanel`, `activeTab`, `storage`, `tabs`
- **Host permissions**: `*://*.1001tracklists.com/*`
- **Package manager**: bun

---

## Folder Structure

```
zephyron-extension/
├── CLAUDE.md                  # context pointer to main repo
├── manifest.json
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── public/
│   └── icons/                 # 16/48/128px icons
├── src/
│   ├── background/
│   │   └── index.ts           # service worker: panel lifecycle + message relay
│   ├── content/
│   │   └── index.ts           # DOM scraping + Schema.org extraction
│   ├── panel/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx            # page-type router
│   │   ├── components/
│   │   │   ├── TracklistImport.tsx
│   │   │   ├── EventImport.tsx
│   │   │   ├── ArtistImport.tsx
│   │   │   ├── YoutubeMatchRow.tsx
│   │   │   ├── TrackPreview.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   └── ImportProgress.tsx
│   │   └── lib/
│   │       ├── api.ts         # Zephyron API client
│   │       ├── settings.ts    # chrome.storage wrapper
│   │       └── types.ts       # shared types
│   └── options/
│       ├── index.html
│       └── main.tsx
```

---

## Main Repo Changes Required

1. **New endpoint**: `GET /api/admin/youtube-search` in `worker/routes/admin.ts` — proxies Invidious search
2. **Auth check**: Verify `requireAdmin` accepts `Authorization: Bearer <key>` or add API key support

---

## Out of Scope

- Firefox / Safari support (Chrome MV3 only)
- Scraping non-1001TL sources
- Editing/deleting existing Zephyron records from the extension
- Offline queuing of imports
