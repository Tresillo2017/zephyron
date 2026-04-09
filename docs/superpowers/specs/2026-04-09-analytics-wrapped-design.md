# Profile Analytics & Wrapped — Phase 2 Design

**Date:** 2026-04-09  
**Version:** 0.5.0-alpha  
**Status:** Design Approved

## Overview

Phase 2 adds rich listening analytics, monthly summaries, and annual Wrapped with shareable image generation. This builds on Phase 1's profile foundation (avatar, bio, privacy) to give users meaningful insights into their listening habits.

### Goals

1. **Accurate session tracking** — Replace basic position tracking with proper session-based analytics
2. **Monthly summaries** — Give users regular engagement with "Your Month in Music" views
3. **Annual Wrapped** — Create shareable year-in-review moments with downloadable images
4. **Performance at scale** — Pre-compute expensive stats via cron jobs for instant UX
5. **Privacy-respecting** — Analytics only for authenticated users, fresh start on signup

### Key Decisions

- **Session model:** 15% duration threshold for qualifying sessions
- **Aggregation:** Batch pre-computation (monthly: 1st at 5am PT, annual: Jan 2 at 5am PT)
- **Time zones:** Canonical Pacific timezone for all date boundaries
- **Image generation:** Canvas API on Cloudflare Workers (no external services)
- **Anonymous users:** No analytics tracking (fresh start on signup, no history migration)

## Architecture

### Session Snapshot Model

**Core concept:** Track discrete listening sessions with start/end times. Aggregate via scheduled cron jobs. Current month computed on-demand with caching.

**Data flow:**
```
User plays set
    ↓
Frontend creates session (POST /api/sessions/start)
    ↓
Progress updates every 30s (PATCH /api/sessions/:id/progress)
    ↓
Session ends (POST /api/sessions/:id/end)
    ↓
Backend calculates percentage_completed, sets qualifies flag
    ↓
Cron jobs aggregate sessions → stats cache
    ↓
Frontend reads pre-computed stats
```

**Session qualification:**
- Must listen to ≥15% of set duration to qualify for stats
- Example: 60-minute set requires 9 minutes of actual listening time
- Hybrid tracking: individual sessions for "sets played", cumulative time for "hours listened"

**Timezone handling:**
- All timestamps stored in UTC (ISO 8601)
- `session_date` field calculated in Pacific timezone from `started_at`
- Canonical timezone: `America/Los_Angeles` (Pacific Time)
- Streak and monthly boundaries use Pacific dates

## Database Schema

### New Tables

**`listening_sessions`** — Core session tracking

```sql
CREATE TABLE listening_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  set_id TEXT NOT NULL,
  started_at TEXT NOT NULL,           -- ISO 8601 timestamp (UTC)
  ended_at TEXT,                       -- NULL if session still active
  duration_seconds INTEGER,            -- Actual listening time (cumulative)
  last_position_seconds REAL,          -- For resume playback
  percentage_completed REAL,           -- duration / set.duration * 100
  qualifies INTEGER DEFAULT 0,         -- 1 if >= 15%, used for stats
  session_date TEXT NOT NULL,          -- YYYY-MM-DD in Pacific timezone
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY (set_id) REFERENCES sets(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user ON listening_sessions(user_id, started_at DESC);
CREATE INDEX idx_sessions_set ON listening_sessions(set_id);
CREATE INDEX idx_sessions_date ON listening_sessions(session_date, user_id);
CREATE INDEX idx_sessions_qualifies ON listening_sessions(user_id, qualifies, session_date);
```

**`user_monthly_stats`** — Pre-computed monthly aggregations

```sql
CREATE TABLE user_monthly_stats (
  user_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,           -- 1-12
  total_seconds INTEGER NOT NULL,
  qualifying_sessions INTEGER NOT NULL,
  unique_sets_count INTEGER NOT NULL,
  top_artists TEXT,                 -- JSON array: ["Artist 1", "Artist 2", "Artist 3"]
  top_genre TEXT,
  longest_set_id TEXT,
  discoveries_count INTEGER,        -- New artists encountered in this month
  generated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, year, month),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);
```

**`user_annual_stats`** — Pre-computed annual aggregations

```sql
CREATE TABLE user_annual_stats (
  user_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  total_seconds INTEGER NOT NULL,
  qualifying_sessions INTEGER NOT NULL,
  unique_sets_count INTEGER NOT NULL,
  top_artists TEXT,                 -- JSON array, top 5
  top_genre TEXT,
  longest_streak_days INTEGER,
  discoveries_count INTEGER,
  generated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, year),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);
```

**`wrapped_images`** — R2 storage references

```sql
CREATE TABLE wrapped_images (
  user_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  r2_key TEXT NOT NULL,            -- Path: wrapped/2026/{user_id}.png
  generated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, year),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);
```

### Migration Strategy

- Keep existing `listen_history` table (used by other features, backward compatibility)
- Phase 2 creates `listening_sessions` in parallel
- Phase 3 can deprecate `listen_history` after all features migrate

## Session Tracking

### Session Lifecycle

**1. Play Start**

User clicks play on a set:

```typescript
POST /api/sessions/start
Body: { set_id: string }

// Backend logic:
- Validate user is authenticated (401 if not)
- Check if user has active session (ended_at = NULL) for this set
  - If yes: return existing session_id (prevent duplicates)
  - If no: create new session
- Generate session_id
- Set started_at = now() (UTC)
- Set ended_at = NULL
- Calculate session_date = convert started_at to Pacific, extract YYYY-MM-DD
- Return { session_id, started_at }
```

**2. Progress Updates**

Every 30 seconds while playing:

```typescript
PATCH /api/sessions/:id/progress
Body: { position_seconds: number }

// Backend logic:
- Validate session belongs to authenticated user
- Update last_position_seconds
- Calculate duration_seconds = cumulative time played
  - Simple approach: duration += 30 (assumes continuous playback)
  - Robust approach: track last update timestamp, add delta
- Return { ok: true }

// Frontend retry logic:
- If network error: retry up to 3 times with exponential backoff
- If all retries fail: log error, continue playback
- Session will be finalized by cleanup job using last successful update
```

**3. Play End**

User pauses, finishes set, or navigates away:

```typescript
POST /api/sessions/:id/end
Body: { position_seconds: number }

// Backend logic:
- Validate session belongs to authenticated user
- Set ended_at = now() (UTC)
- Finalize duration_seconds
- Fetch set.duration_seconds from database
- Calculate percentage_completed = (duration_seconds / set.duration_seconds) * 100
- Set qualifies = 1 if percentage_completed >= 15%, else 0
- Return { ok: true, qualifies }
```

**4. Orphaned Session Cleanup**

Cron job runs every hour:

```typescript
// Scheduled Worker: 0 * * * * (every hour)

// Logic:
- Find sessions where ended_at IS NULL AND created_at < (now - 4 hours)
- For each orphaned session:
  - Set ended_at = created_at + (duration_seconds || 0)
    - Use last known duration from progress updates
  - Calculate percentage_completed
  - Set qualifies flag
  - Log cleanup for monitoring
```

### Anonymous vs. Authenticated

- **Anonymous users:** Sessions NOT tracked (no user_id)
- **Analytics requirement:** Must have account to access analytics/Wrapped
- **On signup:** Fresh start, no history migration from anonymous sessions
- **Rationale:** Simplifies logic, encourages signup, clean data model

### Edge Cases

**Duplicate session creation (double-click play):**
- Backend checks for existing active session (NULL `ended_at`) for same set
- Returns existing `session_id` instead of creating duplicate

**Network interruptions during progress updates:**
- Frontend retries failed updates (max 3 attempts)
- If all fail, session closes based on last successful update via cleanup job

**User plays set <15% but backend crashes:**
- Default `qualifies = 0` ensures non-qualifying sessions excluded
- Cleanup job recalculates percentage for finalized sessions missing flag

**Set metadata incomplete (genre NULL, artist NULL):**
- Top genre: skip NULLs, use next most common
- Top artist: fall back to `set.artist` if `detections.track_artist` NULL
- If still NULL, show "Various Artists" or omit stat

## Stats Aggregation

### Monthly Stats Computation

**Cron schedule:** 1st of every month, 5:00 AM Pacific

**Processes:** All users with qualifying sessions in previous month

**Algorithm:**

```sql
-- Step 1: Aggregate base stats
INSERT INTO user_monthly_stats (user_id, year, month, total_seconds, qualifying_sessions, unique_sets_count)
SELECT 
  user_id,
  CAST(strftime('%Y', session_date) AS INTEGER) as year,
  CAST(strftime('%m', session_date) AS INTEGER) as month,
  SUM(duration_seconds) as total_seconds,
  COUNT(*) FILTER (WHERE qualifies = 1) as qualifying_sessions,
  COUNT(DISTINCT set_id) as unique_sets_count
FROM listening_sessions
WHERE session_date >= '2026-03-01' AND session_date < '2026-04-01'
  AND user_id IS NOT NULL
GROUP BY user_id;

-- Step 2: Calculate top artists (per user)
-- Join sessions → sets → detections to get track artists
-- Weight by session duration (longer sessions = more exposure)
WITH artist_exposure AS (
  SELECT 
    s.user_id,
    d.track_artist,
    SUM(s.duration_seconds) as exposure_seconds
  FROM listening_sessions s
  JOIN sets st ON s.set_id = st.id
  JOIN detections d ON d.set_id = st.id
  WHERE s.session_date >= '2026-03-01' AND s.session_date < '2026-04-01'
    AND s.user_id IS NOT NULL
    AND d.track_artist IS NOT NULL
  GROUP BY s.user_id, d.track_artist
)
SELECT 
  user_id,
  json_group_array(track_artist) as top_artists
FROM (
  SELECT user_id, track_artist
  FROM artist_exposure
  ORDER BY exposure_seconds DESC
  LIMIT 3
)
GROUP BY user_id;

-- Update user_monthly_stats.top_artists with JSON result

-- Step 3: Calculate top genre (per user)
-- Simple mode on set.genre weighted by session count
WITH genre_plays AS (
  SELECT 
    s.user_id,
    st.genre,
    COUNT(*) as plays
  FROM listening_sessions s
  JOIN sets st ON s.set_id = st.id
  WHERE s.session_date >= '2026-03-01' AND s.session_date < '2026-04-01'
    AND s.user_id IS NOT NULL
    AND st.genre IS NOT NULL
  GROUP BY s.user_id, st.genre
)
SELECT user_id, genre
FROM genre_plays
WHERE plays = (SELECT MAX(plays) FROM genre_plays gp2 WHERE gp2.user_id = genre_plays.user_id)
GROUP BY user_id;

-- Step 4: Find longest set
SELECT 
  user_id,
  set_id as longest_set_id
FROM listening_sessions
WHERE session_date >= '2026-03-01' AND session_date < '2026-04-01'
  AND user_id IS NOT NULL
GROUP BY user_id
HAVING MAX(duration_seconds);

-- Step 5: Calculate discoveries (new artists in this month)
-- Artists heard in March who were NOT heard in any prior month
WITH march_artists AS (
  SELECT DISTINCT s.user_id, d.track_artist
  FROM listening_sessions s
  JOIN detections d ON d.set_id = s.set_id
  WHERE s.session_date >= '2026-03-01' AND s.session_date < '2026-04-01'
    AND d.track_artist IS NOT NULL
),
prior_artists AS (
  SELECT DISTINCT s.user_id, d.track_artist
  FROM listening_sessions s
  JOIN detections d ON d.set_id = s.set_id
  WHERE s.session_date < '2026-03-01'
    AND d.track_artist IS NOT NULL
)
SELECT 
  m.user_id,
  COUNT(*) as discoveries_count
FROM march_artists m
LEFT JOIN prior_artists p ON m.user_id = p.user_id AND m.track_artist = p.track_artist
WHERE p.track_artist IS NULL
GROUP BY m.user_id;

-- Update user_monthly_stats.discoveries_count
```

**Performance considerations:**
- Monthly job processes one month at a time (bounded data set)
- Indexes on `session_date`, `user_id`, `qualifies` ensure fast filtering
- Target: <10 seconds per user, <3 hours for 1000 users

### Annual Stats Computation

**Cron schedule:** January 2nd, 5:00 AM Pacific (allows Jan 1 to complete)

**Processes:** All users with qualifying sessions in previous year

**Similar queries to monthly, with these additions:**

**Longest streak calculation:**

```sql
-- Fetch all distinct qualifying session dates for user in year
SELECT DISTINCT session_date 
FROM listening_sessions
WHERE user_id = ? 
  AND qualifies = 1
  AND session_date >= '2026-01-01' AND session_date < '2027-01-01'
ORDER BY session_date;
```

**Streak algorithm (Worker logic):**

```typescript
function calculateLongestStreak(dates: string[]): number {
  if (dates.length === 0) return 0
  
  let maxStreak = 1
  let currentStreak = 1
  
  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1])
    const currDate = new Date(dates[i])
    const daysDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysDiff === 1) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }
  
  return maxStreak
}
```

**Top 5 artists (instead of top 3 for monthly):**

Same query as monthly, but `LIMIT 5` instead of 3.

### Current Month Stats (On-Demand)

**API endpoint:** `GET /api/wrapped/monthly/:year-:month`

When requested month is current month:
1. Run aggregation queries for partial month (session_date >= '2026-04-01' AND session_date < now())
2. Cache result for 1 hour using Cloudflare Cache API
3. Return stats without writing to database

When requested month is in the past:
1. Read from `user_monthly_stats` table (pre-computed)
2. Return cached result

**Cache key format:** `monthly-stats:${userId}:${year}-${month}`

## Wrapped Image Generation

### Canvas-Based Rendering

**Library:** `@napi-rs/canvas` (Rust-based WASM canvas, Workers-compatible)

**Image specifications:**
- Dimensions: 1080x1920px (9:16 Instagram Story ratio)
- Format: PNG with alpha channel
- File size target: <500KB per image
- Design: 6 cards stacked vertically with Zephyron branding

### Card Layout Structure

```
┌─────────────────────────────┐
│                             │
│      ZEPHYRON 2026          │  ← Header (logo, year)
│                             │
├─────────────────────────────┤
│                             │
│       250 HOURS             │  ← Big stat
│   of electronic music       │
│                             │
├─────────────────────────────┤
│                             │
│    YOUR TOP ARTIST          │  ← Spotlight
│                             │
│     AMELIE LENS             │
│      (45 hours)             │
│                             │
├─────────────────────────────┤
│                             │
│     TOP 5 ARTISTS           │  ← List card
│   1. Amelie Lens            │
│   2. Charlotte de Witte     │
│   3. Adam Beyer             │
│   4. Tale Of Us             │
│   5. Maceo Plex             │
│                             │
├─────────────────────────────┤
│                             │
│    42 NEW ARTISTS           │  ← Discovery stat
│      discovered             │
│                             │
├─────────────────────────────┤
│                             │
│    28 DAY STREAK            │  ← Achievement
│   Your longest run          │
│                             │
└─────────────────────────────┘
```

### Rendering Flow

**Cron job (Jan 2, 5am PT):** After annual stats computed

```typescript
// For each user with annual stats:
async function generateWrappedImage(userId: string, stats: AnnualStats, env: Env) {
  const canvas = createCanvas(1080, 1920)
  const ctx = canvas.getContext('2d')
  
  // Load fonts
  registerFont('assets/fonts/Geist-Bold.woff2', { family: 'Geist', weight: 'bold' })
  registerFont('assets/fonts/Geist-Regular.woff2', { family: 'Geist', weight: 'normal' })
  
  // Background gradient (dark purple → black)
  const gradient = ctx.createLinearGradient(0, 0, 0, 1920)
  gradient.addColorStop(0, '#1a0b2e')
  gradient.addColorStop(1, '#000000')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1080, 1920)
  
  // Header card (y: 80-240)
  ctx.font = 'bold 48px Geist'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.fillText('ZEPHYRON', 540, 150)
  ctx.font = 'normal 36px Geist'
  ctx.fillStyle = '#a78bfa'
  ctx.fillText(stats.year.toString(), 540, 200)
  
  // Hours card (y: 280-520)
  ctx.font = 'bold 96px Geist'
  ctx.fillStyle = '#ffffff'
  const hours = Math.floor(stats.total_seconds / 3600)
  ctx.fillText(hours.toString(), 540, 420)
  ctx.font = 'normal 32px Geist'
  ctx.fillStyle = '#a78bfa'
  ctx.fillText('HOURS LISTENED', 540, 480)
  
  // Top artist card (y: 560-800)
  ctx.font = 'normal 24px Geist'
  ctx.fillStyle = '#8b5cf6'
  ctx.fillText('YOUR TOP ARTIST', 540, 640)
  ctx.font = 'bold 56px Geist'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(stats.top_artist.name.toUpperCase(), 540, 720)
  ctx.font = 'normal 28px Geist'
  ctx.fillStyle = '#a78bfa'
  const artistHours = Math.floor(stats.top_artist.hours)
  ctx.fillText(`(${artistHours} hours)`, 540, 770)
  
  // Top 5 artists card (y: 840-1180)
  ctx.font = 'normal 24px Geist'
  ctx.fillStyle = '#8b5cf6'
  ctx.fillText('TOP 5 ARTISTS', 540, 900)
  ctx.font = 'normal 32px Geist'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'left'
  const topArtists = JSON.parse(stats.top_artists)
  topArtists.forEach((artist: string, i: number) => {
    ctx.fillText(`${i + 1}. ${artist}`, 200, 980 + i * 50)
  })
  ctx.textAlign = 'center'
  
  // Discoveries card (y: 1220-1420)
  ctx.font = 'bold 72px Geist'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(stats.discoveries_count.toString(), 540, 1320)
  ctx.font = 'normal 28px Geist'
  ctx.fillStyle = '#a78bfa'
  ctx.fillText('NEW ARTISTS', 540, 1370)
  ctx.fillText('discovered', 540, 1410)
  
  // Streak card (y: 1460-1720)
  ctx.font = 'bold 72px Geist'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(stats.longest_streak_days.toString(), 540, 1600)
  ctx.font = 'normal 28px Geist'
  ctx.fillStyle = '#a78bfa'
  ctx.fillText('DAY STREAK', 540, 1650)
  ctx.fillText('Your longest run', 540, 1690)
  
  // Footer
  ctx.font = 'normal 20px Geist'
  ctx.fillStyle = '#666666'
  ctx.fillText('zephyron.app', 540, 1840)
  
  // Export to buffer
  const buffer = canvas.toBuffer('image/png')
  
  // Upload to R2
  const r2Key = `wrapped/${stats.year}/${userId}.png`
  await env.WRAPPED_IMAGES.put(r2Key, buffer, {
    httpMetadata: {
      contentType: 'image/png',
    },
  })
  
  // Store reference in database
  await env.DB.prepare(
    'INSERT INTO wrapped_images (user_id, year, r2_key, generated_at) VALUES (?, ?, ?, ?)'
  ).bind(userId, stats.year, r2Key, new Date().toISOString()).run()
  
  return r2Key
}
```

### Font Handling

- Bundle Geist font files (woff2) in Worker assets directory
- Load fonts before rendering: `registerFont('path/to/font.woff2', { family: 'Geist' })`
- Fallback: If font loading fails, use system font (Arial/Helvetica)

### Error Handling

**Canvas rendering fails:**
- Catch error, log to Worker analytics
- Return stats without `image_url` field
- User sees text-based Wrapped, no download button

**R2 upload fails:**
- Retry once after 5-second delay
- If still fails, log error and continue
- Mark in database: `wrapped_images.r2_key = 'ERROR'`
- Provide manual retry endpoint for admins

**Font loading fails:**
- Fallback to system font
- Image still generates with reduced visual quality

## API Endpoints

### Session Management

**`POST /api/sessions/start`**
- Body: `{ set_id: string }`
- Returns: `{ session_id: string, started_at: string }`
- Auth: Required (401 if not logged in)

**`PATCH /api/sessions/:id/progress`**
- Body: `{ position_seconds: number }`
- Returns: `{ ok: true }`
- Auth: Required, validates session ownership

**`POST /api/sessions/:id/end`**
- Body: `{ position_seconds: number }`
- Returns: `{ ok: true, qualifies: boolean }`
- Auth: Required, validates session ownership

### Analytics

**`GET /api/wrapped/:year`**
- Returns: Annual Wrapped data + image URL
- Response:
```typescript
{
  year: number
  total_hours: number
  top_artists: string[]  // Top 5
  top_artist: { name: string, hours: number }
  top_genre: string
  discoveries_count: number
  longest_streak_days: number
  image_url?: string
  generated_at: string
}
```
- Auth: Required
- Errors: 404 if no data, 422 if current year requested before January

**`GET /api/wrapped/:year/download`**
- Returns: PNG file with content-disposition header
- Headers: `Content-Type: image/png`, `Content-Disposition: attachment; filename="zephyron-wrapped-2026.png"`
- Auth: Required
- Errors: 404 if image not generated

**`GET /api/wrapped/monthly/:year-:month`**
- Example: `/api/wrapped/monthly/2026-04`
- Returns: Monthly summary data
- Response:
```typescript
{
  year: number
  month: number
  total_hours: number
  top_artists: string[]  // Top 3
  top_genre: string
  longest_set: { id: string, title: string, artist: string }
  discoveries_count: number
  generated_at: string
}
```
- Auth: Required
- Behavior: Past months read from cache, current month computed on-demand with 1-hour cache

## Frontend Components

### New Routes

- `/app/wrapped/:year` - Annual Wrapped view
- `/app/wrapped/monthly/:year-:month` - Monthly summary

### Component Structure

**`WrappedPage.tsx`** - Annual Wrapped

```typescript
import { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import { fetchWrapped } from '../lib/api'
import { Button } from '../components/ui/Button'

interface WrappedData {
  year: number
  total_hours: number
  top_artists: string[]
  top_artist: { name: string, hours: number }
  top_genre: string
  discoveries_count: number
  longest_streak_days: number
  image_url?: string
  generated_at: string
}

export function WrappedPage() {
  const { year } = useParams()
  const [data, setData] = useState<WrappedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWrapped(year).then(setData).catch(setError).finally(() => setLoading(false))
  }, [year])

  if (loading) return <SkeletonLoader />
  if (error) return <ErrorState message={error} />
  if (!data) return <EmptyState message="Not enough listening data yet" />

  return (
    <div className="px-6 lg:px-10 py-6">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Hero */}
        <div className="text-center">
          <h1 className="text-4xl font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c1))' }}>
            Your {data.year} Wrapped
          </h1>
          <p className="text-lg mt-2" style={{ color: 'hsl(var(--c2))' }}>
            A year in electronic music
          </p>
        </div>

        {/* Hours Card */}
        <div className="card text-center py-12">
          <p className="text-6xl font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--h3))' }}>
            {data.total_hours}
          </p>
          <p className="text-xl mt-2" style={{ color: 'hsl(var(--c2))' }}>
            hours of electronic music
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            value={data.top_artist.name}
            label="Top Artist"
            sublabel={`${data.top_artist.hours} hours`}
          />
          <StatCard
            value={data.longest_streak_days}
            label="Longest Streak"
            sublabel="consecutive days"
          />
          <StatCard
            value={data.discoveries_count}
            label="New Artists"
            sublabel="discovered"
          />
        </div>

        {/* Top 5 Artists */}
        <div className="card">
          <h3 className="text-sm font-[var(--font-weight-bold)] mb-4" style={{ color: 'hsl(var(--h3))' }}>
            Your Top 5 Artists
          </h3>
          <ol className="space-y-2">
            {data.top_artists.map((artist, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="text-2xl font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c3))' }}>
                  {i + 1}
                </span>
                <span className="text-lg" style={{ color: 'hsl(var(--c1))' }}>
                  {artist}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Download Image */}
        {data.image_url && (
          <div className="text-center">
            <Button
              variant="primary"
              onClick={() => window.open(`/api/wrapped/${year}/download`, '_blank')}
            >
              Download Your Wrapped
            </Button>
            <p className="text-xs mt-2" style={{ color: 'hsl(var(--c3))' }}>
              Share on social media
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
```

**`MonthlyWrappedPage.tsx`** - Monthly summary

Similar structure, simplified stats (top 3 artists, no streak, no image).

### Profile Page Integration

Update `/app/profile` Overview tab:

```typescript
// Add quick stats section
<div className="card">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>This month</p>
      <p className="text-2xl font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c1))' }}>
        {currentMonthHours} hours
      </p>
    </div>
    <Link to={`/app/wrapped/monthly/${currentYearMonth}`} className="text-sm" style={{ color: 'hsl(var(--h3))' }}>
      View summary →
    </Link>
  </div>
</div>

// Add Wrapped CTA (if Jan-Feb)
{showWrappedCTA && (
  <Link to={`/app/wrapped/${lastYear}`} className="card hover:bg-[hsl(var(--b4))] transition-colors">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-lg font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--h3))' }}>
          Your {lastYear} Wrapped is ready
        </p>
        <p className="text-sm mt-1" style={{ color: 'hsl(var(--c3))' }}>
          See your year in music
        </p>
      </div>
      <svg className="w-6 h-6" style={{ color: 'hsl(var(--h3))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </Link>
)}
```

### Loading & Empty States

**Loading (skeleton):**
- Shimmer effect cards matching layout
- Gray placeholder blocks for text

**Empty state:**
- "Not enough listening data yet"
- Minimum threshold: 10 qualifying sessions OR 1 hour total
- CTA: "Discover new sets" button linking to browse

**Error states:**
- 404: "No data for this period"
- 422: "Wrapped for {year} isn't available yet. Check back in January!"
- 500: "Something went wrong. Please try again later."

## Testing Strategy

### Unit Tests (Backend)

**Session lifecycle:**
- Test session creation (start)
- Test progress updates (calculate duration)
- Test session finalization (end, calculate percentage)
- Test qualification logic (14.9% vs 15% vs 100%)
- Test cleanup job (orphaned sessions after 4 hours)

**Timezone conversion:**
- Test UTC → Pacific conversion for various times
- Test date boundary edge cases (11:59 PM PT vs 12:00 AM PT)

**Stats aggregation:**
- Mock listening_sessions data with known results
- Test top artists query (weighted by duration)
- Test top genre query (mode)
- Test discovery count (first-time artist detection)
- Test streak calculation (consecutive days)

### Integration Tests (API)

**Session endpoints:**
- POST /api/sessions/start → creates session, returns ID
- PATCH /api/sessions/:id/progress → updates duration
- POST /api/sessions/:id/end → finalizes, sets qualifies flag
- Test duplicate session prevention
- Test orphaned session cleanup

**Analytics endpoints:**
- GET /api/wrapped/2026 → returns cached stats + image URL
- GET /api/wrapped/monthly/2026-04 → returns current/past month
- Test 401 unauthorized
- Test 404 no data
- Test 422 invalid year

### Cron Job Testing

**Local testing:**
- Use `wrangler dev --test-scheduled` to trigger cron locally
- Verify monthly job generates correct stats for fixture data
- Verify annual job handles year boundaries correctly
- Verify cleanup job closes orphaned sessions after 4 hours

**Staging testing:**
- Deploy to staging environment
- Create test accounts with predetermined listening patterns
- Manually trigger cron jobs via Wrangler CLI
- Verify database state matches expectations

### Canvas Rendering Tests

**Mock canvas operations:**
- Verify draw calls (fillText, fillRect, etc.)
- Test with missing data (NULL genre, empty top artists)
- Verify R2 upload and key format

**Visual regression:**
- Generate reference images with known data
- Compare pixel differences (allow <1% variance for anti-aliasing)
- Store snapshots in test fixtures

### End-to-End Tests (Playwright)

**Session tracking flow:**
1. Log in as test user
2. Play a set for 20% duration (9 minutes of 45-minute set)
3. Verify session created with qualifies=1
4. Play another set for <15% duration
5. Verify session created with qualifies=0
6. Navigate away mid-session
7. Wait for cleanup job (or trigger manually)
8. Verify session finalized with correct duration

**Wrapped flow:**
1. Create test account with pre-populated sessions (backdated)
2. Trigger monthly cron job
3. Visit /app/wrapped/monthly/2026-03
4. Verify stats display correctly
5. Trigger annual cron job (mock date to January)
6. Visit /app/wrapped/2026
7. Verify stats display correctly
8. Verify image download works
9. Check PNG dimensions (1080x1920)

### Performance Benchmarks

**Target metrics:**
- Annual stats aggregation: <10 seconds per user
- Monthly on-demand query: <500ms response time
- Image generation: <3 seconds per image
- Cron job (1000 users): complete within 3-hour window
- Current month cache hit rate: >90%

**Load testing:**
- Simulate 100 concurrent requests to /api/wrapped/monthly/current
- Verify cache prevents database overload
- Monitor D1 query execution times

## Error Handling & Edge Cases

### Session Tracking Failures

**Orphaned sessions (user closes tab):**
- Hourly cron cleanup closes sessions with NULL `ended_at` > 4 hours old
- Uses last progress update timestamp as `ended_at`
- Prevents infinite sessions from skewing stats

**Duplicate session creation (double-click):**
- Backend validates: if user has active session (NULL `ended_at`) for same set, return existing session_id
- Frontend stores session_id in state, reuses for progress updates

**Network interruptions:**
- Frontend retries failed progress updates (max 3 attempts with exponential backoff)
- If all retries fail, session closes based on last successful update via cleanup job

**Incomplete finalization:**
- Cleanup job recalculates `percentage_completed` for sessions with NULL percentage but non-NULL `ended_at`

### Stats Aggregation Edge Cases

**No data for requested period:**
- API returns 404 Not Found with message
- Frontend shows "Not enough listening data yet" empty state
- Minimum: 1 qualifying session OR 30 minutes total

**Incomplete set metadata:**
- Top genre: skip NULLs, use next most common genre
- Top artist: if `detections.track_artist` NULL, fall back to `set.artist`
- If still NULL, show "Various Artists" or omit stat entirely

**Discovery count edge case (first month):**
- First month: all artists are new discoveries
- Cap display at 50+ if count exceeds reasonable number

**Streak calculation with gaps:**
- Only consecutive days count toward streak
- Single-day break resets streak to 1
- If max streak is 1, show "1 day streak" (not "no streak")

**Year boundaries:**
- Dec 31 → Jan 1 transition: ensure sessions dated correctly in Pacific timezone
- Annual job runs Jan 2 (gives Jan 1 time to complete)

### Image Generation Failures

**Canvas rendering crashes:**
- Catch error, log to Worker analytics with user_id
- Return stats without `image_url` field
- User sees text-based Wrapped, no download button
- Manual retry: admin endpoint to regenerate failed images

**R2 upload fails:**
- Retry once after 5-second delay
- If still fails, log error and mark as failed
- Store in database: `wrapped_images.r2_key = 'ERROR'`
- Cron job can retry failed images on next run

**Font loading fails:**
- Fallback to system font (Arial/Helvetica)
- Image still generates with reduced visual quality
- Log warning for monitoring

**Missing data fields:**
- Handle NULL values gracefully (skip card or show "N/A")
- If too many NULLs, show text-only Wrapped without image

## Deployment & Operations

### Database Migrations

**Migration order:**
1. Run migration to create new tables
2. Deploy Worker with session tracking endpoints
3. Deploy frontend with session creation logic
4. Wait 1 week for data accumulation
5. Deploy cron jobs for aggregation
6. Deploy Wrapped UI

**Rollback plan:**
- New tables don't affect existing features (listen_history still used)
- Can disable cron jobs without breaking app
- Can remove session tracking endpoints if issues arise

### Cron Job Configuration

**Monthly stats:** `0 5 1 * *` (1st of month, 5am PT)
**Annual stats:** `0 5 2 1 *` (Jan 2, 5am PT)
**Cleanup:** `0 * * * *` (every hour)

**Monitoring:**
- Log cron job start/end times
- Log user counts processed
- Alert if job exceeds 3-hour threshold
- Alert if error rate >1%

### Performance Monitoring

**Key metrics:**
- Session creation rate (requests/minute)
- Progress update success rate
- Cron job execution time
- Image generation success rate
- Cache hit rate for current month stats

**Alerts:**
- Session creation fails >5% of requests
- Cron job doesn't complete within 4 hours
- R2 upload fails >10% of images
- Cache hit rate <80%

## Success Criteria

**Phase 2 completion checklist:**
- [ ] Session tracking implemented (start, progress, end, cleanup)
- [ ] Database schema deployed with indexes
- [ ] Monthly stats cron job running and generating data
- [ ] Annual stats cron job tested (mock date to trigger)
- [ ] Canvas rendering generates valid PNG images
- [ ] R2 storage working for Wrapped images
- [ ] Wrapped page displays stats and image
- [ ] Monthly summary page displays stats
- [ ] Profile page shows quick stats and Wrapped CTA
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing on staging
- [ ] Performance benchmarks met
- [ ] Zero data loss or corruption during rollout

**User experience goals:**
- Wrapped loads instantly (<100ms cached)
- Image downloads in <2 seconds
- Monthly summary updates within 1 hour of month end
- No visible errors or empty states for active users
- Shareable images look professional on social media

**Technical goals:**
- Session tracking has >99% success rate
- Cron jobs complete within time window
- Image generation succeeds >95% of time
- Database queries stay under 500ms P95
- No N+1 query issues in aggregation

## Future Enhancements (Phase 3)

**Listening patterns visualization:**
- Time of day heatmap
- Weekday vs weekend breakdown
- Requires charting library (Chart.js or Recharts)

**Social features:**
- Compare Wrapped with friends
- Leaderboards (most hours, longest streak)
- Share Wrapped directly to Twitter/Instagram via API

**Advanced stats:**
- BPM distribution
- Key/mood analysis (if detection data available)
- Set length preferences (short vs long sets)

**Wrapped customization:**
- Choose color scheme for image
- Select which stats to include
- Add custom message/caption

**Real-time stats:**
- Live "currently listening" feed
- Current listening streak counter
- Progress toward next milestone

## Open Questions

None — design approved and ready for implementation planning.

## Appendix: Data Model Examples

**Sample session lifecycle:**

```json
// POST /api/sessions/start (t=0s)
{
  "id": "ses_abc123",
  "user_id": "user_xyz",
  "set_id": "set_def456",
  "started_at": "2026-04-09T14:30:00Z",
  "ended_at": null,
  "duration_seconds": 0,
  "session_date": "2026-04-09"  // Pacific timezone
}

// PATCH /api/sessions/ses_abc123/progress (t=30s)
{
  "duration_seconds": 30,
  "last_position_seconds": 30
}

// PATCH /api/sessions/ses_abc123/progress (t=60s)
{
  "duration_seconds": 60,
  "last_position_seconds": 60
}

// ... user listens for 10 minutes total (600 seconds)

// POST /api/sessions/ses_abc123/end (t=600s)
{
  "ended_at": "2026-04-09T14:40:00Z",
  "duration_seconds": 600,
  "last_position_seconds": 650,  // Skipped ahead near end
  "percentage_completed": 16.67,  // 600s / 3600s (60-min set)
  "qualifies": 1  // >= 15%
}
```

**Sample monthly stats:**

```json
{
  "user_id": "user_xyz",
  "year": 2026,
  "month": 3,
  "total_seconds": 54000,  // 15 hours
  "qualifying_sessions": 12,
  "unique_sets_count": 8,
  "top_artists": "[\"Amelie Lens\", \"Charlotte de Witte\", \"Adam Beyer\"]",
  "top_genre": "Techno",
  "longest_set_id": "set_def456",
  "discoveries_count": 5,
  "generated_at": "2026-04-01T12:00:00Z"
}
```

**Sample annual stats:**

```json
{
  "user_id": "user_xyz",
  "year": 2026,
  "total_seconds": 900000,  // 250 hours
  "qualifying_sessions": 156,
  "unique_sets_count": 87,
  "top_artists": "[\"Amelie Lens\", \"Charlotte de Witte\", \"Adam Beyer\", \"Tale Of Us\", \"Maceo Plex\"]",
  "top_genre": "Techno",
  "longest_streak_days": 28,
  "discoveries_count": 42,
  "generated_at": "2027-01-02T12:00:00Z"
}
```
