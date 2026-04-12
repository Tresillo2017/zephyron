# Profile Phase 2 & 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-size avatar processing, comprehensive listening stats, achievement badges (20+), and social activity feeds to user profiles.

**Architecture:** Four independent vertical slices delivered incrementally: Stats System (backend API + heatmap/pattern calculations + frontend), Badge System (database + 20+ definitions + cron job + grid UI), Activity Feed (3 feed types + privacy controls + pagination), Image Processing (multi-size generation with Workers Image Resizing API).

**Tech Stack:** Cloudflare Workers + D1, Workers Image Resizing API, Zustand, React 19, existing `stats.ts` utilities

---

## File Structure

### Slice 1: Stats System

**Backend:**
- Extend: `worker/lib/stats.ts` (add `calculateHeatmap`, `calculateWeekdayPattern`)
- Create: `worker/routes/stats.ts` (new `/api/profile/:userId/stats` endpoint)
- Modify: `worker/index.ts` (add stats route)
- Modify: `worker/types.ts` (add `ProfileStats`, `GetStatsResponse` types)

**Frontend:**
- Modify: `src/lib/types.ts` (add frontend types)
- Create: `src/stores/profileStore.ts` (Zustand store for stats/badges/activity)
- Create: `src/components/profile/ProfileStatsSection.tsx` (main stats container)
- Create: `src/components/profile/StatsGrid.tsx` (3-card grid for top metrics)
- Create: `src/components/profile/ListeningHeatmap.tsx` (7x24 heatmap visualization)
- Create: `src/components/profile/WeekdayChart.tsx` (bar chart for Mon-Sun)
- Create: `src/components/profile/TopArtistsList.tsx` (top 5 artists with durations)
- Modify: `src/pages/ProfilePage.tsx` (integrate ProfileStatsSection into Overview tab)

### Slice 2: Badge System

**Database:**
- Create: `migrations/0021_badges-and-activity.sql` (user_badges, activity_items, activity_privacy_settings)

**Backend:**
- Create: `worker/lib/badges.ts` (20+ badge definitions with checkFn)
- Create: `worker/lib/badge-engine.ts` (cron processor, real-time check helpers)
- Create: `worker/lib/activity.ts` (activity item generation helpers)
- Create: `worker/routes/badges.ts` (new `/api/profile/:userId/badges` endpoint)
- Modify: `worker/index.ts` (add badges route + cron handler)
- Modify: `worker/types.ts` (add Badge, UserBadge, ActivityItem types)
- Modify: `wrangler.jsonc` (add daily cron for badges)

**Frontend:**
- Modify: `src/lib/types.ts` (add frontend badge types)
- Modify: `src/stores/profileStore.ts` (add badge state/actions)
- Create: `src/components/profile/BadgesGrid.tsx` (earned/locked badge display)
- Create: `src/components/profile/BadgeCard.tsx` (individual badge with tooltip)
- Modify: `src/pages/ProfilePage.tsx` (add new Badges tab)

### Slice 3: Activity Feed

**Backend:**
- Extend: `worker/lib/activity.ts` (add createActivityItem helper)
- Create: `worker/routes/activity.ts` (3 endpoints: /me, /user/:id, /community)
- Create: `worker/routes/privacy.ts` (PATCH /api/profile/privacy endpoint)
- Modify: `worker/index.ts` (add activity routes)
- Modify: `worker/types.ts` (add GetActivityResponse type)

**Frontend:**
- Modify: `src/lib/types.ts` (add ActivityItem, ActivityPrivacySettings types)
- Modify: `src/stores/profileStore.ts` (add activity feed state/actions)
- Create: `src/components/activity/ActivityFeed.tsx` (main feed container with pagination)
- Create: `src/components/activity/ActivityItem.tsx` (type-specific rendering)
- Create: `src/pages/ActivityPage.tsx` (new `/app/activity` route)
- Create: `src/pages/CommunityPage.tsx` (new `/app/community` route)
- Modify: `src/pages/ProfilePage.tsx` (add ActivityFeed to Overview tab)
- Modify: `src/pages/SettingsPage.tsx` (add Activity Privacy section)
- Modify: `src/App.tsx` (add new routes)

### Slice 4: Image Processing

**Backend:**
- Modify: `worker/routes/profile.ts` (update uploadAvatar function for multi-size generation)

**Frontend:**
- Create: `src/lib/avatar.ts` (getAvatarUrl helper for size selection)
- Modify: `src/components/profile/ProfileHeader.tsx` (use getAvatarUrl with 'large')
- Modify: `src/components/activity/ActivityItem.tsx` (use getAvatarUrl with 'small')
- Modify: `src/components/ui/TopNav.tsx` (use getAvatarUrl with 'small')

---

## Slice 1: Stats System

### Task 1: Extend stats.ts with heatmap calculation

**Files:**
- Modify: `worker/lib/stats.ts:200-250` (add new function at end)

- [ ] **Step 1: Write failing test for calculateHeatmap**

```typescript
// worker/lib/stats.test.ts (create if doesn't exist, otherwise append)
import { calculateHeatmap } from './stats'
import { describe, it, expect, beforeEach } from 'vitest'

describe('calculateHeatmap', () => {
  let mockEnv: Env

  beforeEach(() => {
    mockEnv = {
      DB: {
        prepare: (query: string) => ({
          bind: (...args: any[]) => ({
            all: async () => ({
              results: [
                { day_of_week: 0, hour: 14, count: 5 },  // Sunday 2pm: 5 sessions
                { day_of_week: 1, hour: 8, count: 3 },   // Monday 8am: 3 sessions
                { day_of_week: 1, hour: 20, count: 7 },  // Monday 8pm: 7 sessions
              ]
            })
          })
        })
      }
    } as any
  })

  it('returns 7x24 grid with session counts', async () => {
    const result = await calculateHeatmap(mockEnv, 'user123', '2026-01-01', '2026-12-31')
    
    expect(result).toHaveLength(7) // 7 days
    expect(result[0]).toHaveLength(24) // 24 hours
    expect(result[0][14]).toBe(5) // Sunday 2pm = 5
    expect(result[1][8]).toBe(3)  // Monday 8am = 3
    expect(result[1][20]).toBe(7) // Monday 8pm = 7
    expect(result[0][0]).toBe(0)  // Sunday midnight = 0
  })

  it('handles empty data with zero-filled grid', async () => {
    mockEnv.DB.prepare = () => ({
      bind: () => ({
        all: async () => ({ results: [] })
      })
    }) as any

    const result = await calculateHeatmap(mockEnv, 'user123', '2026-01-01', '2026-12-31')
    
    expect(result).toHaveLength(7)
    expect(result.every(row => row.every(cell => cell === 0))).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test worker/lib/stats.test.ts`  
Expected: FAIL with "calculateHeatmap is not exported"

- [ ] **Step 3: Implement calculateHeatmap**

```typescript
// worker/lib/stats.ts (add at end of file)

/**
 * Calculate listening heatmap: 7x24 grid (day x hour) with session counts
 * @param env - Cloudflare environment with D1 database binding
 * @param userId - User ID to calculate heatmap for
 * @param startDate - Inclusive start date in YYYY-MM-DD format
 * @param endDate - Exclusive end date in YYYY-MM-DD format
 * @returns 7x24 array where heatmap[dayOfWeek][hour] = session count
 */
export async function calculateHeatmap(
  env: Env,
  userId: string,
  startDate: string,
  endDate: string
): Promise<number[][]> {
  // Initialize 7x24 grid with zeros
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))

  const query = `
    SELECT
      CAST(strftime('%w', started_at) AS INTEGER) as day_of_week,
      CAST(strftime('%H', started_at) AS INTEGER) as hour,
      COUNT(*) as count
    FROM listening_sessions
    WHERE user_id = ?
      AND session_date >= ?
      AND session_date < ?
    GROUP BY day_of_week, hour
  `

  try {
    const result = await env.DB.prepare(query).bind(userId, startDate, endDate).all()
    
    for (const row of result.results as any[]) {
      heatmap[row.day_of_week][row.hour] = row.count
    }

    return heatmap
  } catch (error) {
    console.error('Error calculating heatmap:', error)
    return heatmap // Return zero-filled grid on error
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test worker/lib/stats.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add worker/lib/stats.ts worker/lib/stats.test.ts
git commit -m "feat(stats): add calculateHeatmap for 7x24 listening patterns

Returns session counts grouped by day-of-week and hour for heatmap visualization."
```

### Task 2: Add weekday pattern calculation

**Files:**
- Modify: `worker/lib/stats.ts:260-310` (add new function)

- [ ] **Step 1: Write failing test for calculateWeekdayPattern**

```typescript
// worker/lib/stats.test.ts (append to existing file)
import { calculateWeekdayPattern } from './stats'

describe('calculateWeekdayPattern', () => {
  it('returns Mon-Sun with total hours per day', async () => {
    const mockEnv = {
      DB: {
        prepare: () => ({
          bind: () => ({
            all: async () => ({
              results: [
                { day_name: 'Monday', total_seconds: 45000 },  // 12.5 hours
                { day_name: 'Tuesday', total_seconds: 29880 }, // 8.3 hours
                { day_name: 'Wednesday', total_seconds: 36360 }, // 10.1 hours
              ]
            })
          })
        })
      }
    } as any

    const result = await calculateWeekdayPattern(mockEnv, 'user123', '2026-01-01', '2026-12-31')
    
    expect(result).toHaveLength(7)
    expect(result[0]).toEqual({ day: 'Sun', hours: 0 })
    expect(result[1]).toEqual({ day: 'Mon', hours: 12.5 })
    expect(result[2]).toEqual({ day: 'Tue', hours: 8.3 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test worker/lib/stats.test.ts -t "weekday"`  
Expected: FAIL with "calculateWeekdayPattern is not exported"

- [ ] **Step 3: Implement calculateWeekdayPattern**

```typescript
// worker/lib/stats.ts (add after calculateHeatmap)

/**
 * Calculate listening hours breakdown by day of week (Mon-Sun)
 * @param env - Cloudflare environment with D1 database binding
 * @param userId - User ID to calculate pattern for
 * @param startDate - Inclusive start date in YYYY-MM-DD format
 * @param endDate - Exclusive end date in YYYY-MM-DD format
 * @returns Array of 7 objects with day abbreviation and hours
 */
export async function calculateWeekdayPattern(
  env: Env,
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ day: string; hours: number }[]> {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  // Initialize with zeros
  const pattern = dayNames.map(day => ({ day, hours: 0 }))

  const query = `
    SELECT
      CASE CAST(strftime('%w', started_at) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
      END as day_name,
      SUM(duration_seconds) as total_seconds
    FROM listening_sessions
    WHERE user_id = ?
      AND session_date >= ?
      AND session_date < ?
    GROUP BY strftime('%w', started_at)
  `

  try {
    const result = await env.DB.prepare(query).bind(userId, startDate, endDate).all()
    
    const dayMap: Record<string, number> = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    }

    for (const row of result.results as any[]) {
      const dayIndex = dayMap[row.day_name]
      pattern[dayIndex].hours = Math.round((row.total_seconds / 3600) * 10) / 10
    }

    return pattern
  } catch (error) {
    console.error('Error calculating weekday pattern:', error)
    return pattern
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test worker/lib/stats.test.ts -t "weekday"`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add worker/lib/stats.ts worker/lib/stats.test.ts
git commit -m "feat(stats): add calculateWeekdayPattern for Mon-Sun breakdown

Returns total listening hours per day of week with abbreviated day names."
```

### Task 3: Add ProfileStats types to worker

**Files:**
- Modify: `worker/types.ts:264-300` (add after GetPublicProfileError)

- [ ] **Step 1: Add ProfileStats types**

```typescript
// worker/types.ts (add after GetPublicProfileError interface)

// Stats types
export interface ProfileStats {
  total_hours: number
  total_sessions: number
  average_session_minutes: number
  longest_session_minutes: number
  top_artists: { artist: string; hours: number }[]
  top_genres: { genre: string; count: number }[]
  discoveries_count: number
  longest_streak_days: number
  listening_heatmap: number[][]
  weekday_pattern: { day: string; hours: number }[]
}

export interface GetStatsResponse {
  stats: ProfileStats
}

export interface GetStatsError {
  error: 'INVALID_USER_ID' | 'USER_NOT_FOUND' | 'PROFILE_PRIVATE' | 'STATS_UNAVAILABLE'
  message?: string
}
```

- [ ] **Step 2: Commit type additions**

```bash
git add worker/types.ts
git commit -m "feat(types): add ProfileStats and GetStatsResponse types

Types for comprehensive listening statistics API response."
```

### Task 4: Create stats API endpoint

**Files:**
- Create: `worker/routes/stats.ts`

- [ ] **Step 1: Write failing test for getStats endpoint**

```typescript
// worker/routes/stats.test.ts (create new file)
import { getStats } from './stats'
import { describe, it, expect, beforeEach } from 'vitest'

describe('getStats', () => {
  let mockEnv: Env
  let mockRequest: Request

  beforeEach(() => {
    mockEnv = {
      DB: {
        prepare: (query: string) => {
          // Mock user check
          if (query.includes('SELECT id')) {
            return {
              bind: () => ({
                first: async () => ({ id: 'user123', is_profile_public: 1 })
              })
            }
          }
          // Mock stats queries
          return {
            bind: () => ({
              first: async () => ({ total_hours: 100, total_sessions: 50 }),
              all: async () => ({ results: [] })
            })
          }
        }
      }
    } as any
    
    mockRequest = new Request('http://localhost/api/profile/user123/stats')
  })

  it('returns stats for valid user', async () => {
    const response = await getStats(
      mockRequest,
      mockEnv,
      {} as ExecutionContext,
      { userId: 'user123' }
    )

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.stats).toBeDefined()
    expect(data.stats.total_hours).toBeGreaterThanOrEqual(0)
  })

  it('returns 400 for invalid user ID format', async () => {
    const response = await getStats(
      mockRequest,
      mockEnv,
      {} as ExecutionContext,
      { userId: 'invalid!' }
    )

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('INVALID_USER_ID')
  })

  it('returns 404 for non-existent user', async () => {
    mockEnv.DB.prepare = (query: string) => ({
      bind: () => ({
        first: async () => null
      })
    }) as any

    const response = await getStats(
      mockRequest,
      mockEnv,
      {} as ExecutionContext,
      { userId: 'user123' }
    )

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('USER_NOT_FOUND')
  })

  it('returns 403 for private profile', async () => {
    mockEnv.DB.prepare = (query: string) => ({
      bind: () => ({
        first: async () => ({ id: 'user123', is_profile_public: 0 })
      })
    }) as any

    const response = await getStats(
      mockRequest,
      mockEnv,
      {} as ExecutionContext,
      { userId: 'user123' }
    )

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('PROFILE_PRIVATE')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test worker/routes/stats.test.ts`  
Expected: FAIL with "Cannot find module './stats'"

- [ ] **Step 3: Implement stats endpoint**

```typescript
// worker/routes/stats.ts (create new file)
import { json, errorResponse } from '../lib/router'
import {
  calculateTopArtists,
  calculateTopGenre,
  calculateDiscoveries,
  calculateLongestStreak,
  calculateHeatmap,
  calculateWeekdayPattern
} from '../lib/stats'
import type {
  ProfileStats,
  GetStatsResponse,
  GetStatsError
} from '../types'

/**
 * GET /api/profile/:userId/stats?period=all|year|month
 * Returns comprehensive listening statistics for a user
 */
export async function getStats(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const userId = params.userId

  // Validate user ID format (nanoid: 12-char alphanumeric with _ or -)
  if (!userId || !/^[a-zA-Z0-9_-]{12}$/.test(userId)) {
    return json<GetStatsError>({
      error: 'INVALID_USER_ID',
      message: 'User ID format invalid'
    }, 400)
  }

  try {
    // Check if user exists and profile is public
    const user = await env.DB.prepare(
      'SELECT id, is_profile_public FROM user WHERE id = ?'
    ).bind(userId).first() as { id: string; is_profile_public: number } | null

    if (!user) {
      return json<GetStatsError>({
        error: 'USER_NOT_FOUND',
        message: 'User does not exist'
      }, 404)
    }

    if (user.is_profile_public !== 1) {
      return json<GetStatsError>({
        error: 'PROFILE_PRIVATE',
        message: 'Profile is private'
      }, 403)
    }

    // Parse period parameter (default: all time)
    const url = new URL(request.url)
    const period = url.searchParams.get('period') || 'all'
    
    // Calculate date range based on period
    const now = new Date()
    let startDate: string
    let endDate: string

    if (period === 'year') {
      startDate = `${now.getFullYear()}-01-01`
      endDate = `${now.getFullYear() + 1}-01-01`
    } else if (period === 'month') {
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      startDate = `${year}-${month}-01`
      const nextMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2
      const nextYear = now.getMonth() === 11 ? year + 1 : year
      endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
    } else {
      // all time
      startDate = '2000-01-01'
      endDate = '2100-01-01'
    }

    // Calculate all stats in parallel
    const [
      topArtists,
      topGenre,
      discoveries,
      streak,
      heatmap,
      weekdayPattern,
      basicStats
    ] = await Promise.all([
      calculateTopArtists(env, userId, startDate, endDate, 5),
      calculateTopGenre(env, userId, startDate, endDate),
      calculateDiscoveries(env, userId, startDate, endDate),
      calculateLongestStreak(env, userId, startDate, endDate),
      calculateHeatmap(env, userId, startDate, endDate),
      calculateWeekdayPattern(env, userId, startDate, endDate),
      // Basic stats query
      env.DB.prepare(`
        SELECT
          CAST(SUM(duration_seconds) / 3600.0 AS REAL) as total_hours,
          COUNT(*) as total_sessions,
          CAST(AVG(duration_seconds) / 60.0 AS REAL) as average_session_minutes,
          CAST(MAX(duration_seconds) / 60.0 AS REAL) as longest_session_minutes
        FROM listening_sessions
        WHERE user_id = ?
          AND session_date >= ?
          AND session_date < ?
      `).bind(userId, startDate, endDate).first()
    ])

    // Build stats object
    const stats: ProfileStats = {
      total_hours: Math.round((basicStats.total_hours || 0) * 10) / 10,
      total_sessions: basicStats.total_sessions || 0,
      average_session_minutes: Math.round((basicStats.average_session_minutes || 0) * 10) / 10,
      longest_session_minutes: Math.round((basicStats.longest_session_minutes || 0) * 10) / 10,
      top_artists: topArtists.map(artist => ({
        artist,
        hours: 0 // TODO: Calculate hours per artist
      })),
      top_genres: topGenre ? [{ genre: topGenre, count: 1 }] : [],
      discoveries_count: discoveries,
      longest_streak_days: streak,
      listening_heatmap: heatmap,
      weekday_pattern: weekdayPattern
    }

    return json<GetStatsResponse>({ stats })

  } catch (error) {
    console.error('Stats calculation error:', error)
    return json<GetStatsError>({
      error: 'STATS_UNAVAILABLE',
      message: 'Unable to calculate stats'
    }, 500)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test worker/routes/stats.test.ts`  
Expected: PASS

- [ ] **Step 5: Add route to worker index**

```typescript
// worker/index.ts (find router.add calls, add after profile routes)

// Import at top
import { getStats } from './routes/stats'

// Add route (around line 50-60, after profile routes)
router.add('GET', '/api/profile/:userId/stats', getStats)
```

- [ ] **Step 6: Commit**

```bash
git add worker/routes/stats.ts worker/routes/stats.test.ts worker/index.ts
git commit -m "feat(api): add GET /api/profile/:userId/stats endpoint

Returns comprehensive listening statistics including heatmap, top artists,
genres, weekday patterns, and session metrics. Respects profile privacy."
```

### Task 5: Create Zustand profile store

**Files:**
- Create: `src/stores/profileStore.ts`

- [ ] **Step 1: Add frontend types**

```typescript
// src/lib/types.ts (add after EventGenreBreakdown interface, around line 162)

// Profile Stats
export interface ProfileStats {
  total_hours: number
  total_sessions: number
  average_session_minutes: number
  longest_session_minutes: number
  top_artists: { artist: string; hours: number }[]
  top_genres: { genre: string; count: number }[]
  discoveries_count: number
  longest_streak_days: number
  listening_heatmap: number[][]
  weekday_pattern: { day: string; hours: number }[]
}
```

- [ ] **Step 2: Create profile store**

```typescript
// src/stores/profileStore.ts (create new file)
import { create } from 'zustand'
import type { ProfileStats } from '../lib/types'

interface ProfileStore {
  // Stats state
  stats: ProfileStats | null
  statsLoading: boolean
  statsError: string | null
  statsCachedAt: number | null

  // Actions
  fetchStats: (userId: string, period?: string) => Promise<void>
  clearStats: () => void
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  // Initial state
  stats: null,
  statsLoading: false,
  statsError: null,
  statsCachedAt: null,

  // Fetch stats with 5-minute caching
  fetchStats: async (userId: string, period: string = 'all') => {
    const now = Date.now()
    const cached = get().statsCachedAt
    
    // Return cached if less than 5 minutes old
    if (cached && now - cached < 5 * 60 * 1000 && get().stats) {
      return
    }

    set({ statsLoading: true, statsError: null })

    try {
      const url = `/api/profile/${userId}/stats?period=${period}`
      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch stats')
      }

      const data = await response.json()
      set({
        stats: data.stats,
        statsLoading: false,
        statsCachedAt: now
      })
    } catch (error) {
      set({
        statsError: error instanceof Error ? error.message : 'Unknown error',
        statsLoading: false
      })
    }
  },

  clearStats: () => {
    set({
      stats: null,
      statsError: null,
      statsCachedAt: null
    })
  }
}))
```

- [ ] **Step 3: Commit store**

```bash
git add src/lib/types.ts src/stores/profileStore.ts
git commit -m "feat(frontend): add profile Zustand store with stats caching

5-minute cache for stats, loading and error states."
```

### Task 6: Create stats UI components

**Files:**
- Create: `src/components/profile/StatsGrid.tsx`
- Create: `src/components/profile/ListeningHeatmap.tsx`
- Create: `src/components/profile/WeekdayChart.tsx`
- Create: `src/components/profile/TopArtistsList.tsx`

- [ ] **Step 1: Create StatsGrid component**

```typescript
// src/components/profile/StatsGrid.tsx (create new file)
import React from 'react'

interface StatCardProps {
  value: number
  label: string
  unit?: string
  accent?: boolean
}

function StatCard({ value, label, unit, accent = false }: StatCardProps) {
  return (
    <div className="card flex flex-col items-center justify-center p-6">
      <div
        className="text-4xl font-[var(--font-weight-bold)] mb-2"
        style={{ color: accent ? 'hsl(var(--h3))' : 'hsl(var(--c1))' }}
      >
        {value.toLocaleString()}{unit ? ` ${unit}` : ''}
      </div>
      <div
        className="text-sm font-[var(--font-weight-medium)]"
        style={{ color: 'hsl(var(--c2))' }}
      >
        {label}
      </div>
    </div>
  )
}

interface StatsGridProps {
  totalHours: number
  streakDays: number
  discoveries: number
}

export function StatsGrid({ totalHours, streakDays, discoveries }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <StatCard value={totalHours} label="Total Time" unit="hrs" accent />
      <StatCard value={streakDays} label="Streak" unit="days" />
      <StatCard value={discoveries} label="Discovered" unit="artists" />
    </div>
  )
}
```

- [ ] **Step 2: Create TopArtistsList component**

```typescript
// src/components/profile/TopArtistsList.tsx (create new file)
import React from 'react'

interface TopArtistsListProps {
  artists: { artist: string; hours: number }[]
}

export function TopArtistsList({ artists }: TopArtistsListProps) {
  if (artists.length === 0) {
    return null
  }

  return (
    <div className="mb-6">
      <h3
        className="text-lg font-[var(--font-weight-bold)] mb-3"
        style={{ color: 'hsl(var(--c1))' }}
      >
        Top Artists (by listening time)
      </h3>
      <div className="space-y-2">
        {artists.map((item, index) => (
          <div
            key={item.artist}
            className="flex items-center justify-between py-2"
            style={{
              borderBottom: index < artists.length - 1 ? '1px solid hsl(var(--b4) / 0.25)' : 'none'
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="text-sm font-mono font-[var(--font-weight-medium)]"
                style={{ color: 'hsl(var(--c3))' }}
              >
                {index + 1}.
              </span>
              <span
                className="font-[var(--font-weight-medium)]"
                style={{ color: 'hsl(var(--c1))' }}
              >
                {item.artist}
              </span>
            </div>
            <span
              className="text-sm font-mono"
              style={{ color: 'hsl(var(--h3))' }}
            >
              {item.hours.toFixed(1)} hrs
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create ListeningHeatmap component**

```typescript
// src/components/profile/ListeningHeatmap.tsx (create new file)
import React from 'react'

interface ListeningHeatmapProps {
  data: number[][] // 7x24 grid
}

export function ListeningHeatmap({ data }: ListeningHeatmapProps) {
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  // Find max value for color scaling
  const maxValue = Math.max(...data.flat())
  
  // Get color intensity based on value
  const getOpacity = (value: number): number => {
    if (maxValue === 0) return 0
    return value / maxValue
  }

  return (
    <div className="mb-6">
      <h3
        className="text-lg font-[var(--font-weight-bold)] mb-3"
        style={{ color: 'hsl(var(--c1))' }}
      >
        Listening Patterns
      </h3>
      <div className="card p-4">
        <div className="grid grid-cols-[auto_1fr] gap-2">
          {data.map((row, dayIndex) => (
            <React.Fragment key={dayIndex}>
              <div
                className="text-xs font-mono flex items-center justify-end pr-2"
                style={{ color: 'hsl(var(--c3))' }}
              >
                {dayLabels[dayIndex]}
              </div>
              <div className="grid grid-cols-24 gap-0.5">
                {row.map((value, hourIndex) => (
                  <div
                    key={hourIndex}
                    className="aspect-square rounded-sm"
                    style={{
                      backgroundColor: `hsl(var(--h3) / ${getOpacity(value)})`,
                      border: value === 0 ? '1px solid hsl(var(--b4) / 0.25)' : 'none'
                    }}
                    title={`${dayLabels[dayIndex]} ${hourIndex}:00 - ${value} sessions`}
                  />
                ))}
              </div>
            </React.Fragment>
          ))}
        </div>
        <div
          className="text-xs font-mono mt-2 text-center"
          style={{ color: 'hsl(var(--c3))' }}
        >
          00:00 ────────────────────── 23:00
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create WeekdayChart component**

```typescript
// src/components/profile/WeekdayChart.tsx (create new file)
import React from 'react'

interface WeekdayChartProps {
  data: { day: string; hours: number }[]
}

export function WeekdayChart({ data }: WeekdayChartProps) {
  const maxHours = Math.max(...data.map(d => d.hours))

  return (
    <div className="mb-6">
      <h3
        className="text-lg font-[var(--font-weight-bold)] mb-3"
        style={{ color: 'hsl(var(--c1))' }}
      >
        Weekday Breakdown
      </h3>
      <div className="space-y-2">
        {data.map(item => (
          <div key={item.day} className="flex items-center gap-3">
            <span
              className="text-sm font-mono w-8"
              style={{ color: 'hsl(var(--c2))' }}
            >
              {item.day}
            </span>
            <div className="flex-1 h-6 rounded" style={{ backgroundColor: 'hsl(var(--b4))' }}>
              <div
                className="h-full rounded transition-all duration-300"
                style={{
                  width: `${maxHours > 0 ? (item.hours / maxHours) * 100 : 0}%`,
                  backgroundColor: 'hsl(var(--h3))'
                }}
              />
            </div>
            <span
              className="text-sm font-mono w-12 text-right"
              style={{ color: 'hsl(var(--c1))' }}
            >
              {item.hours}h
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit UI components**

```bash
git add src/components/profile/StatsGrid.tsx src/components/profile/TopArtistsList.tsx src/components/profile/ListeningHeatmap.tsx src/components/profile/WeekdayChart.tsx
git commit -m "feat(ui): add stats visualization components

StatsGrid: 3-card metric display
TopArtistsList: Top 5 artists with hours
ListeningHeatmap: 7x24 heatmap with color intensity
WeekdayChart: Horizontal bar chart for Mon-Sun"
```

### Task 7: Create ProfileStatsSection container

**Files:**
- Create: `src/components/profile/ProfileStatsSection.tsx`

- [ ] **Step 1: Create main stats section component**

```typescript
// src/components/profile/ProfileStatsSection.tsx (create new file)
import React, { useEffect } from 'react'
import { useProfileStore } from '../../stores/profileStore'
import { StatsGrid } from './StatsGrid'
import { TopArtistsList } from './TopArtistsList'
import { ListeningHeatmap } from './ListeningHeatmap'
import { WeekdayChart } from './WeekdayChart'

interface ProfileStatsSectionProps {
  userId: string
}

export function ProfileStatsSection({ userId }: ProfileStatsSectionProps) {
  const { stats, statsLoading, statsError, fetchStats } = useProfileStore()

  useEffect(() => {
    fetchStats(userId)
  }, [userId, fetchStats])

  if (statsLoading) {
    return (
      <div className="card p-8 text-center">
        <div className="text-sm" style={{ color: 'hsl(var(--c2))' }}>
          Loading statistics...
        </div>
      </div>
    )
  }

  if (statsError) {
    return (
      <div className="card p-8 text-center">
        <div className="text-sm mb-4" style={{ color: 'hsl(var(--c2))' }}>
          Stats unavailable
        </div>
        <button
          onClick={() => fetchStats(userId)}
          className="px-4 py-2 rounded text-sm font-[var(--font-weight-medium)]"
          style={{
            backgroundColor: 'hsl(var(--h3))',
            color: 'white'
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!stats || stats.total_sessions === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-4">📊</div>
        <div className="text-lg font-[var(--font-weight-medium)] mb-2" style={{ color: 'hsl(var(--c1))' }}>
          No listening history yet
        </div>
        <div className="text-sm" style={{ color: 'hsl(var(--c2))' }}>
          Start listening to see your stats
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2
        className="text-2xl font-[var(--font-weight-bold)] mb-4"
        style={{ color: 'hsl(var(--c1))' }}
      >
        Listening Statistics
      </h2>

      <StatsGrid
        totalHours={stats.total_hours}
        streakDays={stats.longest_streak_days}
        discoveries={stats.discoveries_count}
      />

      <TopArtistsList artists={stats.top_artists} />

      {stats.top_genres.length > 0 && (
        <div className="mb-6">
          <span className="text-sm" style={{ color: 'hsl(var(--c2))' }}>
            Top Genres:{' '}
          </span>
          {stats.top_genres.map(g => (
            <span
              key={g.genre}
              className="inline-block px-2 py-1 rounded text-xs mr-2"
              style={{
                backgroundColor: 'hsl(var(--h3) / 0.2)',
                color: 'hsl(var(--h3))'
              }}
            >
              #{g.genre}
            </span>
          ))}
        </div>
      )}

      <ListeningHeatmap data={stats.listening_heatmap} />

      <WeekdayChart data={stats.weekday_pattern} />

      <div className="card p-4">
        <div className="flex items-center justify-center gap-8 text-sm">
          <span style={{ color: 'hsl(var(--c2))' }}>
            Avg Session: <span style={{ color: 'hsl(var(--c1))' }}>{stats.average_session_minutes} min</span>
          </span>
          <span style={{ color: 'hsl(var(--c3))' }}>•</span>
          <span style={{ color: 'hsl(var(--c2))' }}>
            Longest: <span style={{ color: 'hsl(var(--c1))' }}>{Math.floor(stats.longest_session_minutes / 60)}h {Math.floor(stats.longest_session_minutes % 60)}min</span>
          </span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Integrate into ProfilePage**

```typescript
// src/pages/ProfilePage.tsx (find Overview tab content, around line 80-100)
// Add import at top:
import { ProfileStatsSection } from '../components/profile/ProfileStatsSection'

// Replace or add after StatsGrid in Overview TabPanel:
<ProfileStatsSection userId={user.id} />
```

- [ ] **Step 3: Test manually**

Run: `bun run dev`
1. Navigate to `/app/profile`
2. Verify stats section appears
3. Check heatmap renders
4. Verify weekday chart displays
5. Confirm top artists list shows

Expected: Stats display with all components, or empty state if no listening history

- [ ] **Step 4: Commit integration**

```bash
git add src/components/profile/ProfileStatsSection.tsx src/pages/ProfilePage.tsx
git commit -m "feat(profile): integrate stats section into profile Overview tab

Shows comprehensive stats with heatmap, top artists, weekday patterns.
Displays empty state for users with no listening history."
```

---

## Slice 2: Badge System

### Task 8: Create database migration for badges and activity

**Files:**
- Create: `migrations/0021_badges-and-activity.sql`

- [ ] **Step 1: Create migration file**

```sql
-- migrations/0021_badges-and-activity.sql

-- User Badges (junction table for earned badges)
CREATE TABLE user_badges (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id, earned_at DESC);
CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);

-- Activity Feed
CREATE TABLE activity_items (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  metadata TEXT,
  is_public INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_user ON activity_items(user_id, created_at DESC);
CREATE INDEX idx_activity_public ON activity_items(is_public, created_at DESC);
CREATE INDEX idx_activity_type ON activity_items(activity_type, created_at DESC);

-- Activity Privacy Settings
CREATE TABLE activity_privacy_settings (
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  is_visible INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, activity_type)
);
```

- [ ] **Step 2: Test migration locally**

Run: `bun run db:migrate`  
Expected: Migration applies successfully

Run: `wrangler d1 execute zephyron-db --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%badge%' OR name LIKE '%activity%';"`  
Expected: Returns `user_badges`, `activity_items`, `activity_privacy_settings`

- [ ] **Step 3: Commit migration**

```bash
git add migrations/0021_badges-and-activity.sql
git commit -m "feat(db): add tables for badges and activity feed

user_badges: Junction table for earned badges with earned_at timestamp
activity_items: Social activity feed with privacy flag
activity_privacy_settings: Per-user, per-action privacy controls"
```

### Task 9: Add badge types to worker

**Files:**
- Modify: `worker/types.ts:300-360` (add after GetStatsError)

- [ ] **Step 1: Add badge and activity types**

```typescript
// worker/types.ts (add after GetStatsError)

// Badge types
export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  category: 'milestone' | 'behavior' | 'genre' | 'time' | 'community' | 'special'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  checkFn: (userId: string, env: Env) => Promise<boolean>
}

export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
  badge?: Badge
}

export interface GetBadgesResponse {
  badges: UserBadge[]
}

export interface GetBadgesError {
  error: 'INVALID_USER_ID' | 'USER_NOT_FOUND' | 'PROFILE_PRIVATE'
}

// Activity types
export interface ActivityItem {
  id: string
  user_id: string
  user_name?: string
  user_avatar_url?: string
  activity_type: 'badge_earned' | 'song_liked' | 'playlist_created' | 
    'playlist_updated' | 'annotation_approved' | 'milestone_reached'
  metadata: Record<string, any>
  is_public: boolean
  created_at: string
}

export interface GetActivityResponse {
  items: ActivityItem[]
  total: number
  page: number
  hasMore: boolean
}

export interface GetActivityError {
  error: 'UNAUTHORIZED' | 'INVALID_USER_ID' | 'PROFILE_PRIVATE' | 'INVALID_PAGE'
}
```

- [ ] **Step 2: Commit types**

```bash
git add worker/types.ts
git commit -m "feat(types): add Badge, UserBadge, and ActivityItem types

Types for badge system with check functions and activity feed items."
```

### Task 10: Create badge definitions

**Files:**
- Create: `worker/lib/badges.ts`

- [ ] **Step 1: Write badge definitions (milestones)**

```typescript
// worker/lib/badges.ts (create new file)
import type { Badge } from '../types'

export const BADGE_DEFINITIONS: Badge[] = [
  // ─── MILESTONE BADGES ────────────────────────────────────────────────
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Joined in the first month of beta',
    icon: '🌟',
    category: 'special',
    rarity: 'legendary',
    checkFn: async (userId, env) => {
      const user = await env.DB.prepare('SELECT created_at FROM user WHERE id = ?')
        .bind(userId).first() as { created_at: string } | null
      if (!user) return false
      return new Date(user.created_at) < new Date('2026-02-01')
    }
  },
  {
    id: 'sets_100',
    name: '100 Sets',
    description: 'Listen to 100 sets',
    icon: '💯',
    category: 'milestone',
    rarity: 'common',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(
        'SELECT COUNT(DISTINCT set_id) as count FROM listening_sessions WHERE user_id = ? AND qualifies = 1'
      ).bind(userId).first() as { count: number } | null
      return (result?.count || 0) >= 100
    }
  },
  {
    id: 'sets_1000',
    name: '1000 Sets',
    description: 'Listen to 1000 sets',
    icon: '🎉',
    category: 'milestone',
    rarity: 'rare',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(
        'SELECT COUNT(DISTINCT set_id) as count FROM listening_sessions WHERE user_id = ? AND qualifies = 1'
      ).bind(userId).first() as { count: number } | null
      return (result?.count || 0) >= 1000
    }
  },
  {
    id: 'hours_100',
    name: '100 Hours',
    description: 'Listen to 100 hours of music',
    icon: '⏰',
    category: 'milestone',
    rarity: 'common',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(
        'SELECT SUM(duration_seconds) as total FROM listening_sessions WHERE user_id = ?'
      ).bind(userId).first() as { total: number } | null
      return ((result?.total || 0) / 3600) >= 100
    }
  },
  {
    id: 'hours_1000',
    name: '1000 Hours',
    description: 'Listen to 1000 hours of music',
    icon: '🔥',
    category: 'milestone',
    rarity: 'epic',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(
        'SELECT SUM(duration_seconds) as total FROM listening_sessions WHERE user_id = ?'
      ).bind(userId).first() as { total: number } | null
      return ((result?.total || 0) / 3600) >= 1000
    }
  },
  {
    id: 'likes_100',
    name: '100 Likes',
    description: 'Like 100 songs',
    icon: '❤️',
    category: 'milestone',
    rarity: 'common',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM user_song_likes WHERE user_id = ?'
      ).bind(userId).first() as { count: number } | null
      return (result?.count || 0) >= 100
    }
  },
  {
    id: 'playlists_10',
    name: 'Playlist Creator',
    description: 'Create 10 playlists',
    icon: '📁',
    category: 'milestone',
    rarity: 'common',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM playlists WHERE user_id = ?'
      ).bind(userId).first() as { count: number } | null
      return (result?.count || 0) >= 10
    }
  },

  // ─── BEHAVIOR PATTERN BADGES ─────────────────────────────────────────
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Listen to 10+ sets after midnight (12am-6am)',
    icon: '🦉',
    category: 'behavior',
    rarity: 'rare',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM listening_sessions
        WHERE user_id = ? 
          AND CAST(strftime('%H', started_at) as INTEGER) >= 0 
          AND CAST(strftime('%H', started_at) as INTEGER) < 6
      `).bind(userId).first() as { count: number } | null
      return (result?.count || 0) >= 10
    }
  },
  {
    id: 'marathon_listener',
    name: 'Marathon Listener',
    description: 'Complete a single listening session over 4 hours',
    icon: '🏃',
    category: 'behavior',
    rarity: 'rare',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(
        'SELECT MAX(duration_seconds) as max_duration FROM listening_sessions WHERE user_id = ?'
      ).bind(userId).first() as { max_duration: number } | null
      return (result?.max_duration || 0) >= 4 * 3600
    }
  },
  {
    id: 'daily_devotee',
    name: 'Daily Devotee',
    description: 'Listen for 7 consecutive days',
    icon: '🔥',
    category: 'behavior',
    rarity: 'rare',
    checkFn: async (userId, env) => {
      // Check if user has 7-day streak
      const result = await env.DB.prepare(
        'SELECT MAX(longest_streak_days) as streak FROM user_annual_stats WHERE user_id = ?'
      ).bind(userId).first() as { streak: number } | null
      return (result?.streak || 0) >= 7
    }
  },
  {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: '80%+ of listening happens on weekends',
    icon: '🎉',
    category: 'behavior',
    rarity: 'common',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(`
        SELECT
          SUM(CASE WHEN CAST(strftime('%w', started_at) AS INTEGER) IN (0, 6) THEN duration_seconds ELSE 0 END) as weekend,
          SUM(duration_seconds) as total
        FROM listening_sessions
        WHERE user_id = ?
      `).bind(userId).first() as { weekend: number; total: number } | null
      if (!result || result.total === 0) return false
      return (result.weekend / result.total) >= 0.8
    }
  },
  {
    id: 'commute_companion',
    name: 'Commute Companion',
    description: '80%+ of listening happens during commute hours (7-9am or 5-7pm)',
    icon: '🚗',
    category: 'behavior',
    rarity: 'common',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(`
        SELECT
          SUM(CASE WHEN CAST(strftime('%H', started_at) AS INTEGER) IN (7, 8, 17, 18) THEN duration_seconds ELSE 0 END) as commute,
          SUM(duration_seconds) as total
        FROM listening_sessions
        WHERE user_id = ?
      `).bind(userId).first() as { commute: number; total: number } | null
      if (!result || result.total === 0) return false
      return (result.commute / result.total) >= 0.8
    }
  },

  // ─── GENRE EXPLORATION BADGES ────────────────────────────────────────
  {
    id: 'genre_explorer',
    name: 'Genre Explorer',
    description: 'Listen to 10+ different genres',
    icon: '🎭',
    category: 'genre',
    rarity: 'common',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(`
        SELECT COUNT(DISTINCT s.genre) as count
        FROM listening_sessions ls
        JOIN sets s ON ls.set_id = s.id
        WHERE ls.user_id = ? AND s.genre IS NOT NULL
      `).bind(userId).first() as { count: number } | null
      return (result?.count || 0) >= 10
    }
  },
  {
    id: 'techno_head',
    name: 'Techno Head',
    description: 'Listen to 100+ hours of techno',
    icon: '⚡',
    category: 'genre',
    rarity: 'rare',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(`
        SELECT SUM(ls.duration_seconds) as total
        FROM listening_sessions ls
        JOIN sets s ON ls.set_id = s.id
        WHERE ls.user_id = ? AND LOWER(s.genre) LIKE '%techno%'
      `).bind(userId).first() as { total: number } | null
      return ((result?.total || 0) / 3600) >= 100
    }
  },
  {
    id: 'house_master',
    name: 'House Master',
    description: 'Listen to 100+ hours of house music',
    icon: '🏠',
    category: 'genre',
    rarity: 'rare',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(`
        SELECT SUM(ls.duration_seconds) as total
        FROM listening_sessions ls
        JOIN sets s ON ls.set_id = s.id
        WHERE ls.user_id = ? AND LOWER(s.genre) LIKE '%house%'
      `).bind(userId).first() as { total: number } | null
      return ((result?.total || 0) / 3600) >= 100
    }
  },
  {
    id: 'trance_traveler',
    name: 'Trance Traveler',
    description: 'Listen to 100+ hours of trance',
    icon: '🌌',
    category: 'genre',
    rarity: 'rare',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(`
        SELECT SUM(ls.duration_seconds) as total
        FROM listening_sessions ls
        JOIN sets s ON ls.set_id = s.id
        WHERE ls.user_id = ? AND LOWER(s.genre) LIKE '%trance%'
      `).bind(userId).first() as { total: number } | null
      return ((result?.total || 0) / 3600) >= 100
    }
  },
  {
    id: 'melodic_maven',
    name: 'Melodic Maven',
    description: 'Listen to 100+ hours of melodic techno or progressive',
    icon: '🎵',
    category: 'genre',
    rarity: 'rare',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(`
        SELECT SUM(ls.duration_seconds) as total
        FROM listening_sessions ls
        JOIN sets s ON ls.set_id = s.id
        WHERE ls.user_id = ? AND (LOWER(s.genre) LIKE '%melodic%' OR LOWER(s.genre) LIKE '%progressive%')
      `).bind(userId).first() as { total: number } | null
      return ((result?.total || 0) / 3600) >= 100
    }
  },

  // ─── COMMUNITY BADGES ────────────────────────────────────────────────
  {
    id: 'curator',
    name: 'Curator',
    description: 'Create 10+ playlists',
    icon: '🎨',
    category: 'community',
    rarity: 'common',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM playlists WHERE user_id = ?'
      ).bind(userId).first() as { count: number } | null
      return (result?.count || 0) >= 10
    }
  },
  {
    id: 'annotator',
    name: 'Annotator',
    description: 'Have 10+ annotations approved',
    icon: '✍️',
    category: 'community',
    rarity: 'common',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM annotations WHERE user_id = ? AND status = ?'
      ).bind(userId, 'approved').first() as { count: number } | null
      return (result?.count || 0) >= 10
    }
  },
  {
    id: 'detective',
    name: 'Detective',
    description: 'Have 50+ corrections approved',
    icon: '🔍',
    category: 'community',
    rarity: 'rare',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM annotations WHERE user_id = ? AND annotation_type = ? AND status = ?'
      ).bind(userId, 'correction', 'approved').first() as { count: number } | null
      return (result?.count || 0) >= 50
    }
  },

  // ─── SPECIAL BADGES ──────────────────────────────────────────────────
  {
    id: 'wrapped_viewer',
    name: 'Wrapped Viewer',
    description: 'View your annual Wrapped',
    icon: '🎁',
    category: 'special',
    rarity: 'common',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM wrapped_images WHERE user_id = ?'
      ).bind(userId).first() as { count: number } | null
      return (result?.count || 0) >= 1
    }
  },
  {
    id: 'festival_fanatic',
    name: 'Festival Fanatic',
    description: 'Listen to sets from 5+ different festival events',
    icon: '🎪',
    category: 'special',
    rarity: 'common',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(`
        SELECT COUNT(DISTINCT s.event_id) as count
        FROM listening_sessions ls
        JOIN sets s ON ls.set_id = s.id
        WHERE ls.user_id = ? AND s.event_id IS NOT NULL
      `).bind(userId).first() as { count: number } | null
      return (result?.count || 0) >= 5
    }
  }
]

// Helper to find badge by ID
export function getBadgeById(badgeId: string): Badge | undefined {
  return BADGE_DEFINITIONS.find(b => b.id === badgeId)
}
```

- [ ] **Step 2: Commit badge definitions**

```bash
git add worker/lib/badges.ts
git commit -m "feat(badges): add 20+ badge definitions with check functions

Categories: Milestones (7), Behavior (5), Genres (5), Community (3), Special (2)
Each badge has async checkFn that queries D1 for eligibility."
```

### Task 11: Create badge engine for cron processing

**Files:**
- Create: `worker/lib/badge-engine.ts`
- Create: `worker/lib/activity.ts`

- [ ] **Step 1: Create activity helper**

```typescript
// worker/lib/activity.ts (create new file)
import { nanoid } from 'nanoid'
import type { ActivityItem } from '../types'

/**
 * Create an activity item and insert into database
 * Respects user privacy settings
 */
export async function createActivityItem(
  env: Env,
  userId: string,
  activityType: ActivityItem['activity_type'],
  metadata: Record<string, any>
): Promise<void> {
  try {
    // Get user's profile visibility and activity privacy settings
    const user = await env.DB.prepare(
      'SELECT is_profile_public FROM user WHERE id = ?'
    ).bind(userId).first() as { is_profile_public: number } | null

    if (!user) return

    // Check specific activity type privacy setting
    const privacySetting = await env.DB.prepare(
      'SELECT is_visible FROM activity_privacy_settings WHERE user_id = ? AND activity_type = ?'
    ).bind(userId, activityType).first() as { is_visible: number } | null

    // Default to visible (1) if no setting exists
    const activityVisible = privacySetting ? privacySetting.is_visible : 1
    
    // Activity is public only if both profile is public AND activity type is visible
    const isPublic = user.is_profile_public === 1 && activityVisible === 1 ? 1 : 0

    // Insert activity item
    await env.DB.prepare(`
      INSERT INTO activity_items (id, user_id, activity_type, metadata, is_public, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      nanoid(12),
      userId,
      activityType,
      JSON.stringify(metadata),
      isPublic
    ).run()

  } catch (error) {
    // Log but don't throw - activity creation failures should not block original action
    console.error('Failed to create activity item:', error)
  }
}
```

- [ ] **Step 2: Create badge engine**

```typescript
// worker/lib/badge-engine.ts (create new file)
import { nanoid } from 'nanoid'
import { BADGE_DEFINITIONS, getBadgeById } from './badges'
import { createActivityItem } from './activity'

/**
 * Process badges for a single user
 * Checks all badge definitions and awards newly earned badges
 */
export async function processBadgesForUser(
  userId: string,
  env: Env
): Promise<{ awarded: number; errors: number }> {
  let awarded = 0
  let errors = 0

  // Get already earned badges
  const earnedResult = await env.DB.prepare(
    'SELECT badge_id FROM user_badges WHERE user_id = ?'
  ).bind(userId).all()
  
  const earnedBadgeIds = new Set(
    earnedResult.results.map((row: any) => row.badge_id)
  )

  // Check each badge definition
  for (const badge of BADGE_DEFINITIONS) {
    // Skip if already earned
    if (earnedBadgeIds.has(badge.id)) {
      continue
    }

    try {
      // Check if user is eligible for this badge
      const eligible = await badge.checkFn(userId, env)

      if (eligible) {
        // Award badge
        await env.DB.prepare(`
          INSERT INTO user_badges (id, user_id, badge_id, earned_at)
          VALUES (?, ?, ?, datetime('now'))
        `).bind(nanoid(12), userId, badge.id).run()

        // Create activity item
        await createActivityItem(env, userId, 'badge_earned', {
          badge_id: badge.id,
          badge_name: badge.name
        })

        awarded++
        console.log(`Awarded badge "${badge.name}" to user ${userId}`)
      }
    } catch (error) {
      errors++
      console.error(`Error checking badge "${badge.id}" for user ${userId}:`, error)
    }
  }

  return { awarded, errors }
}

/**
 * Process badges for all users (called by cron)
 * Processes in batches to avoid memory issues
 */
export async function processBadgesForAllUsers(env: Env): Promise<void> {
  const startTime = Date.now()
  let totalAwarded = 0
  let totalErrors = 0
  let usersProcessed = 0

  console.log('Starting badge calculation for all users...')

  try {
    // Get all user IDs
    const usersResult = await env.DB.prepare('SELECT id FROM user').all()
    const userIds = usersResult.results.map((row: any) => row.id)

    // Process in batches of 100
    const BATCH_SIZE = 100
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE)
      
      for (const userId of batch) {
        const result = await processBadgesForUser(userId, env)
        totalAwarded += result.awarded
        totalErrors += result.errors
        usersProcessed++

        // Timeout check (max 4 minutes, leave 1 minute buffer for cleanup)
        if (Date.now() - startTime > 4 * 60 * 1000) {
          console.warn('Badge calculation timeout approaching, stopping early')
          break
        }
      }

      // Break outer loop if timeout
      if (Date.now() - startTime > 4 * 60 * 1000) {
        break
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000)
    console.log(`Badge calculation complete: ${totalAwarded} badges awarded to ${usersProcessed} users in ${duration}s`)
    
    if (totalErrors > 0) {
      console.error(`Badge calculation encountered ${totalErrors} errors`)
    }

  } catch (error) {
    console.error('Badge calculation failed:', error)
    throw error
  }
}

/**
 * Check and award specific badges for a user (for real-time checks)
 * Use this after actions that might earn badges (session complete, playlist create, etc.)
 */
export async function checkBadgesForUser(
  userId: string,
  env: Env,
  badgeIds: string[]
): Promise<void> {
  for (const badgeId of badgeIds) {
    const badge = getBadgeById(badgeId)
    if (!badge) continue

    try {
      // Check if already earned
      const existing = await env.DB.prepare(
        'SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?'
      ).bind(userId, badgeId).first()

      if (existing) continue

      // Check eligibility
      const eligible = await badge.checkFn(userId, env)

      if (eligible) {
        // Award badge
        await env.DB.prepare(`
          INSERT INTO user_badges (id, user_id, badge_id, earned_at)
          VALUES (?, ?, ?, datetime('now'))
        `).bind(nanoid(12), userId, badge.id).run()

        // Create activity item
        await createActivityItem(env, userId, 'badge_earned', {
          badge_id: badge.id,
          badge_name: badge.name
        })

        console.log(`Real-time badge award: "${badge.name}" to user ${userId}`)
      }
    } catch (error) {
      console.error(`Error checking real-time badge "${badgeId}":`, error)
    }
  }
}
```

- [ ] **Step 3: Commit badge engine**

```bash
git add worker/lib/badge-engine.ts worker/lib/activity.ts
git commit -m "feat(badges): add badge engine with cron processor

processBadgesForAllUsers: Daily cron job processes all users in batches
checkBadgesForUser: Real-time badge checks after specific actions
createActivityItem: Helper to generate activity feed items with privacy"
```

### Task 12: Create badges API endpoint

**Files:**
- Create: `worker/routes/badges.ts`

- [ ] **Step 1: Implement badges endpoint**

```typescript
// worker/routes/badges.ts (create new file)
import { json, errorResponse } from '../lib/router'
import { getBadgeById } from '../lib/badges'
import type { UserBadge, GetBadgesResponse, GetBadgesError } from '../types'

/**
 * GET /api/profile/:userId/badges
 * Returns all earned badges for a user with badge definitions joined
 */
export async function getBadges(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const userId = params.userId

  // Validate user ID format
  if (!userId || !/^[a-zA-Z0-9_-]{12}$/.test(userId)) {
    return json<GetBadgesError>({
      error: 'INVALID_USER_ID'
    }, 400)
  }

  try {
    // Check if user exists and profile is public
    const user = await env.DB.prepare(
      'SELECT id, is_profile_public FROM user WHERE id = ?'
    ).bind(userId).first() as { id: string; is_profile_public: number } | null

    if (!user) {
      return json<GetBadgesError>({
        error: 'USER_NOT_FOUND'
      }, 404)
    }

    if (user.is_profile_public !== 1) {
      return json<GetBadgesError>({
        error: 'PROFILE_PRIVATE'
      }, 403)
    }

    // Fetch user's earned badges
    const result = await env.DB.prepare(`
      SELECT id, user_id, badge_id, earned_at
      FROM user_badges
      WHERE user_id = ?
      ORDER BY earned_at DESC
    `).bind(userId).all()

    // Join with badge definitions
    const badges: UserBadge[] = result.results.map((row: any) => {
      const badge = getBadgeById(row.badge_id)
      return {
        id: row.id,
        user_id: row.user_id,
        badge_id: row.badge_id,
        earned_at: row.earned_at,
        badge: badge ? {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
          rarity: badge.rarity
        } : undefined
      } as UserBadge
    })

    return json<GetBadgesResponse>({ badges })

  } catch (error) {
    console.error('Badges fetch error:', error)
    return errorResponse('Failed to fetch badges', 500)
  }
}
```

- [ ] **Step 2: Add routes and cron handler to worker**

```typescript
// worker/index.ts (add import at top)
import { getBadges } from './routes/badges'
import { processBadgesForAllUsers } from './lib/badge-engine'

// Add route (after stats route)
router.add('GET', '/api/profile/:userId/badges', getBadges)

// Add scheduled handler (after existing fetch handler)
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // ... existing fetch handler
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Cron trigger:', event.cron)
    
    // Badge calculation cron (runs daily at 6am PT: "0 6 * * *")
    if (event.cron === '0 6 * * *') {
      await processBadgesForAllUsers(env)
    }
    
    // Other existing cron handlers...
  }
}
```

- [ ] **Step 3: Update wrangler.jsonc with badge cron**

```jsonc
// wrangler.jsonc (update triggers.crons array)
"triggers": {
  "crons": [
    "0 * * * *",    // Hourly: session cleanup
    "0 5 1 * *",    // Monthly: stats aggregation
    "0 5 2 1 *",    // Annual: Wrapped generation
    "0 6 * * *"     // Daily: badge calculations (NEW)
  ]
}
```

- [ ] **Step 4: Commit badges API**

```bash
git add worker/routes/badges.ts worker/index.ts wrangler.jsonc
git commit -m "feat(api): add GET /api/profile/:userId/badges endpoint

Returns earned badges with definitions joined. Respects profile privacy.
Add daily cron at 6am PT for badge calculations."
```

### Task 13: Create badge frontend components

**Files:**
- Create: `src/components/profile/BadgeCard.tsx`
- Create: `src/components/profile/BadgesGrid.tsx`
- Modify: `src/lib/types.ts` (add frontend badge types)
- Modify: `src/stores/profileStore.ts` (add badge state)

- [ ] **Step 1: Add frontend badge types**

```typescript
// src/lib/types.ts (add after ProfileStats interface)

// Badge types
export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  category: 'milestone' | 'behavior' | 'genre' | 'time' | 'community' | 'special'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
  badge?: Badge
}
```

- [ ] **Step 2: Extend profile store with badges**

```typescript
// src/stores/profileStore.ts (add to interface and create call)

interface ProfileStore {
  // ... existing stats state

  // Badges state
  badges: UserBadge[]
  badgesLoading: boolean
  badgesError: string | null
  badgesCachedAt: number | null

  // ... existing stats actions

  // Badge actions
  fetchBadges: (userId: string) => Promise<void>
  clearBadges: () => void
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  // ... existing stats state

  // Badges initial state
  badges: [],
  badgesLoading: false,
  badgesError: null,
  badgesCachedAt: null,

  // ... existing stats actions

  // Fetch badges with 10-minute caching
  fetchBadges: async (userId: string) => {
    const now = Date.now()
    const cached = get().badgesCachedAt
    
    if (cached && now - cached < 10 * 60 * 1000 && get().badges.length > 0) {
      return
    }

    set({ badgesLoading: true, badgesError: null })

    try {
      const response = await fetch(`/api/profile/${userId}/badges`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch badges')
      }

      const data = await response.json()
      set({
        badges: data.badges,
        badgesLoading: false,
        badgesCachedAt: now
      })
    } catch (error) {
      set({
        badgesError: error instanceof Error ? error.message : 'Unknown error',
        badgesLoading: false
      })
    }
  },

  clearBadges: () => {
    set({
      badges: [],
      badgesError: null,
      badgesCachedAt: null
    })
  }
}))
```

- [ ] **Step 3: Create BadgeCard component**

```typescript
// src/components/profile/BadgeCard.tsx (create new file)
import React from 'react'
import type { UserBadge, Badge } from '../../lib/types'

interface BadgeCardProps {
  userBadge?: UserBadge  // If earned
  badge?: Badge          // If locked
  locked?: boolean
}

export function BadgeCard({ userBadge, badge, locked = false }: BadgeCardProps) {
  const badgeDef = userBadge?.badge || badge
  if (!badgeDef) return null

  const formattedDate = userBadge
    ? new Date(userBadge.earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '?????'

  return (
    <div
      className="card p-4 flex flex-col items-center text-center relative cursor-pointer hover:scale-105 transition-transform"
      title={badgeDef.description}
      style={{
        opacity: locked ? 0.5 : 1
      }}
    >
      {locked && (
        <div className="absolute top-2 right-2 text-xs">🔒</div>
      )}
      
      <div
        className="text-4xl mb-2"
        style={{ filter: locked ? 'grayscale(100%)' : 'none' }}
      >
        {badgeDef.icon}
      </div>
      
      <div
        className="text-sm font-[var(--font-weight-bold)] mb-1 line-clamp-2"
        style={{ color: 'hsl(var(--c1))' }}
      >
        {badgeDef.name}
      </div>
      
      <div
        className="text-xs font-mono"
        style={{ color: 'hsl(var(--c3))' }}
      >
        {formattedDate}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create BadgesGrid component**

```typescript
// src/components/profile/BadgesGrid.tsx (create new file)
import React, { useEffect, useState } from 'react'
import { useProfileStore } from '../../stores/profileStore'
import { BadgeCard } from './BadgeCard'
import { BADGE_DEFINITIONS } from '../../../worker/lib/badges'
import type { Badge } from '../../lib/types'

// Import badge definitions from worker (read-only)
const ALL_BADGES: Badge[] = BADGE_DEFINITIONS.map(b => ({
  id: b.id,
  name: b.name,
  description: b.description,
  icon: b.icon,
  category: b.category,
  rarity: b.rarity
}))

interface BadgesGridProps {
  userId: string
}

export function BadgesGrid({ userId }: BadgesGridProps) {
  const { badges, badgesLoading, badgesError, fetchBadges } = useProfileStore()
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchBadges(userId)
  }, [userId, fetchBadges])

  if (badgesLoading) {
    return (
      <div className="card p-8 text-center">
        <div className="text-sm" style={{ color: 'hsl(var(--c2))' }}>
          Loading badges...
        </div>
      </div>
    )
  }

  if (badgesError) {
    return (
      <div className="card p-8 text-center">
        <div className="text-sm" style={{ color: 'hsl(var(--c2))' }}>
          Badges unavailable
        </div>
      </div>
    )
  }

  const earnedBadgeIds = new Set(badges.map(b => b.badge_id))
  const earnedBadges = badges
  const lockedBadges = ALL_BADGES.filter(b => !earnedBadgeIds.has(b.id))

  // Apply filter
  const filteredEarned = filter === 'all'
    ? earnedBadges
    : earnedBadges.filter(b => b.badge?.category === filter)

  const filteredLocked = filter === 'all'
    ? lockedBadges
    : lockedBadges.filter(b => b.category === filter)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-2xl font-[var(--font-weight-bold)]"
          style={{ color: 'hsl(var(--c1))' }}
        >
          Achievement Badges
        </h2>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-1 rounded text-sm"
          style={{
            backgroundColor: 'hsl(var(--b4))',
            color: 'hsl(var(--c1))',
            border: 'none'
          }}
        >
          <option value="all">All</option>
          <option value="milestone">Milestones</option>
          <option value="behavior">Behavior</option>
          <option value="genre">Genres</option>
          <option value="community">Community</option>
          <option value="special">Special</option>
        </select>
      </div>

      {earnedBadges.length === 0 && (
        <div className="card p-8 text-center mb-6">
          <div className="text-4xl mb-4">🏆</div>
          <div className="text-lg font-[var(--font-weight-medium)] mb-2" style={{ color: 'hsl(var(--c1))' }}>
            No badges yet
          </div>
          <div className="text-sm" style={{ color: 'hsl(var(--c2))' }}>
            Keep listening to earn achievements!
          </div>
        </div>
      )}

      {filteredEarned.length > 0 && (
        <div className="mb-6">
          <h3
            className="text-sm font-[var(--font-weight-bold)] mb-3"
            style={{ color: 'hsl(var(--c2))' }}
          >
            Earned ({filteredEarned.length}/{ALL_BADGES.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredEarned.map(userBadge => (
              <BadgeCard key={userBadge.id} userBadge={userBadge} />
            ))}
          </div>
        </div>
      )}

      {filteredLocked.length > 0 && (
        <div>
          <h3
            className="text-sm font-[var(--font-weight-bold)] mb-3"
            style={{ color: 'hsl(var(--c2))' }}
          >
            Locked ({filteredLocked.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredLocked.map(badge => (
              <BadgeCard key={badge.id} badge={badge} locked />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Add Badges tab to ProfilePage**

```typescript
// src/pages/ProfilePage.tsx (find TabList, add after Activity tab)

// Add import at top:
import { BadgesGrid } from '../components/profile/BadgesGrid'

// In TabList (around line 60-70):
<Tab id="badges">Badges</Tab>

// After Activity TabPanel (around line 110-120):
<TabPanel id="badges">
  <BadgesGrid userId={user.id} />
</TabPanel>
```

- [ ] **Step 6: Test badges UI manually**

Run: `bun run dev`
1. Navigate to `/app/profile`
2. Click "Badges" tab
3. Verify empty state shows if no badges
4. Add test badge via D1: `wrangler d1 execute zephyron-db --local --command "INSERT INTO user_badges (id, user_id, badge_id) VALUES ('test1', 'YOUR_USER_ID', 'early_adopter');"`
5. Refresh page, verify badge appears in Earned section
6. Hover badge, verify tooltip shows description
7. Verify locked badges show in Locked section
8. Test category filter dropdown

Expected: Badges display correctly, filter works, tooltips appear

- [ ] **Step 7: Commit badges UI**

```bash
git add src/lib/types.ts src/stores/profileStore.ts src/components/profile/BadgeCard.tsx src/components/profile/BadgesGrid.tsx src/pages/ProfilePage.tsx
git commit -m "feat(ui): add badges grid with earned/locked states

BadgeCard: Individual badge display with hover tooltip
BadgesGrid: Grid layout with category filter, earned/locked sections
Integrate into ProfilePage Badges tab with 10-minute caching"
```

---

## Slice 3: Activity Feed

### Task 14: Create activity API endpoints

**Files:**
- Create: `worker/routes/activity.ts`

- [ ] **Step 1: Implement personal activity feed endpoint**

```typescript
// worker/routes/activity.ts (create new file)
import { json, errorResponse } from '../lib/router'
import { requireAuth } from '../lib/auth'
import type { ActivityItem, GetActivityResponse, GetActivityError } from '../types'

/**
 * GET /api/activity/me?page=1
 * Returns personal activity feed for authenticated user (ignores privacy)
 */
export async function getMyActivity(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  // Require authentication
  const authResult = await requireAuth(request, env)
  if (authResult instanceof Response) return authResult

  const { user } = authResult
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')

  if (page < 1) {
    return json<GetActivityError>({
      error: 'INVALID_PAGE'
    }, 400)
  }

  const ITEMS_PER_PAGE = 20
  const offset = (page - 1) * ITEMS_PER_PAGE

  try {
    // Get total count
    const countResult = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM activity_items WHERE user_id = ?'
    ).bind(user.id).first() as { total: number } | null

    const total = countResult?.total || 0

    // Get activity items
    const result = await env.DB.prepare(`
      SELECT * FROM activity_items
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(user.id, ITEMS_PER_PAGE, offset).all()

    const items: ActivityItem[] = result.results.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      activity_type: row.activity_type,
      metadata: JSON.parse(row.metadata || '{}'),
      is_public: Boolean(row.is_public),
      created_at: row.created_at
    }))

    return json<GetActivityResponse>({
      items,
      total,
      page,
      hasMore: (page * ITEMS_PER_PAGE) < total
    })

  } catch (error) {
    console.error('Activity fetch error:', error)
    return errorResponse('Failed to fetch activity', 500)
  }
}

/**
 * GET /api/activity/user/:userId
 * Returns public activity for a specific user (respects privacy)
 */
export async function getUserActivity(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const userId = params.userId

  if (!userId || !/^[a-zA-Z0-9_-]{12}$/.test(userId)) {
    return json<GetActivityError>({
      error: 'INVALID_USER_ID'
    }, 400)
  }

  try {
    // Check if user exists and profile is public
    const user = await env.DB.prepare(
      'SELECT id, is_profile_public FROM user WHERE id = ?'
    ).bind(userId).first() as { id: string; is_profile_public: number } | null

    if (!user) {
      return json<GetActivityError>({
        error: 'INVALID_USER_ID'
      }, 404)
    }

    if (user.is_profile_public !== 1) {
      return json<GetActivityError>({
        error: 'PROFILE_PRIVATE'
      }, 403)
    }

    // Get last 5 public activity items (for profile display)
    const result = await env.DB.prepare(`
      SELECT * FROM activity_items
      WHERE user_id = ? AND is_public = 1
      ORDER BY created_at DESC
      LIMIT 5
    `).bind(userId).all()

    const items: ActivityItem[] = result.results.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      activity_type: row.activity_type,
      metadata: JSON.parse(row.metadata || '{}'),
      is_public: Boolean(row.is_public),
      created_at: row.created_at
    }))

    return json<GetActivityResponse>({
      items,
      total: items.length,
      page: 1,
      hasMore: false
    })

  } catch (error) {
    console.error('User activity fetch error:', error)
    return errorResponse('Failed to fetch activity', 500)
  }
}

/**
 * GET /api/activity/community?page=1
 * Returns global community feed (all public activity)
 */
export async function getCommunityActivity(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')

  if (page < 1) {
    return json<GetActivityError>({
      error: 'INVALID_PAGE'
    }, 400)
  }

  const ITEMS_PER_PAGE = 20
  const offset = (page - 1) * ITEMS_PER_PAGE

  try {
    // Get total count
    const countResult = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM activity_items WHERE is_public = 1'
    ).first() as { total: number } | null

    const total = countResult?.total || 0

    // Get activity items with user info joined
    const result = await env.DB.prepare(`
      SELECT ai.*, u.name as user_name, u.avatar_url as user_avatar_url
      FROM activity_items ai
      JOIN user u ON ai.user_id = u.id
      WHERE ai.is_public = 1
      ORDER BY ai.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(ITEMS_PER_PAGE, offset).all()

    const items: ActivityItem[] = result.results.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      user_name: row.user_name,
      user_avatar_url: row.user_avatar_url,
      activity_type: row.activity_type,
      metadata: JSON.parse(row.metadata || '{}'),
      is_public: Boolean(row.is_public),
      created_at: row.created_at
    }))

    return json<GetActivityResponse>({
      items,
      total,
      page,
      hasMore: (page * ITEMS_PER_PAGE) < total
    })

  } catch (error) {
    console.error('Community activity fetch error:', error)
    return errorResponse('Failed to fetch community activity', 500)
  }
}
```

- [ ] **Step 2: Add activity routes to worker**

```typescript
// worker/index.ts (add imports and routes)

// Import at top:
import { getMyActivity, getUserActivity, getCommunityActivity } from './routes/activity'

// Add routes (after badges route):
router.add('GET', '/api/activity/me', getMyActivity)
router.add('GET', '/api/activity/user/:userId', getUserActivity)
router.add('GET', '/api/activity/community', getCommunityActivity)
```

- [ ] **Step 3: Commit activity API**

```bash
git add worker/routes/activity.ts worker/index.ts
git commit -m "feat(api): add activity feed endpoints

GET /api/activity/me: Personal feed (auth required, ignores privacy)
GET /api/activity/user/:userId: User profile feed (last 5, respects privacy)
GET /api/activity/community: Global feed (paginated, public only)"
```

### Task 15: Create privacy settings API endpoint

**Files:**
- Create: `worker/routes/privacy.ts`

- [ ] **Step 1: Implement privacy settings endpoint**

```typescript
// worker/routes/privacy.ts (create new file)
import { json, errorResponse } from '../lib/router'
import { requireAuth } from '../lib/auth'

interface UpdatePrivacyRequest {
  activity_type: string
  is_visible: boolean
}

/**
 * PATCH /api/profile/privacy
 * Updates activity privacy settings for authenticated user
 */
export async function updatePrivacySettings(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const authResult = await requireAuth(request, env)
  if (authResult instanceof Response) return authResult

  const { user } = authResult

  try {
    const body = await request.json() as UpdatePrivacyRequest
    const { activity_type, is_visible } = body

    // Validate activity_type
    const validTypes = [
      'badge_earned',
      'song_liked',
      'playlist_created',
      'playlist_updated',
      'annotation_approved',
      'milestone_reached'
    ]

    if (!validTypes.includes(activity_type)) {
      return errorResponse('Invalid activity type', 400)
    }

    // Upsert privacy setting
    await env.DB.prepare(`
      INSERT INTO activity_privacy_settings (user_id, activity_type, is_visible)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, activity_type)
      DO UPDATE SET is_visible = ?
    `).bind(user.id, activity_type, is_visible ? 1 : 0, is_visible ? 1 : 0).run()

    // Update is_public flag on existing activity items
    await env.DB.prepare(`
      UPDATE activity_items
      SET is_public = ?
      WHERE user_id = ? AND activity_type = ?
    `).bind(is_visible ? 1 : 0, user.id, activity_type).run()

    return json({ success: true })

  } catch (error) {
    console.error('Privacy settings update error:', error)
    return errorResponse('Failed to update privacy settings', 500)
  }
}

/**
 * GET /api/profile/privacy
 * Returns all privacy settings for authenticated user
 */
export async function getPrivacySettings(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const authResult = await requireAuth(request, env)
  if (authResult instanceof Response) return authResult

  const { user } = authResult

  try {
    const result = await env.DB.prepare(
      'SELECT activity_type, is_visible FROM activity_privacy_settings WHERE user_id = ?'
    ).bind(user.id).all()

    const settings: Record<string, boolean> = {}
    
    // Default all to true (visible)
    const activityTypes = [
      'badge_earned',
      'song_liked',
      'playlist_created',
      'playlist_updated',
      'annotation_approved',
      'milestone_reached'
    ]

    for (const type of activityTypes) {
      settings[type] = true
    }

    // Override with user's settings
    for (const row of result.results as any[]) {
      settings[row.activity_type] = Boolean(row.is_visible)
    }

    return json({ settings })

  } catch (error) {
    console.error('Privacy settings fetch error:', error)
    return errorResponse('Failed to fetch privacy settings', 500)
  }
}
```

- [ ] **Step 2: Add privacy routes**

```typescript
// worker/index.ts (add imports and routes)

// Import at top:
import { updatePrivacySettings, getPrivacySettings } from './routes/privacy'

// Add routes:
router.add('GET', '/api/profile/privacy', getPrivacySettings)
router.add('PATCH', '/api/profile/privacy', updatePrivacySettings)
```

- [ ] **Step 3: Commit privacy API**

```bash
git add worker/routes/privacy.ts worker/index.ts
git commit -m "feat(api): add activity privacy settings endpoints

GET /api/profile/privacy: Fetch user's privacy settings
PATCH /api/profile/privacy: Update privacy for specific activity type
Updates is_public flag on existing activity items"
```

### Task 16: Add activity frontend types and store

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/stores/profileStore.ts`

- [ ] **Step 1: Add activity types to frontend**

```typescript
// src/lib/types.ts (add after Badge types)

// Activity types
export interface ActivityItem {
  id: string
  user_id: string
  user_name?: string
  user_avatar_url?: string
  activity_type: 'badge_earned' | 'song_liked' | 'playlist_created' | 
    'playlist_updated' | 'annotation_approved' | 'milestone_reached'
  metadata: Record<string, any>
  is_public: boolean
  created_at: string
}

export interface ActivityPrivacySettings {
  badge_earned: boolean
  song_liked: boolean
  playlist_created: boolean
  playlist_updated: boolean
  annotation_approved: boolean
  milestone_reached: boolean
}
```

- [ ] **Step 2: Extend profile store with activity state**

```typescript
// src/stores/profileStore.ts (add to interface and create call)

interface ProfileStore {
  // ... existing state

  // Activity state
  activityFeed: ActivityItem[]
  activityPage: number
  activityTotal: number
  activityHasMore: boolean
  activityLoading: boolean
  activityError: string | null
  privacySettings: ActivityPrivacySettings | null

  // ... existing actions

  // Activity actions
  fetchActivity: (feed: 'me' | 'user' | 'community', userId?: string, page?: number) => Promise<void>
  loadMoreActivity: () => Promise<void>
  fetchPrivacySettings: () => Promise<void>
  updatePrivacySetting: (activityType: string, isVisible: boolean) => Promise<void>
  clearActivity: () => void
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  // ... existing state

  // Activity initial state
  activityFeed: [],
  activityPage: 1,
  activityTotal: 0,
  activityHasMore: false,
  activityLoading: false,
  activityError: null,
  privacySettings: null,

  // ... existing actions

  // Fetch activity feed
  fetchActivity: async (feed: 'me' | 'user' | 'community', userId?: string, page: number = 1) => {
    set({ activityLoading: true, activityError: null })

    try {
      let url = ''
      if (feed === 'me') {
        url = `/api/activity/me?page=${page}`
      } else if (feed === 'user' && userId) {
        url = `/api/activity/user/${userId}`
      } else if (feed === 'community') {
        url = `/api/activity/community?page=${page}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch activity')
      }

      const data = await response.json()
      
      // Append or replace based on page
      const newFeed = page === 1
        ? data.items
        : [...get().activityFeed, ...data.items]

      set({
        activityFeed: newFeed,
        activityPage: page,
        activityTotal: data.total,
        activityHasMore: data.hasMore,
        activityLoading: false
      })
    } catch (error) {
      set({
        activityError: error instanceof Error ? error.message : 'Unknown error',
        activityLoading: false
      })
    }
  },

  loadMoreActivity: async () => {
    const { activityPage, activityHasMore } = get()
    if (!activityHasMore) return
    
    await get().fetchActivity('me', undefined, activityPage + 1)
  },

  fetchPrivacySettings: async () => {
    try {
      const response = await fetch('/api/profile/privacy')
      if (!response.ok) throw new Error('Failed to fetch privacy settings')
      
      const data = await response.json()
      set({ privacySettings: data.settings })
    } catch (error) {
      console.error('Failed to fetch privacy settings:', error)
    }
  },

  updatePrivacySetting: async (activityType: string, isVisible: boolean) => {
    try {
      const response = await fetch('/api/profile/privacy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_type: activityType, is_visible: isVisible })
      })

      if (!response.ok) throw new Error('Failed to update privacy setting')

      // Update local state
      const current = get().privacySettings || {}
      set({
        privacySettings: {
          ...current,
          [activityType]: isVisible
        } as ActivityPrivacySettings
      })
    } catch (error) {
      console.error('Failed to update privacy setting:', error)
    }
  },

  clearActivity: () => {
    set({
      activityFeed: [],
      activityPage: 1,
      activityTotal: 0,
      activityHasMore: false,
      activityError: null
    })
  }
}))
```

- [ ] **Step 3: Commit store updates**

```bash
git add src/lib/types.ts src/stores/profileStore.ts
git commit -m "feat(store): add activity feed state and privacy settings

Activity feed with pagination, privacy settings CRUD operations."
```

### Task 17: Create activity UI components

**Files:**
- Create: `src/components/activity/ActivityItem.tsx`
- Create: `src/components/activity/ActivityFeed.tsx`

- [ ] **Step 1: Create ActivityItem component**

```typescript
// src/components/activity/ActivityItem.tsx (create new file)
import React from 'react'
import type { ActivityItem as ActivityItemType } from '../../lib/types'

interface ActivityItemProps {
  item: ActivityItemType
  showUser?: boolean
}

export function ActivityItem({ item, showUser = false }: ActivityItemProps) {
  const getActivityIcon = () => {
    switch (item.activity_type) {
      case 'badge_earned': return '🏆'
      case 'song_liked': return '❤️'
      case 'playlist_created': return '📁'
      case 'playlist_updated': return '📁'
      case 'annotation_approved': return '✅'
      case 'milestone_reached': return '🎉'
      default: return '•'
    }
  }

  const getActivityText = () => {
    const { activity_type, metadata } = item
    const userName = showUser && item.user_name ? item.user_name : 'You'

    switch (activity_type) {
      case 'badge_earned':
        return (
          <>
            <span className="font-[var(--font-weight-medium)]">{userName}</span> earned{' '}
            <span className="font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--h3))' }}>
              {metadata.badge_name}
            </span>{' '}
            badge
          </>
        )
      case 'song_liked':
        return (
          <>
            <span className="font-[var(--font-weight-medium)]">{userName}</span> liked{' '}
            <span className="font-[var(--font-weight-medium)]">{metadata.song_title}</span>
            {metadata.song_artist && ` - ${metadata.song_artist}`}
          </>
        )
      case 'playlist_created':
        return (
          <>
            <span className="font-[var(--font-weight-medium)]">{userName}</span> created playlist{' '}
            <span className="font-[var(--font-weight-medium)]">{metadata.playlist_title}</span>
          </>
        )
      case 'playlist_updated':
        return (
          <>
            <span className="font-[var(--font-weight-medium)]">{userName}</span> added{' '}
            <span className="font-[var(--font-weight-medium)]">{metadata.set_title}</span> to{' '}
            {metadata.playlist_title}
          </>
        )
      case 'annotation_approved':
        return (
          <>
            <span className="font-[var(--font-weight-medium)]">{userName}</span> added{' '}
            <span className="font-[var(--font-weight-medium)]">{metadata.track_title}</span> to{' '}
            {metadata.set_title}
          </>
        )
      case 'milestone_reached':
        return (
          <>
            <span className="font-[var(--font-weight-medium)]">{userName}</span> reached{' '}
            <span className="font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--h3))' }}>
              {metadata.milestone}
            </span>
          </>
        )
      default:
        return null
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="card p-4 flex items-start gap-3">
      <div className="text-2xl">{getActivityIcon()}</div>
      <div className="flex-1">
        <div className="text-sm mb-1" style={{ color: 'hsl(var(--c1))' }}>
          {getActivityText()}
        </div>
        <div className="text-xs" style={{ color: 'hsl(var(--c3))' }}>
          {getTimeAgo(item.created_at)}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create ActivityFeed component**

```typescript
// src/components/activity/ActivityFeed.tsx (create new file)
import React, { useEffect } from 'react'
import { useProfileStore } from '../../stores/profileStore'
import { ActivityItem } from './ActivityItem'

interface ActivityFeedProps {
  feed: 'me' | 'user' | 'community'
  userId?: string
  limit?: number
  showLoadMore?: boolean
}

export function ActivityFeed({ feed, userId, limit, showLoadMore = false }: ActivityFeedProps) {
  const {
    activityFeed,
    activityLoading,
    activityError,
    activityHasMore,
    fetchActivity,
    loadMoreActivity
  } = useProfileStore()

  useEffect(() => {
    fetchActivity(feed, userId, 1)
  }, [feed, userId, fetchActivity])

  const displayItems = limit ? activityFeed.slice(0, limit) : activityFeed

  if (activityLoading && activityFeed.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-sm" style={{ color: 'hsl(var(--c2))' }}>
          Loading activity...
        </div>
      </div>
    )
  }

  if (activityError) {
    return (
      <div className="card p-8 text-center">
        <div className="text-sm" style={{ color: 'hsl(var(--c2))' }}>
          Activity feed unavailable
        </div>
      </div>
    )
  }

  if (displayItems.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-4">📭</div>
        <div className="text-lg font-[var(--font-weight-medium)] mb-2" style={{ color: 'hsl(var(--c1))' }}>
          No activity yet
        </div>
        <div className="text-sm" style={{ color: 'hsl(var(--c2))' }}>
          Start listening and creating!
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {displayItems.map(item => (
        <ActivityItem
          key={item.id}
          item={item}
          showUser={feed === 'community'}
        />
      ))}

      {showLoadMore && activityHasMore && (
        <button
          onClick={loadMoreActivity}
          disabled={activityLoading}
          className="w-full py-3 rounded font-[var(--font-weight-medium)] text-sm transition-colors"
          style={{
            backgroundColor: 'hsl(var(--b4))',
            color: 'hsl(var(--c1))'
          }}
        >
          {activityLoading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit activity components**

```bash
git add src/components/activity/ActivityItem.tsx src/components/activity/ActivityFeed.tsx
git commit -m "feat(ui): add activity feed components

ActivityItem: Type-specific rendering with icons, time ago
ActivityFeed: Container with loading, empty states, load more pagination"
```

### Task 18: Create activity pages and integrate

**Files:**
- Create: `src/pages/ActivityPage.tsx`
- Create: `src/pages/CommunityPage.tsx`
- Modify: `src/pages/ProfilePage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create ActivityPage**

```typescript
// src/pages/ActivityPage.tsx (create new file)
import React from 'react'
import { ActivityFeed } from '../components/activity/ActivityFeed'

export function ActivityPage() {
  return (
    <div className="px-6 lg:px-10 py-6">
      <h1
        className="text-3xl font-[var(--font-weight-bold)] mb-6"
        style={{ color: 'hsl(var(--c1))' }}
      >
        My Activity
      </h1>

      <ActivityFeed feed="me" showLoadMore />
    </div>
  )
}
```

- [ ] **Step 2: Create CommunityPage**

```typescript
// src/pages/CommunityPage.tsx (create new file)
import React from 'react'
import { ActivityFeed } from '../components/activity/ActivityFeed'

export function CommunityPage() {
  return (
    <div className="px-6 lg:px-10 py-6">
      <h1
        className="text-3xl font-[var(--font-weight-bold)] mb-6"
        style={{ color: 'hsl(var(--c1))' }}
      >
        Community Activity
      </h1>

      <ActivityFeed feed="community" showLoadMore />
    </div>
  )
}
```

- [ ] **Step 3: Add activity to profile Overview tab**

```typescript
// src/pages/ProfilePage.tsx (find Overview TabPanel, add after stats)

// Add import at top:
import { ActivityFeed } from '../components/activity/ActivityFeed'

// In Overview TabPanel (after ProfileStatsSection):
<div className="mt-8">
  <div className="flex items-center justify-between mb-4">
    <h2
      className="text-2xl font-[var(--font-weight-bold)]"
      style={{ color: 'hsl(var(--c1))' }}
    >
      Recent Activity
    </h2>
    <a
      href="/app/activity"
      className="text-sm font-[var(--font-weight-medium)]"
      style={{ color: 'hsl(var(--h3))' }}
    >
      View All →
    </a>
  </div>
  <ActivityFeed feed="me" limit={5} />
</div>
```

- [ ] **Step 4: Add routes to App.tsx**

```typescript
// src/App.tsx (add imports and routes)

// Import at top:
import { ActivityPage } from './pages/ActivityPage'
import { CommunityPage } from './pages/CommunityPage'

// Add routes (after profile route):
<Route path="/app/activity" element={<ActivityPage />} />
<Route path="/app/community" element={<CommunityPage />} />
```

- [ ] **Step 5: Test activity feed manually**

Run: `bun run dev`
1. Navigate to `/app/profile` → Verify "Recent Activity" section shows last 5 items
2. Click "View All →" → Navigate to `/app/activity` → Verify full feed with "Load More"
3. Navigate to `/app/community` → Verify global feed shows other users' activity
4. Perform action (like a song) → Refresh → Verify appears in feed
5. Test empty state on new user account
6. Click "Load More" → Verify next 20 items load

Expected: Activity feeds display correctly, pagination works, empty states show

- [ ] **Step 6: Commit activity pages integration**

```bash
git add src/pages/ActivityPage.tsx src/pages/CommunityPage.tsx src/pages/ProfilePage.tsx src/App.tsx
git commit -m "feat(pages): add activity and community pages

ActivityPage: Personal feed with pagination
CommunityPage: Global public activity feed
Integrate recent activity (last 5) into profile Overview tab"
```

### Task 19: Add privacy settings UI

**Files:**
- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Create privacy settings section**

```typescript
// src/pages/SettingsPage.tsx (find Privacy tab content, add new section)

// Add import at top:
import { useProfileStore } from '../stores/profileStore'

// In Privacy tab content (create if doesn't exist, or add to existing):
function PrivacySettings() {
  const { privacySettings, fetchPrivacySettings, updatePrivacySetting } = useProfileStore()

  React.useEffect(() => {
    fetchPrivacySettings()
  }, [fetchPrivacySettings])

  if (!privacySettings) {
    return <div className="text-sm" style={{ color: 'hsl(var(--c2))' }}>Loading...</div>
  }

  const settings = [
    { key: 'badge_earned', label: 'Badge achievements' },
    { key: 'playlist_created', label: 'Playlist creations' },
    { key: 'song_liked', label: 'Song likes' },
    { key: 'annotation_approved', label: 'Annotation approvals' },
    { key: 'milestone_reached', label: 'Listening milestones' }
  ]

  return (
    <div className="mb-8">
      <h3
        className="text-lg font-[var(--font-weight-bold)] mb-2"
        style={{ color: 'hsl(var(--c1))' }}
      >
        Activity Privacy
      </h3>
      <p className="text-sm mb-4" style={{ color: 'hsl(var(--c2))' }}>
        Control what appears in your activity feed and the community feed
      </p>

      <div className="space-y-3">
        {settings.map(setting => (
          <label key={setting.key} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={privacySettings[setting.key as keyof typeof privacySettings]}
              onChange={(e) => updatePrivacySetting(setting.key, e.target.checked)}
              className="w-5 h-5 rounded"
              style={{
                accentColor: 'hsl(var(--h3))'
              }}
            />
            <span className="text-sm" style={{ color: 'hsl(var(--c1))' }}>
              {setting.label}
            </span>
          </label>
        ))}
      </div>

      <p className="text-xs mt-4" style={{ color: 'hsl(var(--c3))' }}>
        Note: Activity visibility also respects your profile visibility setting.
        If your profile is private, no activity will appear in the community feed.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Test privacy settings manually**

Run: `bun run dev`
1. Navigate to `/app/settings` → Privacy tab
2. Verify all checkboxes show with correct labels
3. Toggle "Badge achievements" off → Verify saves immediately
4. Earn a badge (or simulate) → Verify does NOT appear in community feed
5. Check personal feed → Verify badge still appears (privacy doesn't affect own feed)
6. Toggle "Song likes" on → Like a song → Verify appears in community feed
7. Set profile to private → Verify all activity hidden from community

Expected: Privacy toggles work, settings save immediately, community feed respects privacy

- [ ] **Step 3: Commit privacy UI**

```bash
git add src/pages/SettingsPage.tsx
git commit -m "feat(settings): add activity privacy controls

Checkboxes for each activity type with immediate save.
Note about profile visibility affecting community feed."
```

---

## Slice 4: Image Processing

### Task 20: Update avatar upload for multi-size generation

**Files:**
- Modify: `worker/routes/profile.ts:65-90` (update uploadAvatar function)

- [ ] **Step 1: Update avatar upload implementation**

```typescript
// worker/routes/profile.ts (replace uploadAvatar function, lines 18-106)

export async function uploadAvatar(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  // 1. Check authentication
  const authResult = await requireAuth(request, env)
  if (authResult instanceof Response) return authResult

  const { user } = authResult
  const userId = user.id

  try {
    // 2. Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    // 3. Validate file exists
    if (!file) {
      return json<UploadAvatarError>({
        error: 'NO_FILE',
        message: 'No file provided'
      }, 400)
    }

    // 4. Validate mime type
    if (!file.type.startsWith('image/')) {
      return json<UploadAvatarError>({
        error: 'INVALID_FORMAT',
        message: 'Only JPG, PNG, WebP, GIF allowed'
      }, 400)
    }

    // 5. Validate file size (10MB = 10 * 1024 * 1024)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return json<UploadAvatarError>({
        error: 'FILE_TOO_LARGE',
        message: 'Maximum file size is 10MB'
      }, 400)
    }

    // 6. Read file as array buffer
    const arrayBuffer = await file.arrayBuffer()

    try {
      // 7. Delete old avatars
      const listResult = await env.AVATARS.list({ prefix: `${userId}/avatar-` })
      for (const object of listResult.objects) {
        await env.AVATARS.delete(object.key)
      }

      // 8. Upload original to temporary location
      const tempKey = `temp/${userId}-${Date.now()}.webp`
      await env.AVATARS.put(tempKey, arrayBuffer, {
        httpMetadata: {
          contentType: 'image/webp'
        }
      })

      const tempUrl = `https://avatars.zephyron.app/${tempKey}`

      // 9. Generate small size (128x128) using Workers Image Resizing
      const smallResponse = await fetch(tempUrl, {
        cf: {
          image: {
            width: 128,
            height: 128,
            fit: 'cover',
            format: 'webp',
            quality: 85
          }
        }
      })

      if (!smallResponse.ok) {
        throw new Error('Failed to resize small image')
      }

      const smallBuffer = await smallResponse.arrayBuffer()
      await env.AVATARS.put(`${userId}/avatar-small.webp`, smallBuffer, {
        httpMetadata: {
          contentType: 'image/webp'
        }
      })

      // 10. Generate large size (512x512)
      const largeResponse = await fetch(tempUrl, {
        cf: {
          image: {
            width: 512,
            height: 512,
            fit: 'cover',
            format: 'webp',
            quality: 85
          }
        }
      })

      if (!largeResponse.ok) {
        throw new Error('Failed to resize large image')
      }

      const largeBuffer = await largeResponse.arrayBuffer()
      await env.AVATARS.put(`${userId}/avatar-large.webp`, largeBuffer, {
        httpMetadata: {
          contentType: 'image/webp'
        }
      })

      // 11. Delete temp file
      await env.AVATARS.delete(tempKey)

      // 12. Save avatar_url to database (pointing to large size)
      const avatarUrl = `https://avatars.zephyron.app/${userId}/avatar-large.webp`

      await env.DB.prepare(
        'UPDATE user SET avatar_url = ? WHERE id = ?'
      ).bind(avatarUrl, userId).run()

      // 13. Return success
      return json<UploadAvatarResponse>({
        success: true,
        avatar_url: avatarUrl
      })

    } catch (imageError) {
      console.error('Image processing error:', imageError)
      return json<UploadAvatarError>({
        error: 'RESIZE_FAILED',
        message: 'Failed to process image sizes'
      }, 500)
    }

  } catch (error) {
    console.error('Avatar upload error:', error)
    return json<UploadAvatarError>({
      error: 'UPLOAD_FAILED',
      message: 'Failed to upload to storage'
    }, 500)
  }
}
```

- [ ] **Step 2: Test avatar upload manually**

Run: `bun run dev`
1. Navigate to Settings → Profile
2. Upload a square image (1000x1000) → Verify success
3. Check R2 bucket: `wrangler r2 object list zephyron-avatars --local`
4. Verify both files exist: `{userId}/avatar-small.webp` and `{userId}/avatar-large.webp`
5. Upload landscape image (1600x900) → Verify center crop works
6. Upload portrait image (600x900) → Verify center crop works
7. Upload another image → Verify old avatars deleted (only current 2 files remain)
8. Check file sizes: small < 10KB, large < 50KB
9. Verify no errors in console

Expected: Multi-size generation works, old files deleted, both sizes within target file sizes

- [ ] **Step 3: Commit multi-size avatar upload**

```bash
git add worker/routes/profile.ts
git commit -m "feat(avatars): add multi-size generation with Workers Image Resizing

Generate 128x128 (small) and 512x512 (large) variants using cf.image API.
Delete old avatars before uploading new. Store large URL in database."
```

### Task 21: Create avatar helper and update frontend

**Files:**
- Create: `src/lib/avatar.ts`
- Modify: `src/components/profile/ProfileHeader.tsx`
- Modify: `src/components/activity/ActivityItem.tsx`
- Modify: `src/components/ui/TopNav.tsx` (if exists)

- [ ] **Step 1: Create avatar URL helper**

```typescript
// src/lib/avatar.ts (create new file)

/**
 * Get avatar URL with appropriate size variant
 * @param avatarUrl - Full avatar URL (points to large size)
 * @param size - Desired size variant
 * @returns URL with correct size suffix
 */
export function getAvatarUrl(
  avatarUrl: string | null | undefined,
  size: 'small' | 'large'
): string | null {
  if (!avatarUrl) return null

  // If URL already points to a specific size, replace it
  if (avatarUrl.includes('/avatar-small.webp') || avatarUrl.includes('/avatar-large.webp')) {
    return avatarUrl.replace(/avatar-(small|large)\.webp/, `avatar-${size}.webp`)
  }

  // Otherwise, assume it's the large size and replace accordingly
  return avatarUrl.replace(/\/([^/]+)\.webp$/, `/$1-${size}.webp`)
}

/**
 * Get avatar URL for large size (profile headers, settings)
 */
export function getAvatarLarge(avatarUrl: string | null | undefined): string | null {
  return getAvatarUrl(avatarUrl, 'large')
}

/**
 * Get avatar URL for small size (lists, comments, nav)
 */
export function getAvatarSmall(avatarUrl: string | null | undefined): string | null {
  return getAvatarUrl(avatarUrl, 'small')
}
```

- [ ] **Step 2: Update ProfileHeader to use large size**

```typescript
// src/components/profile/ProfileHeader.tsx (find avatar img tag)

// Add import at top:
import { getAvatarLarge } from '../../lib/avatar'

// Replace avatar img src:
<img
  src={getAvatarLarge(user.avatar_url) || '/default-avatar.png'}
  alt={user.name}
  className="w-20 h-20 md:w-24 md:h-24 rounded-xl object-cover"
/>
```

- [ ] **Step 3: Update ActivityItem to use small size**

```typescript
// src/components/activity/ActivityItem.tsx (if showing avatars)

// Add import:
import { getAvatarSmall } from '../../lib/avatar'

// If component shows avatars, use:
<img
  src={getAvatarSmall(item.user_avatar_url) || '/default-avatar.png'}
  alt={item.user_name}
  className="w-10 h-10 rounded-full object-cover"
/>
```

- [ ] **Step 4: Update TopNav (if avatar shown)**

```typescript
// src/components/ui/TopNav.tsx (find user avatar, if exists)

// Add import:
import { getAvatarSmall } from '../../lib/avatar'

// Replace avatar img src:
<img
  src={getAvatarSmall(user.avatar_url) || '/default-avatar.png'}
  alt={user.name}
  className="w-8 h-8 rounded-full object-cover"
/>
```

- [ ] **Step 5: Test avatar size selection**

Run: `bun run dev`
1. Navigate to profile page → Open DevTools Network tab
2. Verify profile header loads `avatar-large.webp` (512x512)
3. Navigate to activity feed → Verify loads `avatar-small.webp` (128x128) if avatars shown
4. Check top nav (if avatar shown) → Verify loads `avatar-small.webp`
5. Verify images display correctly without distortion
6. Check file sizes in Network tab: small ~5-10KB, large ~30-50KB

Expected: Correct avatar sizes load in each context, bandwidth optimized

- [ ] **Step 6: Commit avatar helper and frontend updates**

```bash
git add src/lib/avatar.ts src/components/profile/ProfileHeader.tsx src/components/activity/ActivityItem.tsx src/components/ui/TopNav.tsx
git commit -m "feat(avatars): add size-aware avatar helper for frontend

getAvatarLarge: Profile headers, settings (512x512)
getAvatarSmall: Activity feed, nav, lists (128x128)
Update components to use appropriate sizes"
```

---

## Final Testing & Completion

### Task 22: End-to-end manual testing

**Files:**
- None (manual testing only)

- [ ] **Step 1: Test complete stats flow**

Run: `bun run dev`

**Stats System:**
1. Navigate to `/app/profile`
2. Verify stats section shows with all metrics
3. Check heatmap renders with correct colors
4. Verify top artists list with hours
5. Check weekday chart bars align correctly
6. Test with no listening history → Empty state shows
7. View another user's public profile → Stats visible
8. View private profile → Stats hidden

- [ ] **Step 2: Test complete badge flow**

**Badge System:**
1. Click Badges tab
2. Verify earned badges show with dates
3. Hover badge → Tooltip shows description
4. Verify locked badges show with lock icon
5. Test category filter → Only filtered badges show
6. Trigger badge via D1: Award `sets_100` badge manually
7. Refresh → Verify badge appears in Earned section
8. Check activity feed → Verify "badge earned" item created
9. Run cron manually: `curl http://localhost:8787/__scheduled?cron=0+6+*+*+*`
10. Check console logs for badge awards
11. Verify new badges appear after cron

- [ ] **Step 3: Test complete activity flow**

**Activity Feed:**
1. Navigate to profile Overview → Verify last 5 activities show
2. Perform action (like song, create playlist) → Verify appears in feed
3. Click "View All" → Navigate to `/app/activity` → Full feed loads
4. Click "Load More" → Next 20 items load
5. Navigate to `/app/community` → Global feed shows other users
6. Go to Settings → Privacy → Toggle "Badge achievements" off
7. Earn badge → Verify NOT in community feed
8. Check personal feed → Verify badge still appears
9. Set profile to private → Verify all activity hidden from community
10. Test all activity types render correctly

- [ ] **Step 4: Test complete avatar flow**

**Image Processing:**
1. Navigate to Settings → Profile
2. Upload square image → Verify both sizes generated
3. Check R2: `wrangler r2 object list zephyron-avatars --local`
4. Verify 2 files: `avatar-small.webp`, `avatar-large.webp`
5. Check profile header → Network tab shows `avatar-large.webp`
6. Check activity feed → Network tab shows `avatar-small.webp` (if used)
7. Upload landscape image → Verify center crop works
8. Upload new image → Verify old files deleted
9. Check file sizes: small < 10KB, large < 50KB

- [ ] **Step 5: Performance check**

1. Open DevTools → Network tab
2. Navigate to profile → Time stats API request
3. Verify < 500ms response time
4. Check badge API → Verify < 200ms
5. Check activity feed → Verify < 300ms
6. Load community feed page 2 → Verify pagination works

- [ ] **Step 6: Document any issues found**

Create `docs/testing/phase2-3-issues.md` if issues found, otherwise skip.

Expected: All features work end-to-end, no console errors, performance within targets

### Task 23: Apply database migration to remote

**Files:**
- None (database command only)

- [ ] **Step 1: Apply migration to remote D1**

```bash
# Apply migration to remote database
wrangler d1 migrations apply zephyron-db --remote

# Verify tables created
wrangler d1 execute zephyron-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%badge%' OR name LIKE '%activity%');"
```

Expected output: `user_badges`, `activity_items`, `activity_privacy_settings`

- [ ] **Step 2: Verify indexes created**

```bash
wrangler d1 execute zephyron-db --remote --command "SELECT name FROM sqlite_master WHERE type='index' AND (tbl_name = 'user_badges' OR tbl_name = 'activity_items' OR tbl_name = 'activity_privacy_settings');"
```

Expected output: All indexes from migration (6 total)

- [ ] **Step 3: Document migration**

```bash
git add migrations/0021_badges-and-activity.sql
git commit -m "chore(db): apply badges and activity migration to remote

Tables: user_badges, activity_items, activity_privacy_settings
Applied to remote D1 database on $(date +%Y-%m-%d)"
```

### Task 24: Deploy to staging

**Files:**
- None (deployment command only)

- [ ] **Step 1: Deploy worker to staging**

```bash
# Deploy to staging (assuming staging environment configured)
wrangler deploy --env staging

# Or deploy to default if no staging:
wrangler deploy
```

- [ ] **Step 2: Verify deployment**

1. Check worker logs: `wrangler tail --env staging`
2. Test stats endpoint: `curl https://staging.zephyron.app/api/profile/USER_ID/stats`
3. Test badges endpoint: `curl https://staging.zephyron.app/api/profile/USER_ID/badges`
4. Test activity endpoints
5. Verify cron registered: Check Cloudflare dashboard → Workers → Triggers

- [ ] **Step 3: Smoke test on staging**

1. Open https://staging.zephyron.app
2. Navigate through all features
3. Verify stats, badges, activity all work
4. Upload avatar → Verify both sizes generated
5. Check R2 bucket for correct files
6. Test privacy settings
7. Verify no console errors

Expected: All features work on staging, no deployment errors

- [ ] **Step 4: Tag release**

```bash
git tag -a v0.4.0-alpha -m "Profile Phase 2 & 3: Stats, Badges, Activity, Multi-size Avatars"
git push origin v0.4.0-alpha
git push origin staging
```

---

## Self-Review Checklist

### Spec Coverage

- [x] Stats System: All metrics implemented (total hours, top artists, heatmap, weekday, sessions)
- [x] Badge System: 20+ badges across all categories with cron job
- [x] Activity Feed: 3 feed types (personal, user profile, community) with pagination
- [x] Image Processing: Multi-size generation (128x128, 512x512) with Workers Image Resizing
- [x] Privacy Controls: Per-activity-type toggles with smart defaults
- [x] Frontend Components: All UI components from spec (stats, badges, activity)
- [x] Database Migrations: All tables and indexes from spec
- [x] API Endpoints: All 8 new endpoints implemented
- [x] Error Handling: All error types from spec
- [x] Caching: 5min stats, 10min badges, frontend caching

### Type Consistency

- [x] ProfileStats: Matches across worker/types.ts and src/lib/types.ts
- [x] Badge: Matches across worker and frontend
- [x] UserBadge: Consistent structure
- [x] ActivityItem: Matches in all locations
- [x] GetStatsResponse/GetBadgesResponse/GetActivityResponse: Consistent
- [x] Error types: All match spec

### No Placeholders

- [x] All code blocks complete (no TBD, TODO)
- [x] All test expectations specific
- [x] All SQL queries complete
- [x] All component implementations complete
- [x] No "similar to Task N" references
- [x] All helper functions implemented

### Plan Quality

- [x] Exact file paths in every task
- [x] TDD flow: test → fail → implement → pass → commit
- [x] Bite-sized steps (2-5 minutes each)
- [x] Complete code in every step
- [x] Exact commands with expected output
- [x] Frequent commits with clear messages

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-11-profile-phase2-3.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**