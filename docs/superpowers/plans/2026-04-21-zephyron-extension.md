# Zephyron Chrome Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome MV3 side panel extension that detects 1001tracklists.com page context (tracklist / event / artist) and bulk-imports data into a Zephyron instance via the admin API.

**Architecture:** Content script reads Schema.org microdata from the live DOM and sends structured `PageData` to the side panel via the background service worker. The side panel (React + Tailwind) lets the user review and confirm imports before calling Zephyron admin endpoints with an `X-Admin-API-Key` header. A new `GET /api/admin/youtube-search` endpoint on the main Worker proxies Invidious search for YouTube matching.

**Tech Stack:** React 18, TypeScript, Vite 6, Tailwind CSS 4, Chrome MV3, `crxjs/vite-plugin` for hot-reload dev, bun package manager.

---

## File Map

### New repo: `../zephyron-extension/`

| File | Responsibility |
|---|---|
| `manifest.json` | MV3 manifest — permissions, content scripts, side panel, background |
| `vite.config.ts` | Vite + crxjs build config |
| `tailwind.config.ts` | Tailwind theme (dark, matching Zephyron) |
| `src/background/index.ts` | Side panel lifecycle, message relay between content ↔ panel |
| `src/content/index.ts` | DOM detection + Schema.org microdata extraction |
| `src/content/extract.ts` | Pure extraction functions (tracklist / event / artist parsers) |
| `src/panel/index.html` | Side panel entry HTML |
| `src/panel/main.tsx` | Panel React entry point |
| `src/panel/App.tsx` | Page-type router — dispatches to correct import component |
| `src/panel/components/StatusBar.tsx` | Connection status + settings link |
| `src/panel/components/TracklistImport.tsx` | Tracklist page import flow |
| `src/panel/components/EventImport.tsx` | Event page import flow |
| `src/panel/components/ArtistImport.tsx` | Artist page import flow |
| `src/panel/components/YoutubeMatchRow.tsx` | Per-set YouTube search + pick UI |
| `src/panel/components/TrackPreview.tsx` | Scrollable track list preview |
| `src/panel/components/ImportProgress.tsx` | Per-row import status (spinner / ✓ / ✗ + retry) |
| `src/panel/lib/api.ts` | Zephyron API client (fetch with X-Admin-API-Key) |
| `src/panel/lib/settings.ts` | `chrome.storage.sync` typed wrapper |
| `src/panel/lib/types.ts` | Shared types: `PageData`, `TrackItem`, `ImportStatus` |
| `src/options/index.html` | Options page entry HTML |
| `src/options/main.tsx` | Options page — URL + API key fields + test connection |
| `CLAUDE.md` | Context pointer to main Zephyron repo |

### Modified in main repo: `../zephyron/`

| File | Change |
|---|---|
| `worker/lib/auth.ts` | Add `X-Admin-API-Key` header check to `requireAdmin` |
| `worker/services/invidious.ts` | Add `searchVideos(q, env)` export |
| `worker/routes/admin.ts` | Add `youtubeSearch` route handler |
| `worker/index.ts` | Register `GET /api/admin/youtube-search` route |
| `wrangler.jsonc` | Document `ADMIN_API_KEY` secret (comment) |

---

## Task 1: Bootstrap extension repo

**Files:**
- Create: `../zephyron-extension/package.json`
- Create: `../zephyron-extension/manifest.json`
- Create: `../zephyron-extension/vite.config.ts`
- Create: `../zephyron-extension/tsconfig.json`
- Create: `../zephyron-extension/tailwind.config.ts`
- Create: `../zephyron-extension/CLAUDE.md`
- Create: `../zephyron-extension/src/panel/index.html`
- Create: `../zephyron-extension/src/options/index.html`

- [ ] **Step 1: Create the repo folder and install deps**

```bash
mkdir -p /home/tomas/Documents/Github/zephyron-extension
cd /home/tomas/Documents/Github/zephyron-extension
bun init -y
bun add react react-dom
bun add -d typescript vite @vitejs/plugin-react @crxjs/vite-plugin tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "zephyron-extension",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta.26",
    "@tailwindcss/vite": "^4.0.0",
    "@types/chrome": "^0.0.295",
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.2",
    "vite": "^6.0.7"
  }
}
```

- [ ] **Step 3: Write `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "Zephyron Importer",
  "version": "0.1.0",
  "description": "Import DJ sets, events and artists from 1001tracklists.com to Zephyron",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "background": {
    "service_worker": "src/background/index.ts",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["*://*.1001tracklists.com/*"],
      "js": ["src/content/index.ts"],
      "run_at": "document_idle"
    }
  ],
  "side_panel": {
    "default_path": "src/panel/index.html"
  },
  "options_page": "src/options/index.html",
  "permissions": ["sidePanel", "activeTab", "storage", "tabs"],
  "host_permissions": ["*://*.1001tracklists.com/*"]
}
```

- [ ] **Step 4: Write `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    crx({ manifest }),
  ],
})
```

- [ ] **Step 5: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["ESNext", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Write `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'hsl(255 10% 8%)',
        surface: 'hsl(255 10% 12%)',
        border: 'hsl(255 10% 20%)',
        accent: 'hsl(255 70% 65%)',
        'text-primary': 'hsl(255 10% 95%)',
        'text-secondary': 'hsl(255 8% 60%)',
        'text-muted': 'hsl(255 6% 36%)',
        success: 'hsl(142 70% 45%)',
        error: 'hsl(0 70% 55%)',
        warning: 'hsl(38 90% 55%)',
      },
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
      },
    },
  },
} satisfies Config
```

- [ ] **Step 7: Write `CLAUDE.md`**

```markdown
# Zephyron Extension

Chrome MV3 extension that imports data from 1001tracklists.com to Zephyron.

**Main repo:** `../zephyron` — read its CLAUDE.md for full context.

**Key integration points:**
- Admin API: `POST /api/admin/sets`, `POST /api/admin/sets/:id/import-1001tracklists`, `POST /api/admin/artists`, `POST /api/admin/events`, `GET /api/admin/youtube-search`
- Auth: `X-Admin-API-Key` header (matches `ADMIN_API_KEY` Worker secret)
- Parsing: port of `../zephyron/worker/services/tracklists-1001.ts` extraction logic

**Package manager:** bun
**Build:** `bun run build` → `dist/` is the unpacked extension
**Dev:** `bun run dev` → Vite HMR with crxjs (load `dist/` as unpacked in Chrome)
```

- [ ] **Step 8: Write panel and options HTML entry files**

`src/panel/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Zephyron</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

`src/options/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Zephyron — Extension Settings</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Create placeholder icons (1x1 transparent PNG) so the build doesn't fail**

```bash
cd /home/tomas/Documents/Github/zephyron-extension
mkdir -p public/icons
# Create minimal valid PNGs using base64
echo 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAC0lEQVQ4jWNgAAIABQ
AABjAAAAABJRU5ErkJggg==' | base64 -d > public/icons/icon16.png
cp public/icons/icon16.png public/icons/icon48.png
cp public/icons/icon16.png public/icons/icon128.png
```

- [ ] **Step 10: Verify build works**

```bash
cd /home/tomas/Documents/Github/zephyron-extension
bun run build
```

Expected: `dist/` folder created with `manifest.json`, HTML files, and JS bundles. No TypeScript errors.

- [ ] **Step 11: Init git and commit**

```bash
cd /home/tomas/Documents/Github/zephyron-extension
git init
echo "dist/\nnode_modules/\n.DS_Store\n.env" > .gitignore
git add -A
git commit -m "chore: bootstrap Chrome extension repo"
```

---

## Task 2: Shared types

**Files:**
- Create: `src/panel/lib/types.ts`

- [ ] **Step 1: Write `src/panel/lib/types.ts`**

```ts
// Page data returned by content script

export interface TrackItem {
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

export interface TracklistPageData {
  type: 'tracklist'
  tracklist_id: string
  title: string
  dj_name: string
  date?: string
  venue?: string
  event_name?: string
  duration_seconds?: number
  tracks: TrackItem[]
}

export interface EventSetItem {
  dj_name: string
  set_title?: string
  tracklist_url?: string
  tracklist_id?: string
}

export interface EventPageData {
  type: 'event'
  event_name: string
  source_1001_id?: string
  date?: string
  venue?: string
  location?: string
  sets: EventSetItem[]
}

export interface ArtistTracklistItem {
  title: string
  date?: string
  tracklist_url: string
  tracklist_id: string
}

export interface ArtistPageData {
  type: 'artist'
  name: string
  genres?: string[]
  bio?: string
  website?: string
  tracklists: ArtistTracklistItem[]
}

export type PageData = TracklistPageData | EventPageData | ArtistPageData

export type ImportStatus = 'idle' | 'loading' | 'success' | 'error' | 'skipped'

export interface YoutubeMatch {
  video_id: string
  title: string
  author: string
  thumbnail: string
  duration_seconds: number
}

// Messages between content script ↔ background ↔ side panel

// Messages sent from side panel → background service worker
export type PanelMessage =
  | { type: 'GET_PAGE_DATA' }
  | { type: 'FETCH_TRACKLIST_URL'; url: string }

// Messages sent from background → content script
export type ContentMessage =
  | { type: 'SCRAPE_PAGE' }

export type ContentResponse =
  | { type: 'PAGE_DATA'; data: PageData }
  | { type: 'NOT_1001TL' }
  | { type: 'ERROR'; message: string }
```

- [ ] **Step 2: Commit**

```bash
cd /home/tomas/Documents/Github/zephyron-extension
git add src/panel/lib/types.ts
git commit -m "feat: add shared types"
```

---

## Task 3: Settings module

**Files:**
- Create: `src/panel/lib/settings.ts`

- [ ] **Step 1: Write `src/panel/lib/settings.ts`**

```ts
export interface ExtensionSettings {
  zephyron_url: string
  api_key: string
}

const DEFAULTS: ExtensionSettings = {
  zephyron_url: '',
  api_key: '',
}

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.sync.get(DEFAULTS)
  return stored as ExtensionSettings
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  await chrome.storage.sync.set(settings)
}

export function onSettingsChanged(
  callback: (settings: ExtensionSettings) => void
): () => void {
  const listener = () => {
    getSettings().then(callback)
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/tomas/Documents/Github/zephyron-extension
git add src/panel/lib/settings.ts
git commit -m "feat: add settings module"
```

---

## Task 4: API client

**Files:**
- Create: `src/panel/lib/api.ts`

- [ ] **Step 1: Write `src/panel/lib/api.ts`**

```ts
import type { TrackItem, YoutubeMatch } from './types'

export class ZephyronApi {
  constructor(
    public baseUrl: string,
    private apiKey: string
  ) {}

  private headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-Admin-API-Key': this.apiKey,
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(5000),
      })
      return res.ok
    } catch {
      return false
    }
  }

  async searchYoutube(q: string): Promise<YoutubeMatch[]> {
    const res = await fetch(
      `${this.baseUrl}/api/admin/youtube-search?q=${encodeURIComponent(q)}`,
      { headers: this.headers(), signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) throw new Error(`YouTube search failed: ${res.status}`)
    const json = await res.json() as { data: YoutubeMatch[] }
    return json.data
  }

  async createSet(body: {
    title: string
    artist: string
    duration_seconds: number
    genre?: string
    venue?: string
    event?: string
    recorded_date?: string
    stream_type?: 'youtube'
    youtube_video_id?: string
    tracklist_1001_url?: string
    artist_id?: string
    event_id?: string
  }): Promise<{ id: string }> {
    const res = await fetch(`${this.baseUrl}/api/admin/sets`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error: string }
      throw new Error(err.error)
    }
    const json = await res.json() as { data: { id: string } }
    return json.data
  }

  async importTracks(setId: string, tracks: TrackItem[]): Promise<{ imported: number }> {
    const res = await fetch(`${this.baseUrl}/api/admin/sets/${setId}/import-1001tracklists`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ tracks }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error: string }
      throw new Error(err.error)
    }
    const json = await res.json() as { data: { imported: number } }
    return json.data
  }

  async createArtist(body: {
    name: string
    genres?: string[]
    bio?: string
    website?: string
  }): Promise<{ id: string }> {
    const res = await fetch(`${this.baseUrl}/api/admin/artists`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error: string }
      throw new Error(err.error)
    }
    const json = await res.json() as { data: { id: string } }
    return json.data
  }

  async createEvent(body: {
    name: string
    start_date?: string
    venue?: string
    location?: string
    source_1001_id?: string
  }): Promise<{ id: string }> {
    const res = await fetch(`${this.baseUrl}/api/admin/events`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error: string }
      throw new Error(err.error)
    }
    const json = await res.json() as { data: { id: string } }
    return json.data
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/tomas/Documents/Github/zephyron-extension
git add src/panel/lib/api.ts
git commit -m "feat: add Zephyron API client"
```

---

## Task 5: Content script — extraction logic

**Files:**
- Create: `src/content/extract.ts`
- Create: `src/content/index.ts`

- [ ] **Step 1: Write `src/content/extract.ts`**

This ports the Schema.org `itemprop` microdata extraction from `../zephyron/worker/services/tracklists-1001.ts`.

```ts
import type {
  PageData, TracklistPageData, EventPageData, ArtistPageData,
  TrackItem, EventSetItem, ArtistTracklistItem,
} from '../panel/lib/types'

// ─── Page type detection ───────────────────────────────────────────────────

export function detectPageType(): PageData['type'] | null {
  const path = window.location.pathname
  if (/^\/tracklist\/[a-z0-9]+/i.test(path)) return 'tracklist'
  if (/^\/(source|event)\/[a-z0-9]+/i.test(path)) return 'event'
  if (/^\/dj\/[a-z0-9_-]+/i.test(path)) return 'artist'
  return null
}

// ─── Tracklist extraction ──────────────────────────────────────────────────

function extractTracklistId(): string {
  const match = window.location.pathname.match(/\/tracklist\/([a-z0-9]+)/i)
  return match ? match[1] : ''
}

function parseSeconds(cueTime: string): number {
  const parts = cueTime.split(':').map(Number)
  if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
  if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0)
  return 0
}

function extractServiceLinks(el: Element): Partial<TrackItem> {
  const links: Partial<TrackItem> = {}
  el.querySelectorAll('a[href]').forEach((a) => {
    const href = (a as HTMLAnchorElement).href
    if (href.includes('spotify.com')) links.spotify_url = href
    else if (href.includes('music.apple.com')) links.apple_music_url = href
    else if (href.includes('soundcloud.com')) links.soundcloud_url = href
    else if (href.includes('beatport.com')) links.beatport_url = href
    else if (href.includes('youtube.com') || href.includes('youtu.be')) links.youtube_url = href
    else if (href.includes('deezer.com')) links.deezer_url = href
    else if (href.includes('bandcamp.com')) links.bandcamp_url = href
    else if (href.includes('traxsource.com')) links.traxsource_url = href
  })
  return links
}

export function extractTracklist(): TracklistPageData {
  const title =
    document.querySelector('[itemprop="name"]')?.textContent?.trim() ||
    document.querySelector('h1')?.textContent?.trim() ||
    document.title

  // DJ name from Schema.org performer or breadcrumb
  const djName =
    document.querySelector('[itemprop="performer"] [itemprop="name"]')?.textContent?.trim() ||
    document.querySelector('.tlpItem .artistName')?.textContent?.trim() ||
    ''

  const dateEl = document.querySelector('[itemprop="startDate"]') as HTMLElement | null
  const date = dateEl?.getAttribute('content') || dateEl?.textContent?.trim()

  const venue = document.querySelector('[itemprop="location"] [itemprop="name"]')?.textContent?.trim()
  const eventName = document.querySelector('[itemprop="superEvent"] [itemprop="name"]')?.textContent?.trim()

  // Duration from meta or schema
  const durationEl = document.querySelector('[itemprop="duration"]') as HTMLElement | null
  const durationStr = durationEl?.getAttribute('content') || durationEl?.textContent?.trim() || ''
  let durationSeconds: number | undefined
  if (durationStr) {
    // ISO 8601 duration (PT1H30M) or HH:MM:SS
    const iso = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (iso) {
      durationSeconds = (Number(iso[1] || 0)) * 3600 + (Number(iso[2] || 0)) * 60 + Number(iso[3] || 0)
    } else {
      durationSeconds = parseSeconds(durationStr)
    }
  }

  const tracks: TrackItem[] = []
  const trackItems = document.querySelectorAll('.tlpItem, [itemprop="track"]')

  trackItems.forEach((item, i) => {
    const artistEl = item.querySelector('[itemprop="byArtist"] [itemprop="name"], .artistName')
    const titleEl = item.querySelector('[itemprop="name"], .trackName')
    const cueEl = item.querySelector('.cueValueField, [class*="cue"]') as HTMLElement | null
    const cueTime = cueEl?.textContent?.trim() || cueEl?.getAttribute('value') || ''

    const isContinuation = item.classList.contains('tlpItemContinuation') ||
      item.querySelector('.tlpItemContinuationLabel') !== null

    const isUnidentified =
      item.classList.contains('notIdentified') ||
      (titleEl?.textContent?.includes('ID') && artistEl?.textContent?.includes('ID'))

    const trackContentId = item.getAttribute('data-trackid') || undefined

    const artworkEl = item.querySelector('[itemprop="image"]') as HTMLImageElement | null
    const artworkUrl = artworkEl?.src || artworkEl?.getAttribute('content') || undefined

    const labelEl = item.querySelector('[itemprop="recordLabel"]')
    const label = labelEl?.textContent?.trim() || undefined

    tracks.push({
      position: i + 1,
      artist: artistEl?.textContent?.trim() || 'Unknown',
      title: titleEl?.textContent?.trim() || 'Unknown',
      cue_time: cueTime || undefined,
      start_seconds: cueTime ? parseSeconds(cueTime) : undefined,
      is_continuation: isContinuation || undefined,
      is_identified: !isUnidentified,
      track_content_id: trackContentId,
      artwork_url: artworkUrl,
      label,
      ...extractServiceLinks(item),
    })
  })

  return {
    type: 'tracklist',
    tracklist_id: extractTracklistId(),
    title,
    dj_name: djName,
    date,
    venue,
    event_name: eventName,
    duration_seconds: durationSeconds,
    tracks,
  }
}

// ─── Event extraction ──────────────────────────────────────────────────────

export function extractEvent(): EventPageData {
  const eventName =
    document.querySelector('[itemprop="name"]')?.textContent?.trim() ||
    document.querySelector('h1')?.textContent?.trim() ||
    document.title

  const dateEl = document.querySelector('[itemprop="startDate"]') as HTMLElement | null
  const date = dateEl?.getAttribute('content') || dateEl?.textContent?.trim()

  const venue = document.querySelector('[itemprop="location"] [itemprop="name"]')?.textContent?.trim()
  const location = document.querySelector('[itemprop="location"] [itemprop="address"]')?.textContent?.trim()

  const sourceMatch = window.location.pathname.match(/\/(source|event)\/([a-z0-9]+)/i)
  const source1001Id = sourceMatch ? sourceMatch[2] : undefined

  const sets: EventSetItem[] = []

  // Event set items — each row is a set/performance
  document.querySelectorAll('.bItm, [itemprop="performer"]').forEach((row) => {
    const djName =
      row.querySelector('[itemprop="name"]')?.textContent?.trim() ||
      row.querySelector('.artistName')?.textContent?.trim() ||
      ''
    if (!djName) return

    const setTitle = row.querySelector('.trackName, .setName')?.textContent?.trim()

    const linkEl = row.querySelector('a[href*="/tracklist/"]') as HTMLAnchorElement | null
    const tracklistUrl = linkEl?.href
    const tracklistId = tracklistUrl?.match(/\/tracklist\/([a-z0-9]+)/i)?.[1]

    sets.push({ dj_name: djName, set_title: setTitle, tracklist_url: tracklistUrl, tracklist_id: tracklistId })
  })

  return {
    type: 'event',
    event_name: eventName,
    source_1001_id: source1001Id,
    date,
    venue,
    location,
    sets,
  }
}

// ─── Artist extraction ─────────────────────────────────────────────────────

export function extractArtist(): ArtistPageData {
  const name =
    document.querySelector('[itemprop="name"]')?.textContent?.trim() ||
    document.querySelector('h1')?.textContent?.trim() ||
    document.title

  const bio = document.querySelector('[itemprop="description"]')?.textContent?.trim()
  const website = (document.querySelector('[itemprop="url"]') as HTMLAnchorElement)?.href

  const genreEls = document.querySelectorAll('[itemprop="genre"]')
  const genres = Array.from(genreEls).map((el) => el.textContent?.trim()).filter(Boolean) as string[]

  const tracklists: ArtistTracklistItem[] = []
  document.querySelectorAll('a[href*="/tracklist/"]').forEach((a) => {
    const href = (a as HTMLAnchorElement).href
    const idMatch = href.match(/\/tracklist\/([a-z0-9]+)/i)
    if (!idMatch) return
    const tracklistId = idMatch[1]!
    const title =
      a.querySelector('[itemprop="name"]')?.textContent?.trim() ||
      a.textContent?.trim() ||
      'Untitled'
    const dateEl = a.closest('[itemprop="workPerformed"]')?.querySelector('[itemprop="startDate"]') as HTMLElement | null
    const date = dateEl?.getAttribute('content') || dateEl?.textContent?.trim()
    tracklists.push({ title, date, tracklist_url: href, tracklist_id: tracklistId })
  })

  return { type: 'artist', name, genres, bio, website, tracklists }
}

// ─── Entry point ───────────────────────────────────────────────────────────

export function extractPageData(): PageData | null {
  const pageType = detectPageType()
  if (pageType === 'tracklist') return extractTracklist()
  if (pageType === 'event') return extractEvent()
  if (pageType === 'artist') return extractArtist()
  return null
}
```

- [ ] **Step 2: Write `src/content/index.ts`**

```ts
import { extractPageData } from './extract'
import type { ContentMessage, ContentResponse } from '../panel/lib/types'

chrome.runtime.onMessage.addListener(
  (message: ContentMessage, _sender, sendResponse: (response: ContentResponse) => void) => {
    if (message.type !== 'SCRAPE_PAGE') return false

    try {
      const data = extractPageData()
      if (!data) {
        sendResponse({ type: 'NOT_1001TL' })
      } else {
        sendResponse({ type: 'PAGE_DATA', data })
      }
    } catch (err) {
      sendResponse({
        type: 'ERROR',
        message: err instanceof Error ? err.message : String(err),
      })
    }

    return false
  }
)
```

- [ ] **Step 3: Commit**

```bash
cd /home/tomas/Documents/Github/zephyron-extension
git add src/content/
git commit -m "feat: add content script DOM extraction"
```

---

## Task 6: Background service worker

**Files:**
- Create: `src/background/index.ts`

- [ ] **Step 1: Write `src/background/index.ts`**

```ts
import type { ContentMessage, ContentResponse, PageData } from '../panel/lib/types'

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id })
  }
})

// Relay SCRAPE_PAGE from side panel → active tab's content script → back to panel
chrome.runtime.onMessage.addListener(
  (message: ContentMessage | { type: 'GET_PAGE_DATA' }, sender, sendResponse) => {
    if (message.type !== 'GET_PAGE_DATA') return false

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (!tab?.id) {
        sendResponse({ type: 'ERROR', message: 'No active tab' } as ContentResponse)
        return
      }

      chrome.tabs.sendMessage<ContentMessage, ContentResponse>(
        tab.id,
        { type: 'SCRAPE_PAGE' },
        (response) => {
          if (chrome.runtime.lastError) {
            sendResponse({
              type: 'NOT_1001TL',
            } as ContentResponse)
          } else {
            sendResponse(response)
          }
        }
      )
    })

    return true // keep message channel open for async response
  }
)

// Fetch a 1001TL tracklist URL from background (used for artist bulk import)
// The service worker can fetch cross-origin without CORS restrictions.
chrome.runtime.onMessage.addListener(
  (message: { type: 'FETCH_TRACKLIST_URL'; url: string }, _sender, sendResponse) => {
    if (message.type !== 'FETCH_TRACKLIST_URL') return false

    fetch(message.url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'accept': 'text/html',
      },
    })
      .then((res) => res.text())
      .then((html) => sendResponse({ ok: true, html }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }))

    return true
  }
)
```

- [ ] **Step 2: Commit**

```bash
cd /home/tomas/Documents/Github/zephyron-extension
git add src/background/index.ts
git commit -m "feat: add background service worker"
```

---

## Task 7: Options page

**Files:**
- Create: `src/options/main.tsx`

- [ ] **Step 1: Write `src/options/main.tsx`**

```tsx
import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { getSettings, saveSettings, type ExtensionSettings } from '../panel/lib/settings'
import '../panel/global.css'

function OptionsPage() {
  const [settings, setSettings] = useState<ExtensionSettings>({ zephyron_url: '', api_key: '' })
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleTest() {
    setStatus('testing')
    try {
      const res = await fetch(`${settings.zephyron_url}/api/health`, {
        headers: { 'X-Admin-API-Key': settings.api_key },
        signal: AbortSignal.timeout(5000),
      })
      setStatus(res.ok ? 'ok' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text-primary p-8 font-sans">
      <div className="max-w-md">
        <h1 className="text-xl font-bold mb-6">Zephyron Extension Settings</h1>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Zephyron URL</label>
            <input
              type="url"
              value={settings.zephyron_url}
              onChange={(e) => setSettings((s) => ({ ...s, zephyron_url: e.target.value }))}
              placeholder="https://zephyron.app"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Admin API Key</label>
            <input
              type="password"
              value={settings.api_key}
              onChange={(e) => setSettings((s) => ({ ...s, api_key: e.target.value }))}
              placeholder="your-api-key"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90"
            >
              {saved ? 'Saved!' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={status === 'testing'}
              className="px-4 py-2 bg-surface border border-border rounded-lg text-sm hover:border-accent disabled:opacity-50"
            >
              {status === 'testing' ? 'Testing...' : 'Test Connection'}
            </button>
            {status === 'ok' && <span className="text-sm text-success self-center">Connected</span>}
            {status === 'error' && <span className="text-sm text-error self-center">Failed</span>}
          </div>
        </form>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><OptionsPage /></StrictMode>
)
```

- [ ] **Step 2: Create global CSS (Tailwind entry)**

Create `src/panel/global.css`:
```css
@import "tailwindcss";
```

Update `src/options/main.tsx` import: already references `'../panel/global.css'` above.

- [ ] **Step 3: Commit**

```bash
cd /home/tomas/Documents/Github/zephyron-extension
git add src/options/ src/panel/global.css
git commit -m "feat: add options page"
```

---

## Task 8: Side panel — StatusBar and shell

**Files:**
- Create: `src/panel/components/StatusBar.tsx`
- Create: `src/panel/App.tsx`
- Create: `src/panel/main.tsx`

- [ ] **Step 1: Write `src/panel/components/StatusBar.tsx`**

```tsx
interface StatusBarProps {
  connected: boolean | null  // null = checking
  zephyronUrl: string
}

export function StatusBar({ connected, zephyronUrl }: StatusBarProps) {
  const dot =
    connected === null
      ? 'bg-text-muted animate-pulse'
      : connected
      ? 'bg-success'
      : 'bg-error'

  const label =
    connected === null ? 'Checking...' : connected ? 'Connected' : 'Unreachable'

  const domain = zephyronUrl
    ? new URL(zephyronUrl.startsWith('http') ? zephyronUrl : `https://${zephyronUrl}`).hostname
    : 'not configured'

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface/50">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${dot}`} />
        <span className="text-xs text-text-secondary">{domain}</span>
        <span className="text-xs text-text-muted">· {label}</span>
      </div>
      <button
        onClick={() => chrome.runtime.openOptionsPage()}
        className="text-xs text-text-muted hover:text-accent"
        title="Settings"
      >
        ⚙
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/panel/App.tsx`**

```tsx
import { useState, useEffect, useCallback } from 'react'
import { StatusBar } from './components/StatusBar'
import { TracklistImport } from './components/TracklistImport'
import { EventImport } from './components/EventImport'
import { ArtistImport } from './components/ArtistImport'
import { getSettings, onSettingsChanged, type ExtensionSettings } from './lib/settings'
import { ZephyronApi } from './lib/api'
import type { PageData, ContentResponse } from './lib/types'

export function App() {
  const [settings, setSettings] = useState<ExtensionSettings>({ zephyron_url: '', api_key: '' })
  const [connected, setConnected] = useState<boolean | null>(null)
  const [pageData, setPageData] = useState<PageData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkConnection = useCallback(async (s: ExtensionSettings) => {
    if (!s.zephyron_url || !s.api_key) {
      setConnected(false)
      return
    }
    setConnected(null)
    const api = new ZephyronApi(s.zephyron_url, s.api_key)
    setConnected(await api.checkHealth())
  }, [])

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s)
      checkConnection(s)
    })

    return onSettingsChanged((s) => {
      setSettings(s)
      checkConnection(s)
    })
  }, [checkConnection])

  useEffect(() => {
    chrome.runtime.sendMessage(
      { type: 'GET_PAGE_DATA' },
      (response: ContentResponse) => {
        setIsLoading(false)
        if (response?.type === 'PAGE_DATA') {
          setPageData(response.data)
        } else if (response?.type === 'NOT_1001TL') {
          setPageData(null)
        } else {
          setLoadError(response?.message || 'Failed to read page')
        }
      }
    )
  }, [])

  const api = new ZephyronApi(settings.zephyron_url, settings.api_key)

  return (
    <div className="flex flex-col h-screen bg-bg text-text-primary font-sans text-sm">
      <StatusBar connected={connected} zephyronUrl={settings.zephyron_url} />

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-40 text-text-muted">
            <span className="animate-pulse">Reading page…</span>
          </div>
        )}

        {!isLoading && loadError && (
          <div className="p-4 text-error text-sm">{loadError}</div>
        )}

        {!isLoading && !loadError && !pageData && (
          <div className="p-6 text-center text-text-muted">
            <p className="mb-1">Not a 1001Tracklists page</p>
            <p className="text-xs">Navigate to a tracklist, event, or DJ page</p>
          </div>
        )}

        {!isLoading && !loadError && pageData && !connected && (
          <div className="p-4 text-warning text-xs bg-warning/10 border-b border-warning/20">
            Zephyron is unreachable — check your settings before importing.
          </div>
        )}

        {!isLoading && pageData?.type === 'tracklist' && (
          <TracklistImport data={pageData} api={api} />
        )}
        {!isLoading && pageData?.type === 'event' && (
          <EventImport data={pageData} api={api} />
        )}
        {!isLoading && pageData?.type === 'artist' && (
          <ArtistImport data={pageData} api={api} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write `src/panel/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>
)
```

- [ ] **Step 4: Commit**

```bash
cd /home/tomas/Documents/Github/zephyron-extension
git add src/panel/
git commit -m "feat: add side panel shell and StatusBar"
```

---

## Task 9: TrackPreview and ImportProgress components

**Files:**
- Create: `src/panel/components/TrackPreview.tsx`
- Create: `src/panel/components/ImportProgress.tsx`

- [ ] **Step 1: Write `src/panel/components/TrackPreview.tsx`**

```tsx
import { useState } from 'react'
import type { TrackItem } from '../lib/types'

interface TrackPreviewProps {
  tracks: TrackItem[]
}

export function TrackPreview({ tracks }: TrackPreviewProps) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? tracks : tracks.slice(0, 10)
  const identified = tracks.filter((t) => t.is_identified !== false).length

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-secondary">
          {tracks.length} tracks · {identified} identified
        </span>
        {tracks.length > 10 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-accent hover:underline"
          >
            {expanded ? 'Show less' : `Show all ${tracks.length}`}
          </button>
        )}
      </div>
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {shown.map((t) => (
          <div
            key={t.position}
            className={`flex gap-2 text-xs py-1 border-b border-border/30 ${
              t.is_identified === false ? 'opacity-40' : ''
            }`}
          >
            <span className="text-text-muted w-5 shrink-0 text-right">{t.position}</span>
            {t.cue_time && (
              <span className="text-text-muted w-12 shrink-0">{t.cue_time}</span>
            )}
            <span className="text-text-secondary shrink-0">{t.artist}</span>
            <span className="text-text-primary truncate">{t.title}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/panel/components/ImportProgress.tsx`**

```tsx
import type { ImportStatus } from '../lib/types'

interface ProgressRowProps {
  label: string
  status: ImportStatus
  detail?: string
  onRetry?: () => void
}

export function ProgressRow({ label, status, detail, onRetry }: ProgressRowProps) {
  const icon =
    status === 'loading'
      ? <span className="animate-spin inline-block">↻</span>
      : status === 'success'
      ? <span className="text-success">✓</span>
      : status === 'error'
      ? <span className="text-error">✗</span>
      : status === 'skipped'
      ? <span className="text-text-muted">–</span>
      : null

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border/30 text-xs">
      <span className="w-4 text-center">{icon}</span>
      <span className={`flex-1 truncate ${status === 'error' ? 'text-error' : status === 'skipped' ? 'text-text-muted' : 'text-text-primary'}`}>
        {label}
      </span>
      {detail && <span className="text-text-muted shrink-0">{detail}</span>}
      {status === 'error' && onRetry && (
        <button onClick={onRetry} className="text-accent hover:underline shrink-0">
          Retry
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd /home/tomas/Documents/Github/zephyron-extension
git add src/panel/components/TrackPreview.tsx src/panel/components/ImportProgress.tsx
git commit -m "feat: add TrackPreview and ImportProgress components"
```

---

## Task 10: YoutubeMatchRow component

**Files:**
- Create: `src/panel/components/YoutubeMatchRow.tsx`

- [ ] **Step 1: Write `src/panel/components/YoutubeMatchRow.tsx`**

```tsx
import { useState, useCallback } from 'react'
import type { YoutubeMatch } from '../lib/types'
import type { ZephyronApi } from '../lib/api'

interface YoutubeMatchRowProps {
  query: string
  api: ZephyronApi
  onMatch: (match: YoutubeMatch | null) => void
}

export function YoutubeMatchRow({ query, api, onMatch }: YoutubeMatchRowProps) {
  const [matches, setMatches] = useState<YoutubeMatch[]>([])
  const [selected, setSelected] = useState<YoutubeMatch | null>(null)
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async () => {
    setSearching(true)
    setError(null)
    try {
      const results = await api.searchYoutube(query)
      setMatches(results.slice(0, 3))
      if (results.length > 0) {
        setSelected(results[0]!)
        onMatch(results[0]!)
      } else {
        onMatch(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      onMatch(null)
    } finally {
      setSearching(false)
      setSearched(true)
    }
  }, [query, api, onMatch])

  function pick(match: YoutubeMatch) {
    setSelected(match)
    onMatch(match)
  }

  function skip() {
    setSelected(null)
    onMatch(null)
  }

  if (!searched) {
    return (
      <button
        onClick={search}
        disabled={searching}
        className="text-xs text-accent hover:underline disabled:opacity-50"
      >
        {searching ? 'Searching…' : 'Find on YouTube'}
      </button>
    )
  }

  if (error) return <span className="text-xs text-error">{error}</span>
  if (matches.length === 0) return <span className="text-xs text-text-muted">No match found</span>

  return (
    <div className="space-y-1 mt-1">
      {matches.map((m) => (
        <button
          key={m.video_id}
          onClick={() => pick(m)}
          className={`w-full flex items-center gap-2 p-1.5 rounded text-left text-xs border transition-colors ${
            selected?.video_id === m.video_id
              ? 'border-accent bg-accent/10'
              : 'border-border hover:border-accent/50'
          }`}
        >
          <img src={m.thumbnail} alt="" className="w-12 h-7 object-cover rounded shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="truncate text-text-primary">{m.title}</div>
            <div className="text-text-muted">{m.author}</div>
          </div>
        </button>
      ))}
      <button onClick={skip} className="text-xs text-text-muted hover:text-text-secondary">
        Skip (no YouTube source)
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/tomas/Documents/Github/zephyron-extension
git add src/panel/components/YoutubeMatchRow.tsx
git commit -m "feat: add YoutubeMatchRow component"
```

---

## Task 11: TracklistImport component

**Files:**
- Create: `src/panel/components/TracklistImport.tsx`

- [ ] **Step 1: Write `src/panel/components/TracklistImport.tsx`**

```tsx
import { useState } from 'react'
import type { TracklistPageData, YoutubeMatch, ImportStatus } from '../lib/types'
import type { ZephyronApi } from '../lib/api'
import { TrackPreview } from './TrackPreview'
import { YoutubeMatchRow } from './YoutubeMatchRow'

interface TracklistImportProps {
  data: TracklistPageData
  api: ZephyronApi
}

export function TracklistImport({ data, api }: TracklistImportProps) {
  const [title, setTitle] = useState(data.title)
  const [artist, setArtist] = useState(data.dj_name)
  const [genre, setGenre] = useState('')
  const [venue, setVenue] = useState(data.venue ?? '')
  const [eventName, setEventName] = useState(data.event_name ?? '')
  const [date, setDate] = useState(data.date?.slice(0, 10) ?? '')
  const [youtubeMatch, setYoutubeMatch] = useState<YoutubeMatch | null>(null)
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [importedUrl, setImportedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleImport() {
    if (!title.trim() || !artist.trim()) return
    setStatus('loading')
    setError(null)

    try {
      const set = await api.createSet({
        title: title.trim(),
        artist: artist.trim(),
        duration_seconds: data.duration_seconds ?? 0,
        genre: genre || undefined,
        venue: venue || undefined,
        event: eventName || undefined,
        recorded_date: date || undefined,
        stream_type: youtubeMatch ? 'youtube' : undefined,
        youtube_video_id: youtubeMatch?.video_id,
        tracklist_1001_url: `https://www.1001tracklists.com/tracklist/${data.tracklist_id}/`,
      })

      if (data.tracks.length > 0) {
        await api.importTracks(set.id, data.tracks)
      }

      setStatus('success')
      setImportedUrl(`/admin?tab=sets&edit=${set.id}`)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  if (status === 'success') {
    return (
      <div className="p-4 text-center space-y-3">
        <div className="text-success text-2xl">✓</div>
        <p className="text-sm font-medium">Set imported</p>
        {importedUrl && (
          <a
            href={`${(api as any).baseUrl}${importedUrl}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-accent hover:underline"
          >
            View in admin →
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="font-semibold text-base">{data.dj_name}</h2>
        <p className="text-xs text-text-muted">{data.tracks.length} tracks · {data.tracklist_id}</p>
      </div>

      <div className="space-y-2">
        <Field label="Title" value={title} onChange={setTitle} />
        <Field label="Artist" value={artist} onChange={setArtist} />
        <Field label="Genre" value={genre} onChange={setGenre} placeholder="e.g. Techno" />
        <Field label="Venue" value={venue} onChange={setVenue} />
        <Field label="Event" value={eventName} onChange={setEventName} />
        <Field label="Date" value={date} onChange={setDate} type="date" />
      </div>

      <div>
        <p className="text-xs text-text-secondary mb-1">YouTube source</p>
        <YoutubeMatchRow
          query={`${artist} ${title}`}
          api={api}
          onMatch={setYoutubeMatch}
        />
        {youtubeMatch && (
          <p className="text-xs text-text-muted mt-1">✓ {youtubeMatch.title}</p>
        )}
      </div>

      <TrackPreview tracks={data.tracks} />

      {error && <p className="text-xs text-error">{error}</p>}

      <button
        onClick={handleImport}
        disabled={status === 'loading' || !title.trim() || !artist.trim()}
        className="w-full py-2 bg-accent text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50"
      >
        {status === 'loading' ? 'Importing…' : 'Import Set'}
      </button>
    </div>
  )
}

function Field({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="block text-xs text-text-muted mb-0.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent"
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/tomas/Documents/Github/zephyron-extension
git add src/panel/components/TracklistImport.tsx
git commit -m "feat: add TracklistImport component"
```

---

## Task 12: EventImport component

**Files:**
- Create: `src/panel/components/EventImport.tsx`

- [ ] **Step 1: Write `src/panel/components/EventImport.tsx`**

```tsx
import { useState, useCallback } from 'react'
import type { EventPageData, EventSetItem, YoutubeMatch, ImportStatus } from '../lib/types'
import type { ZephyronApi } from '../lib/api'
import { ProgressRow } from './ImportProgress'
import { YoutubeMatchRow } from './YoutubeMatchRow'

interface SetRow {
  item: EventSetItem
  selected: boolean
  ytMatch: YoutubeMatch | null
  status: ImportStatus
  error?: string
}

interface EventImportProps {
  data: EventPageData
  api: ZephyronApi
}

export function EventImport({ data, api }: EventImportProps) {
  const [eventName, setEventName] = useState(data.event_name)
  const [date, setDate] = useState(data.date?.slice(0, 10) ?? '')
  const [venue, setVenue] = useState(data.venue ?? '')
  const [rows, setRows] = useState<SetRow[]>(() =>
    data.sets.map((item) => ({ item, selected: true, ytMatch: null, status: 'idle' }))
  )
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)

  const updateRow = useCallback((i: number, patch: Partial<SetRow>) => {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }, [])

  async function handleImport() {
    if (running) return
    setRunning(true)

    // Create event first
    let eventId: string | undefined
    try {
      const ev = await api.createEvent({
        name: eventName,
        start_date: date || undefined,
        venue: venue || undefined,
        location: data.location || undefined,
        source_1001_id: data.source_1001_id,
      })
      eventId = ev.id
    } catch {
      // Non-fatal — sets will be created without event link
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!
      if (!row.selected) continue

      updateRow(i, { status: 'loading' })
      try {
        await api.createSet({
          title: row.item.set_title || `${row.item.dj_name} @ ${eventName}`,
          artist: row.item.dj_name,
          duration_seconds: 0,
          recorded_date: date || undefined,
          venue: venue || undefined,
          event: eventName || undefined,
          event_id: eventId,
          stream_type: row.ytMatch ? 'youtube' : undefined,
          youtube_video_id: row.ytMatch?.video_id,
          tracklist_1001_url: row.item.tracklist_url,
        })
        updateRow(i, { status: 'success' })
      } catch (err) {
        updateRow(i, {
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    setRunning(false)
    setDone(true)
  }

  const selected = rows.filter((r) => r.selected).length

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="font-semibold text-base">{data.event_name}</h2>
        <p className="text-xs text-text-muted">{data.sets.length} sets</p>
      </div>

      <div className="space-y-2">
        <Field label="Event name" value={eventName} onChange={setEventName} />
        <Field label="Date" value={date} onChange={setDate} type="date" />
        <Field label="Venue" value={venue} onChange={setVenue} />
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="border border-border rounded p-2 space-y-1">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={row.selected}
                onChange={(e) => updateRow(i, { selected: e.target.checked })}
                className="mt-0.5 accent-accent"
                disabled={running}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{row.item.dj_name}</p>
                {row.item.set_title && (
                  <p className="text-xs text-text-muted truncate">{row.item.set_title}</p>
                )}
              </div>
              {done && (
                <ProgressRow
                  label=""
                  status={row.status}
                  detail={row.error}
                  onRetry={row.status === 'error' ? () => {
                    updateRow(i, { status: 'idle', error: undefined })
                  } : undefined}
                />
              )}
            </div>
            {row.selected && !running && !done && (
              <YoutubeMatchRow
                query={`${row.item.dj_name} ${row.item.set_title ?? ''} ${eventName}`}
                api={api}
                onMatch={(m) => updateRow(i, { ytMatch: m })}
              />
            )}
            {row.ytMatch && !done && (
              <p className="text-xs text-text-muted pl-5">✓ {row.ytMatch.title}</p>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleImport}
        disabled={running || selected === 0}
        className="w-full py-2 bg-accent text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50"
      >
        {running ? 'Importing…' : `Import ${selected} set${selected !== 1 ? 's' : ''}`}
      </button>
    </div>
  )
}

function Field({
  label, value, onChange, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <div>
      <label className="block text-xs text-text-muted mb-0.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent"
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/tomas/Documents/Github/zephyron-extension
git add src/panel/components/EventImport.tsx
git commit -m "feat: add EventImport component"
```

---

## Task 13: ArtistImport component

**Files:**
- Create: `src/panel/components/ArtistImport.tsx`

- [ ] **Step 1: Write `src/panel/components/ArtistImport.tsx`**

```tsx
import { useState, useCallback } from 'react'
import type { ArtistPageData, ArtistTracklistItem, ImportStatus } from '../lib/types'
import type { ZephyronApi } from '../lib/api'
import { ProgressRow } from './ImportProgress'

interface TracklistRow {
  item: ArtistTracklistItem
  selected: boolean
  status: ImportStatus
  error?: string
  imported?: number
}

interface ArtistImportProps {
  data: ArtistPageData
  api: ZephyronApi
}

export function ArtistImport({ data, api }: ArtistImportProps) {
  const [rows, setRows] = useState<TracklistRow[]>(() =>
    data.tracklists.map((item) => ({ item, selected: true, status: 'idle' }))
  )
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)

  const updateRow = useCallback((i: number, patch: Partial<TracklistRow>) => {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }, [])

  async function importTracklist(i: number) {
    const row = rows[i]!
    updateRow(i, { status: 'loading' })

    try {
      // Fetch tracklist HTML from background service worker
      const response = await new Promise<{ ok: boolean; html?: string; error?: string }>(
        (resolve) => chrome.runtime.sendMessage(
          { type: 'FETCH_TRACKLIST_URL', url: row.item.tracklist_url },
          resolve
        )
      )

      if (!response.ok || !response.html) {
        throw new Error(response.error || 'Fetch failed')
      }

      // Parse microdata from the fetched HTML using DOMParser
      const doc = new DOMParser().parseFromString(response.html, 'text/html')
      const titleEl = doc.querySelector('[itemprop="name"]') || doc.querySelector('h1')
      const title = titleEl?.textContent?.trim() || row.item.title

      const djName = data.name
      const dateStr = row.item.date?.slice(0, 10)

      const set = await api.createSet({
        title,
        artist: djName,
        duration_seconds: 0,
        recorded_date: dateStr,
        tracklist_1001_url: row.item.tracklist_url,
      })

      // Extract tracks from parsed DOM
      const trackItems = doc.querySelectorAll('.tlpItem, [itemprop="track"]')
      const tracks = Array.from(trackItems).map((item, idx) => {
        const artistEl = item.querySelector('[itemprop="byArtist"] [itemprop="name"], .artistName')
        const titleEl2 = item.querySelector('[itemprop="name"], .trackName')
        const cueEl = item.querySelector('.cueValueField') as HTMLElement | null
        const cueTime = cueEl?.textContent?.trim() || ''
        const parseSeconds = (t: string) => {
          const p = t.split(':').map(Number)
          if (p.length === 2) return (p[0] ?? 0) * 60 + (p[1] ?? 0)
          if (p.length === 3) return (p[0] ?? 0) * 3600 + (p[1] ?? 0) * 60 + (p[2] ?? 0)
          return 0
        }
        return {
          position: idx + 1,
          artist: artistEl?.textContent?.trim() || 'Unknown',
          title: titleEl2?.textContent?.trim() || 'Unknown',
          cue_time: cueTime || undefined,
          start_seconds: cueTime ? parseSeconds(cueTime) : undefined,
          is_identified: !item.classList.contains('notIdentified'),
        }
      })

      let imported = 0
      if (tracks.length > 0) {
        const result = await api.importTracks(set.id, tracks)
        imported = result.imported
      }

      updateRow(i, { status: 'success', imported })
    } catch (err) {
      updateRow(i, {
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  async function handleImport() {
    if (running) return
    setRunning(true)

    for (let i = 0; i < rows.length; i++) {
      if (!rows[i]!.selected) continue
      await importTracklist(i)
    }

    setRunning(false)
    setDone(true)
  }

  const selected = rows.filter((r) => r.selected).length

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="font-semibold text-base">{data.name}</h2>
        <p className="text-xs text-text-muted">{data.tracklists.length} tracklists</p>
        {data.genres && data.genres.length > 0 && (
          <p className="text-xs text-text-muted">{data.genres.join(', ')}</p>
        )}
      </div>

      <div className="space-y-1 max-h-96 overflow-y-auto">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/30">
            <input
              type="checkbox"
              checked={row.selected}
              onChange={(e) => updateRow(i, { selected: e.target.checked })}
              className="accent-accent"
              disabled={running || row.status === 'success'}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate">{row.item.title}</p>
              {row.item.date && (
                <p className="text-xs text-text-muted">{row.item.date.slice(0, 10)}</p>
              )}
            </div>
            <div className="shrink-0">
              <ProgressRow
                label=""
                status={row.status}
                detail={
                  row.status === 'success' ? `${row.imported ?? 0} tracks` : row.error
                }
                onRetry={row.status === 'error' ? () => importTracklist(i) : undefined}
              />
            </div>
          </div>
        ))}
      </div>

      {done && (
        <p className="text-xs text-success text-center">
          Import complete — {rows.filter((r) => r.status === 'success').length} sets created
        </p>
      )}

      <button
        onClick={handleImport}
        disabled={running || selected === 0 || done}
        className="w-full py-2 bg-accent text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50"
      >
        {running ? 'Importing…' : `Import ${selected} set${selected !== 1 ? 's' : ''}`}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/tomas/Documents/Github/zephyron-extension
git add src/panel/components/ArtistImport.tsx
git commit -m "feat: add ArtistImport component"
```

---

## Task 14: Final extension build verification

- [ ] **Step 1: Build the extension**

```bash
cd /home/tomas/Documents/Github/zephyron-extension
bun run build
```

Expected: `dist/` created, no TypeScript errors.

- [ ] **Step 2: Load and smoke-test in Chrome**

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select `dist/`
4. Open `https://www.1001tracklists.com` in a new tab
5. Click the extension icon → side panel opens
6. Navigate to a tracklist page → panel shows track data
7. Open settings → enter your Zephyron URL + API key → Test Connection → "Connected"
8. Verify importing a tracklist creates a set in Zephyron admin

---

## Task 15: Main repo — `X-Admin-API-Key` auth support

**Files:**
- Modify: `worker/lib/auth.ts`

- [ ] **Step 1: Add API key check to `requireAdmin` in `worker/lib/auth.ts`**

Replace the existing `requireAdmin` function body with:

```ts
export async function requireAdmin(
  request: Request,
  env: Env
): Promise<{ user: { id: string; role: string; name: string; email: string } } | Response> {
  // Allow extension/headless admin access via static API key
  const apiKey = request.headers.get('X-Admin-API-Key')
  if (apiKey) {
    const validKey = (env as any).ADMIN_API_KEY as string | undefined
    if (!validKey) {
      return new Response(JSON.stringify({ error: 'ADMIN_API_KEY not configured', ok: false }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }
    if (apiKey !== validKey) {
      return new Response(JSON.stringify({ error: 'Invalid API key', ok: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }
    return { user: { id: 'api-key', role: 'admin', name: 'API Key', email: '' } }
  }

  try {
    const auth = createAuth(env)
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Authentication required', ok: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    if (session.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required', ok: false }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    return { user: session.user as any }
  } catch (err) {
    console.error('[auth] Admin check failed:', err)
    return new Response(JSON.stringify({ error: 'Authentication failed', ok: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}
```

- [ ] **Step 2: Add `ADMIN_API_KEY` to `wrangler.jsonc` vars comment**

In `wrangler.jsonc`, find the `"vars"` section and add a comment:

```jsonc
// Secrets (set via: wrangler secret put ADMIN_API_KEY)
// ADMIN_API_KEY — static key for Chrome extension and headless admin access
```

- [ ] **Step 3: Set the secret locally for dev**

```bash
cd /home/tomas/Documents/Github/zephyron
echo "your-secret-key" | wrangler secret put ADMIN_API_KEY
```

- [ ] **Step 4: Commit**

```bash
cd /home/tomas/Documents/Github/zephyron
git add worker/lib/auth.ts wrangler.jsonc
git commit -m "feat: add X-Admin-API-Key header support to requireAdmin"
```

---

## Task 16: Main repo — YouTube search endpoint

**Files:**
- Modify: `worker/services/invidious.ts`
- Modify: `worker/routes/admin.ts`
- Modify: `worker/index.ts`

- [ ] **Step 1: Add `searchVideos` to `worker/services/invidious.ts`**

Append to the bottom of the file:

```ts
export interface InvidiousSearchResult {
  video_id: string
  title: string
  author: string
  thumbnail: string
  duration_seconds: number
}

export async function searchVideos(
  q: string,
  env: Env,
  limit = 5
): Promise<InvidiousSearchResult[]> {
  const baseUrl = getBaseUrl(env)
  const params = new URLSearchParams({ q, type: 'video', sort_by: 'relevance' })
  const url = `${baseUrl}/api/v1/search?${params}`

  const resp = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!resp.ok) {
    throw new Error(`Invidious search failed: ${resp.status}`)
  }

  const results = await resp.json() as Array<Record<string, unknown>>

  return results.slice(0, limit).map((item) => {
    const thumbnails = (item.videoThumbnails as Array<{ url: string; quality: string }> | undefined) ?? []
    const thumb = thumbnails.find((t) => t.quality === 'medium') ?? thumbnails[0]
    return {
      video_id: String(item.videoId ?? ''),
      title: String(item.title ?? ''),
      author: String(item.author ?? ''),
      thumbnail: thumb?.url ?? '',
      duration_seconds: Number(item.lengthSeconds) || 0,
    }
  }).filter((r) => r.video_id)
}
```

- [ ] **Step 2: Add `youtubeSearch` handler to `worker/routes/admin.ts`**

Append to the bottom of `worker/routes/admin.ts`:

```ts
import { searchVideos } from '../services/invidious'

// GET /api/admin/youtube-search?q=<query> — proxy Invidious video search
export async function youtubeSearch(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const q = new URL(request.url).searchParams.get('q')?.trim()
  if (!q) return errorResponse('q parameter required', 400)

  try {
    const results = await searchVideos(q, env)
    return json({ data: results, ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Search failed'
    return errorResponse(message, 500)
  }
}
```

Note: `searchVideos` import must be added at the top of the file alongside other imports from `'../services/invidious'`. If there are no existing imports from that file, add:
```ts
import { searchVideos } from '../services/invidious'
```

- [ ] **Step 3: Register the route in `worker/index.ts`**

In `worker/index.ts`, add the import and route registration.

Find the import line:
```ts
import {
  triggerDetection, getDetectionStatus, mlStats,
  evolvePromptRoute, listJobs, redetectLowConfidence,
} from './routes/admin'
```

Replace with:
```ts
import {
  triggerDetection, getDetectionStatus, mlStats,
  evolvePromptRoute, listJobs, redetectLowConfidence,
  youtubeSearch,
} from './routes/admin'
```

Then find the block of admin routes (near `router.get('/api/admin/ml/stats', ...)`) and add:
```ts
router.get('/api/admin/youtube-search', withAdmin(youtubeSearch))
```

- [ ] **Step 4: Commit**

```bash
cd /home/tomas/Documents/Github/zephyron
git add worker/services/invidious.ts worker/routes/admin.ts worker/index.ts
git commit -m "feat: add /api/admin/youtube-search endpoint via Invidious proxy"
```

---

## Task 17: End-to-end smoke test

- [ ] **Step 1: Start Zephyron dev worker**

```bash
cd /home/tomas/Documents/Github/zephyron
bun run dev
```

Expected: Worker running at `http://localhost:8787`

- [ ] **Step 2: Test YouTube search endpoint**

```bash
curl -H "X-Admin-API-Key: your-secret-key" \
  "http://localhost:8787/api/admin/youtube-search?q=Marco+Faraone+Fabric"
```

Expected: JSON array with `video_id`, `title`, `author`, `thumbnail`, `duration_seconds`.

- [ ] **Step 3: Test X-Admin-API-Key auth rejection**

```bash
curl -H "X-Admin-API-Key: wrong-key" "http://localhost:8787/api/admin/youtube-search?q=test"
```

Expected: `{"error":"Invalid API key","ok":false}` with HTTP 401.

- [ ] **Step 4: Load extension in Chrome and import a real tracklist**

1. Rebuild extension: `cd ../zephyron-extension && bun run build`
2. Reload extension in `chrome://extensions`
3. Navigate to any 1001TL tracklist page
4. Open side panel → fill in URL + API key → import
5. Verify set appears in Zephyron admin with tracks

- [ ] **Step 5: Commit final state**

```bash
cd /home/tomas/Documents/Github/zephyron-extension
git add -A
git commit -m "feat: complete Zephyron Chrome extension v0.1"
```
