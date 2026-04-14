# Profile System Phase 2 & 3 — Image Processing, Stats, Badges, Activity

**Date:** 2026-04-11  
**Version:** 0.4.0-alpha  
**Status:** Design Approved

## Overview

Complete the profile system refactor with Phase 2 (multi-size avatar processing) and Phase 3 (comprehensive stats, achievement badges, and social activity feeds). This builds on Phase 1's foundation (avatar upload, bio, privacy controls) to create a rich, engaging profile experience.

### Implementation Strategy

**Feature-first vertical slices** — Deliver user value incrementally:

1. **Stats System** (3-4 days) — Comprehensive listening analytics with heatmaps and patterns
2. **Badge System** (4-5 days) — 20+ achievement badges across milestones, behavior, genres, community
3. **Activity Feed** (3-4 days) — Personal, public profile, and global community feeds
4. **Image Processing** (2 days) — Multi-size avatar optimization (can run in parallel)

Each slice ships independently with full backend + frontend + UI implementation.

## Goals

**Phase 2:**
- Optimize avatar performance with multi-size variants (small 128x128, large 512x512)
- Reduce bandwidth and improve loading speed across the app
- Maintain storage efficiency by deleting old avatars on upload

**Phase 3:**
- Surface rich listening insights (top artists, genres, patterns, streaks)
- Gamify engagement with meaningful achievement badges
- Build community connection through activity feeds
- Respect user privacy with granular controls

## Architecture

### Vertical Slice Structure

**Slice 1: Stats System**
- Backend: `GET /api/profile/:userId/stats?period=all|year|month`
- Calculations: Leverage existing `worker/lib/stats.ts`, extend for heatmaps/patterns
- Frontend: `ProfileStatsSection` component on Overview tab
- Data source: `listening_sessions` table (already populated)
- Metrics: Total hours, top 5 artists with durations, top 3 genres, discoveries, streak, heatmap, weekday pattern, avg/longest session

**Slice 2: Badge System**
- Database: New `user_badges` table
- Backend: Badge definitions in `worker/lib/badges.ts` with check functions
- Cron job: Daily scan (6am PT) calculates eligible badges for all users
- Real-time: Check specific badges on action completion (session end, playlist create)
- Frontend: `BadgesGrid` component with earned/locked states, tooltips
- API: `GET /api/profile/:userId/badges`
- Categories: Milestones, behavior patterns, genres, time-based, community, special (20+ total)

**Slice 3: Activity Feed**
- Database: New `activity_items` and `activity_privacy_settings` tables
- Activity types: Badge earned, song liked, playlist created/updated, annotation approved, milestone reached
- Three feed views: Personal (`/app/activity`), user profile (last 5), global community (`/app/community`)
- Privacy: Respects `is_profile_public` + per-action-type toggles
- Backend: `GET /api/activity/me|user/:userId|community?page=X`
- Frontend: `ActivityFeed` component with pagination, type-specific rendering
- Smart defaults: All activity public by default (user can opt-out)

**Slice 4: Image Processing**
- Update: `POST /api/profile/avatar/upload` to generate two sizes
- Method: Cloudflare Workers Image Resizing API (built-in, no dependencies)
- Sizes: Small (128x128) for lists/comments, Large (512x512) for profile headers
- Storage: R2 at `{userId}/avatar-small.webp` and `{userId}/avatar-large.webp`
- Cleanup: Delete old avatars before uploading new ones
- Frontend: Update all avatar references to use appropriate size

### Technology Stack

- **Image processing:** Cloudflare Workers Image Resizing API
- **Stats calculations:** Existing `stats.ts` functions + new heatmap/pattern queries
- **Badge engine:** Server-side cron + event triggers
- **Activity generation:** Insert on action complete
- **Frontend state:** Zustand for caching, React Query for data fetching
- **Database:** D1 (SQLite) with new tables for badges, activity, privacy settings

### Database Schema

**New Tables:**

```sql
-- User Badges (junction table)
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

**Existing Tables (no changes needed):**
- `listening_sessions` — Already tracks user listening with duration, dates
- `user_monthly_stats` — Pre-computed monthly stats (future optimization)
- `user_annual_stats` — Pre-computed annual stats (future optimization)
- `user` — Already has `avatar_url`, `bio`, `is_profile_public` from Phase 1

## Data Models

### TypeScript Types

```typescript
// Badge Definitions
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

// Stats
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

// Activity
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

// API Response Types
export interface GetStatsResponse {
  stats: ProfileStats
}

export interface GetBadgesResponse {
  badges: UserBadge[]
}

export interface GetActivityResponse {
  items: ActivityItem[]
  total: number
  page: number
  hasMore: boolean
}
```

### Activity Item Metadata Examples

```typescript
// Badge earned
{ badge_id: 'night_owl', badge_name: 'Night Owl' }

// Song liked
{ song_id: 'abc123', song_title: 'Cercle', song_artist: 'Ben Böhmer' }

// Playlist created
{ playlist_id: 'xyz789', playlist_title: 'Deep Melodic', item_count: 0 }

// Playlist updated
{ playlist_id: 'xyz789', playlist_title: 'Deep Melodic', action: 'added_set', set_title: 'Tale Of Us' }

// Annotation approved
{ annotation_id: 'ann123', set_title: 'Afterlife', track_title: 'Anyma - Running', track_artist: 'Anyma' }

// Milestone reached
{ milestone: '100_hours', value: 100 }
```

## Data Flow & Business Logic

### Stats Calculation Flow

1. User navigates to profile → Frontend requests `GET /api/profile/:userId/stats?period=all`
2. Backend queries `listening_sessions` table with date range filter
3. Calculate metrics:
   - **Total hours:** `SUM(duration_seconds) / 3600`
   - **Top artists:** Join with `detections`, group by `track_artist`, sum weighted duration (session duration / track count)
   - **Heatmap:** Group sessions by hour-of-day and day-of-week, count occurrences → 7x24 grid
   - **Weekday pattern:** Group by day name (Mon-Sun), sum hours
   - **Longest session:** `MAX(duration_seconds)`
   - **Average session:** `AVG(duration_seconds)`
   - **Discoveries:** Count distinct artists in period that don't appear in earlier sessions
   - **Streak:** Find longest consecutive day sequence with qualifying sessions
4. Return JSON with all stats
5. Frontend caches in Zustand for 5 minutes (avoid re-fetching on tab switches)

**Heatmap Data Structure:**
```typescript
// 7 rows (Sun-Sat) x 24 columns (0-23 hours)
// Each cell = count of sessions in that hour slot
listening_heatmap: [
  [0, 0, 0, 1, 2, 3, 5, 8, 3, 1, 0, 0, 0, 0, 1, 2, 4, 6, 9, 12, 8, 4, 2, 1],  // Sunday
  [0, 0, 0, 0, 1, 2, 4, 7, 5, 2, 1, 0, 0, 0, 0, 1, 3, 5, 7, 10, 6, 3, 1, 0],  // Monday
  // ... 5 more days
]
```

**Weekday Pattern:**
```typescript
weekday_pattern: [
  { day: 'Mon', hours: 12.5 },
  { day: 'Tue', hours: 8.3 },
  { day: 'Wed', hours: 10.1 },
  { day: 'Thu', hours: 9.7 },
  { day: 'Fri', hours: 15.2 },
  { day: 'Sat', hours: 18.4 },
  { day: 'Sun', hours: 14.8 }
]
```

### Badge Earning Flow

**Daily Cron Job (6am PT):**
1. Fetch all users
2. For each user:
   - Iterate through all badge definitions
   - Call `badge.checkFn(userId, env)` to check eligibility
   - If eligible and not already earned:
     - Insert into `user_badges` table (UNIQUE constraint prevents duplicates)
     - Generate activity item: `{ activity_type: 'badge_earned', metadata: { badge_id, badge_name } }`
3. Log summary: "Awarded X badges to Y users"
4. Catch and log errors, continue processing other users

**Real-time Badge Checks:**
- **Listening session completes:** Check Night Owl, Marathon Listener
- **Playlist created:** Check Curator (10+ playlists)
- **Song liked:** Check milestone badges (100 likes, 1000 likes)
- **Annotation approved:** Check Annotator, Detective

**Badge Definitions (20+ total):**

**Milestones:**
- Early Adopter — Joined in first month of beta
- 100 Sets Listened
- 1000 Sets Listened
- 100 Hours
- 1000 Hours
- 100 Song Likes
- 10 Playlists Created

**Behavior Patterns:**
- Night Owl — 10+ sessions after midnight (0-6am)
- Marathon Listener — Single session > 4 hours
- Daily Devotee — 7-day listening streak
- Weekend Warrior — 80%+ listening on weekends
- Commute Companion — 80%+ listening 7-9am or 5-7pm

**Genre Exploration:**
- Genre Explorer — Listened to 10+ different genres
- Techno Head — 100+ hours of techno
- House Master — 100+ hours of house
- Trance Traveler — 100+ hours of trance
- Melodic Maven — 100+ hours of melodic techno/progressive

**Community:**
- Curator — Created 10+ playlists
- Annotator — 10+ approved annotations
- Detective — 50+ approved corrections

**Special/Seasonal:**
- Wrapped Viewer — Viewed annual Wrapped
- Festival Fanatic — Listened to 5+ festival events

**Badge Definition Structure:**
```typescript
export const BADGE_DEFINITIONS: Badge[] = [
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Joined in the first month of beta',
    icon: '🌟',
    category: 'special',
    rarity: 'legendary',
    checkFn: async (userId, env) => {
      const user = await env.DB.prepare('SELECT created_at FROM user WHERE id = ?')
        .bind(userId).first()
      return new Date(user.created_at) < new Date('2026-02-01')
    }
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Listen to 10+ sets after midnight',
    icon: '🦉',
    category: 'behavior',
    rarity: 'rare',
    checkFn: async (userId, env) => {
      const result = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM listening_sessions
        WHERE user_id = ? 
          AND CAST(strftime('%H', started_at) as INTEGER) >= 0 
          AND CAST(strftime('%H', started_at) as INTEGER) < 6
      `).bind(userId).first()
      return result.count >= 10
    }
  },
  // ... 18+ more badge definitions
]
```

### Activity Feed Generation Flow

**Trigger Events:**

Activity items are created when:
- Badge earned → `{ activity_type: 'badge_earned', metadata: { badge_id, badge_name } }`
- Song liked → `{ activity_type: 'song_liked', metadata: { song_id, song_title, song_artist } }`
- Playlist created → `{ activity_type: 'playlist_created', metadata: { playlist_id, playlist_title } }`
- Playlist updated → `{ activity_type: 'playlist_updated', metadata: { playlist_id, playlist_title, action: 'added_set' } }`
- Annotation approved → `{ activity_type: 'annotation_approved', metadata: { annotation_id, set_title, track_title } }`
- Milestone reached → `{ activity_type: 'milestone_reached', metadata: { milestone: '100_hours' } }`

**Privacy Calculation:**

For each activity item created:
1. Check user's `is_profile_public` setting (from `user` table)
2. Check `activity_privacy_settings` for specific activity type (default: visible)
3. Set `is_public = 1` only if both are true
4. Smart default: All activity types visible by default, user can opt-out in settings

**Feed Queries:**

```sql
-- Personal feed (own activity, ignore privacy)
SELECT * FROM activity_items 
WHERE user_id = ? 
ORDER BY created_at DESC 
LIMIT 20 OFFSET ?

-- User profile feed (last 5, respects privacy)
SELECT * FROM activity_items 
WHERE user_id = ? AND is_public = 1 
ORDER BY created_at DESC 
LIMIT 5

-- Global community feed (all public activity)
SELECT ai.*, u.name, u.avatar_url 
FROM activity_items ai
JOIN user u ON ai.user_id = u.id
WHERE ai.is_public = 1 
ORDER BY ai.created_at DESC 
LIMIT 20 OFFSET ?
```

**Pagination:**
- Standard page-based: 20 items per page
- "Load More" button at bottom
- Frontend tracks current page, fetches next page on click
- Response includes: `{ items, total, page, hasMore }`

### Image Processing Flow

**Avatar Upload with Multi-Size Generation:**

1. User uploads avatar → `POST /api/profile/avatar/upload` with multipart form data
2. Backend validation (file type, size — same as Phase 1)
3. **Delete old avatars:**
   ```typescript
   const objects = await env.AVATARS.list({ prefix: `${userId}/avatar-` })
   for (const obj of objects.objects) {
     await env.AVATARS.delete(obj.key)
   }
   ```
4. **Upload original to temporary location:**
   ```typescript
   const tempKey = `temp/${userId}-${Date.now()}.webp`
   await env.AVATARS.put(tempKey, arrayBuffer)
   const tempUrl = `https://avatars.zephyron.app/${tempKey}`
   ```
5. **Generate small size (128x128) using Workers Image Resizing:**
   ```typescript
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
   const smallBuffer = await smallResponse.arrayBuffer()
   await env.AVATARS.put(`${userId}/avatar-small.webp`, smallBuffer)
   ```
6. **Generate large size (512x512):**
   ```typescript
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
   const largeBuffer = await largeResponse.arrayBuffer()
   await env.AVATARS.put(`${userId}/avatar-large.webp`, largeBuffer)
   ```
7. **Delete temp file:**
   ```typescript
   await env.AVATARS.delete(tempKey)
   ```
8. **Update database:**
   ```typescript
   await env.DB.prepare('UPDATE user SET avatar_url = ? WHERE id = ?')
     .bind(`https://avatars.zephyron.app/${userId}/avatar-large.webp`, userId)
     .run()
   ```
9. Return success with new URL

**Frontend Avatar Usage:**
- Profile header, settings page: `avatar-large.webp` (512x512)
- Activity feed, comments, user lists, top nav: `avatar-small.webp` (128x128)
- Helper function: `getAvatarUrl(avatarUrl, size: 'small' | 'large')`

## Components & UI Structure

### ProfileStatsSection (Overview Tab)

**Location:** ProfilePage → Overview tab

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Listening Statistics                                    │
│                                                         │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐         │
│ │ 1,234 hrs  │ │ 42 days    │ │ 89 artists │         │
│ │ Total Time │ │ Streak     │ │ Discovered │         │
│ └────────────┘ └────────────┘ └────────────┘         │
│                                                         │
│ Top Artists (by listening time)                        │
│ 1. Ben Böhmer ──────────────────────── 48.2 hrs       │
│ 2. Lane 8 ──────────────────────────── 42.1 hrs       │
│ 3. Yotto ───────────────────────────── 38.5 hrs       │
│ 4. Nora En Pure ────────────────────── 35.7 hrs       │
│ 5. Artbat ──────────────────────────── 32.4 hrs       │
│                                                         │
│ Top Genres: #melodic-techno #progressive-house         │
│                                                         │
│ Listening Patterns                                      │
│ ┌─────────────────────────────────────┐               │
│ │ [Time-of-day heatmap 24h x 7 days] │               │
│ │ Sun │▓▓░░░░░░░░░░░░░░░░░░░░░░░░│ 24h              │
│ │ Mon │░░░░░░░▓▓▓▓░░░░░░░░░░░░░░│ 24h              │
│ │ Tue │░░░░░░░▓▓▓▓░░░░░░░▓▓▓░░░│ 24h              │
│ │ ... │                                               │
│ └─────────────────────────────────────┘               │
│                                                         │
│ Weekday Breakdown                                       │
│ Mon ████████████░░░░░░ 12.5h                           │
│ Tue ████████░░░░░░░░░░  8.3h                           │
│ Wed ██████████░░░░░░░░ 10.1h                           │
│ Thu █████████░░░░░░░░░  9.7h                           │
│ Fri ███████████████░░░ 15.2h                           │
│ Sat ██████████████████ 18.4h                           │
│ Sun ███████████████░░░ 14.8h                           │
│                                                         │
│ Avg Session: 52 min  •  Longest: 4h 12min             │
└─────────────────────────────────────────────────────────┘
```

**Component Structure:**
```typescript
<ProfileStatsSection stats={stats}>
  <StatsGrid>
    <StatCard value={stats.total_hours} label="Total Time" unit="hrs" accent />
    <StatCard value={stats.longest_streak_days} label="Streak" unit="days" />
    <StatCard value={stats.discoveries_count} label="Discovered" unit="artists" />
  </StatsGrid>
  
  <TopArtistsList artists={stats.top_artists} />
  
  <GenreTags genres={stats.top_genres} />
  
  <ListeningHeatmap data={stats.listening_heatmap} />
  
  <WeekdayChart data={stats.weekday_pattern} />
  
  <SessionStats 
    average={stats.average_session_minutes} 
    longest={stats.longest_session_minutes} 
  />
</ProfileStatsSection>
```

**Empty State (no listening history):**
```
┌─────────────────────────────────────┐
│                                     │
│         📊                          │
│                                     │
│   No listening history yet          │
│   Start listening to see your stats │
│                                     │
│   [Browse Sets]                     │
│                                     │
└─────────────────────────────────────┘
```

### BadgesGrid (New "Badges" Tab)

**Location:** ProfilePage → Badges tab (new)

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Achievement Badges                    [Filter: All ▾]   │
│                                                         │
│ Earned (12/26)                                          │
│                                                         │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │
│ │  🌟  │ │  🦉  │ │  🏃  │ │  🎭  │ │  🔥  │         │
│ │Early │ │Night │ │Mara- │ │Genre │ │100   │         │
│ │Adopter│ │ Owl  │ │thon  │ │Explo-│ │Sets  │         │
│ │      │ │      │ │      │ │rer   │ │      │         │
│ │Jan 15│ │Feb 3 │ │Feb 28│ │Mar 1 │ │Apr 2 │         │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘         │
│                                                         │
│ Locked (14)                                             │
│                                                         │
│ ┌──────┐ ┌──────┐ ┌──────┐                            │
│ │  🔒  │ │  🔒  │ │  🔒  │                            │
│ │1000  │ │Vinyl │ │Cura- │                            │
│ │Hours │ │Lover │ │tor   │                            │
│ │      │ │      │ │      │                            │
│ │?????  │ │?????  │ │?????  │                            │
│ └──────┘ └──────┘ └──────┘                            │
└─────────────────────────────────────────────────────────┘
```

**Badge Card States:**

**Earned:**
- Full color icon
- Badge name
- Earned date
- Tooltip on hover: Full description + criteria

**Locked:**
- Grayscale/muted icon with lock overlay
- Badge name
- "?????" placeholder date
- Tooltip on hover: How to earn (criteria)

**Filter Dropdown:**
- All (default)
- Milestones
- Behavior
- Genres
- Community
- Special

### ActivityFeed Component

**Location 1:** ProfilePage → Overview tab (last 5 items with "View All" link)

**Location 2:** `/app/activity` (full personal feed with pagination)

**Location 3:** `/app/community` (global public feed)

**Layout (Profile Overview):**
```
┌─────────────────────────────────────────────────────────┐
│ Recent Activity                    [View All →]         │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ [Avatar] You earned Night Owl badge             │   │
│ │          "Listen to 10 sets after midnight"     │   │
│ │          2 hours ago                             │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ [Avatar] You liked "Cercle - Ben Böhmer"        │   │
│ │          Yesterday at 11:42 PM                   │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ [Avatar] You created playlist "Deep Melodic"    │   │
│ │          3 days ago                              │   │
│ └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Layout (Full Feed - `/app/activity` or `/app/community`):**
```
┌─────────────────────────────────────────────────────────┐
│ Community Activity              [Filters: All ▾]        │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ [Avatar] DJ_Lover earned Marathon Listener      │   │
│ │          5 minutes ago                           │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ [Avatar] MusicFan created "Tomorrowland 2026"   │   │
│ │          23 minutes ago                          │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ [Avatar] Beatseeker liked "Tale Of Us"          │   │
│ │          1 hour ago                              │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ... (17 more items)                                     │
│                                                         │
│                    [Load More]                         │
└─────────────────────────────────────────────────────────┘
```

**Activity Item Types:**

Each type has custom icon and text formatting:
- **Badge earned:** 🏆 icon, badge name, description
- **Song liked:** ❤️ icon, song title + artist
- **Playlist created:** 📁 icon, playlist title
- **Playlist updated:** 📁 icon, "Added [set] to [playlist]"
- **Annotation approved:** ✅ icon, track title in set title
- **Milestone reached:** 🎉 icon, "Reached [milestone]"

**Empty State:**
```
┌─────────────────────────────────────┐
│                                     │
│         📭                          │
│                                     │
│   No activity yet                   │
│   Start listening and creating!     │
│                                     │
└─────────────────────────────────────┘
```

### Privacy Settings (Settings → Privacy)

**New Section Added:**

```
Activity Privacy
────────────────

Control what appears in your activity feed and the community feed

[✓] Badge achievements
[✓] Playlist creations
[✓] Song likes
[✓] Annotation approvals
[ ] Listening milestones

Note: Activity visibility also respects your profile visibility setting.
If your profile is private, no activity will appear in the community feed.
```

**Implementation:**
- Each toggle is a checkbox
- Saves to `activity_privacy_settings` table on change
- Smart default: All checked (visible) on first visit
- Immediate effect (no save button needed)

## Error Handling

### API Error Responses

**Stats Endpoint:**
```typescript
// GET /api/profile/:userId/stats
{ error: 'INVALID_USER_ID', message: 'User ID format invalid' }  // 400
{ error: 'USER_NOT_FOUND', message: 'User does not exist' }  // 404
{ error: 'PROFILE_PRIVATE', message: 'Profile is private' }  // 403
{ error: 'STATS_UNAVAILABLE', message: 'Unable to calculate stats' }  // 500
```

**Badges Endpoint:**
```typescript
// GET /api/profile/:userId/badges
{ error: 'INVALID_USER_ID' }  // 400
{ error: 'USER_NOT_FOUND' }  // 404
{ error: 'PROFILE_PRIVATE' }  // 403
```

**Activity Endpoints:**
```typescript
// GET /api/activity/me|user/:userId|community
{ error: 'UNAUTHORIZED' }  // 401 (for /me without auth)
{ error: 'INVALID_USER_ID' }  // 400
{ error: 'PROFILE_PRIVATE' }  // 403
{ error: 'INVALID_PAGE' }  // 400
```

**Avatar Upload:**
```typescript
// POST /api/profile/avatar/upload (Phase 1 errors + new)
{ error: 'NO_FILE' }  // 400
{ error: 'INVALID_FORMAT' }  // 400
{ error: 'FILE_TOO_LARGE' }  // 400
{ error: 'CORRUPT_IMAGE' }  // 400
{ error: 'UPLOAD_FAILED' }  // 500
{ error: 'RESIZE_FAILED', message: 'Failed to process image sizes' }  // 500 (NEW)
```

### Frontend Error Handling

**Stats Display:**
- On error: Show empty state with message "Stats unavailable"
- Retry button on 500 errors
- Graceful degradation (no crash)

**Badge Display:**
- On error: Show empty state "Badges unavailable"
- For own profile: Always show UI (show cached or empty grid)

**Activity Feed:**
- On error: Show "Activity feed unavailable" message
- Disable "Load More" button on pagination error
- Retry logic with exponential backoff

**Avatar Upload:**
- Show toast with specific error message
- Don't close modal on error (allow retry)
- Loading state during upload (disable save button)

### Backend Error Strategy

**Badge Calculation (Cron):**
- Catch all errors, log to console, continue processing other users
- Failed badge calculations don't block other users
- Retry tomorrow (cron runs daily)
- Alert admin if error rate > 10% of users

**Activity Generation:**
- Wrapped in try/catch, log error, continue
- Activity item creation failures should NOT block original action
- Example: Playlist creation succeeds even if activity item fails

**Database Transactions:**
- Badge earning: No transaction (idempotent via UNIQUE constraint)
- Activity creation: No transaction (standalone insert)
- Avatar upload: Transaction for delete old + insert new URL (rollback on failure)
- Stats calculation: Read-only, no transaction

## Testing Strategy

### Manual Testing Checklist

**Stats System:**
- [ ] Navigate to own profile → Stats appear with all metrics
- [ ] New user with no sessions → Empty state shows
- [ ] Single session → Metrics calculate correctly
- [ ] Heatmap with varied times → Visual accuracy verified
- [ ] Weekday pattern → Mon-Sun labels and bars correct
- [ ] View public profile → Stats visible
- [ ] View private profile → Stats hidden or error
- [ ] Extremely long session (>10h) → No UI breaks

**Badge System:**
- [ ] Badges tab → Earned badges show with dates
- [ ] Hover earned badge → Tooltip shows description
- [ ] Locked badges → Show "how to earn" hint
- [ ] Earn new badge → Appears in grid
- [ ] Badge earned → Activity item created
- [ ] Filter badges → Categories filter correctly
- [ ] View public profile badges → Visible
- [ ] 0 earned badges → Empty state shows
- [ ] All badges earned → 100% completion indicator

**Activity Feed:**
- [ ] Profile Overview → Last 5 activities show
- [ ] "View All" → Navigate to `/app/activity`
- [ ] Perform actions → New items appear (after refresh)
- [ ] `/app/community` → Global feed loads
- [ ] "Load More" → Next 20 items load
- [ ] No activity → Empty state shows
- [ ] View other user profile → Their public activity shows
- [ ] Change privacy → Badge items hidden in community
- [ ] Each activity type renders correctly

**Image Processing:**
- [ ] Upload avatar → Two sizes generated
- [ ] R2 bucket → `avatar-small.webp` and `avatar-large.webp` exist
- [ ] Old avatars deleted
- [ ] Profile header → Large size used (verify 512x512 in network tab)
- [ ] Activity feed → Small size used (verify 128x128 in network tab)
- [ ] Upload new avatar → Old files deleted, new uploaded
- [ ] Square image → Both sizes generated
- [ ] Portrait image → Center crop works
- [ ] Landscape image → Center crop works
- [ ] Upload failure → Error message, old avatar remains

**Privacy Controls:**
- [ ] Settings → Privacy → Activity section exists
- [ ] Toggle "Badge achievements" off → Setting saves
- [ ] Earn badge → NOT in community feed
- [ ] Own activity feed → Badge still appears
- [ ] Toggle "Song likes" on → Setting saves
- [ ] Like song → Appears in community feed
- [ ] Profile private → All activity hidden from community

### Backend API Testing

```bash
# Stats endpoint
curl http://localhost:8787/api/profile/abc123/stats?period=all
# Expect: { stats: { total_hours, top_artists, ... } }

# Badges endpoint
curl http://localhost:8787/api/profile/abc123/badges
# Expect: { badges: [ { id, badge_id, earned_at, badge: {...} }, ... ] }

# Activity endpoints
curl -H "Authorization: Bearer <token>" http://localhost:8787/api/activity/me?page=1
curl http://localhost:8787/api/activity/user/abc123
curl http://localhost:8787/api/activity/community?page=1
# Expect: { items: [...], total, page, hasMore }

# Avatar upload with multi-size
curl -X POST -H "Authorization: Bearer <token>" \
  -F "file=@test.jpg" \
  http://localhost:8787/api/profile/avatar/upload
# Expect: { success: true, avatar_url: "..." }
# Verify R2: Both avatar-small.webp and avatar-large.webp exist
```

### Database Migration Testing

```bash
# Apply migration
bun run db:migrate

# Verify tables created
wrangler d1 execute ZEPHYRON --command "SELECT name FROM sqlite_master WHERE type='table';"
# Expect: user_badges, activity_items, activity_privacy_settings

# Verify indexes
wrangler d1 execute ZEPHYRON --command "SELECT name FROM sqlite_master WHERE type='index';"
# Expect: idx_user_badges_user, idx_activity_user, idx_activity_public, etc.

# Insert test badge
wrangler d1 execute ZEPHYRON --command \
  "INSERT INTO user_badges (id, user_id, badge_id) VALUES ('test1', 'abc123', 'early_adopter');"

# Query badges
wrangler d1 execute ZEPHYRON --command \
  "SELECT * FROM user_badges WHERE user_id = 'abc123';"
```

### Cron Job Testing

```bash
# Trigger badge calculation cron manually (dev)
curl http://localhost:8787/__scheduled?cron=0+6+*+*+*

# Check console logs for:
# - "Processing badges for user X"
# - "Awarded Y badges to Z users"
# - Any errors

# Verify new badges in database
wrangler d1 execute ZEPHYRON --command "SELECT * FROM user_badges ORDER BY earned_at DESC LIMIT 10;"

# Verify activity items created
wrangler d1 execute ZEPHYRON --command "SELECT * FROM activity_items WHERE activity_type = 'badge_earned' ORDER BY created_at DESC LIMIT 10;"
```

## Implementation Notes

### Cron Job Schedule

Update `wrangler.jsonc`:
```jsonc
"triggers": {
  "crons": [
    "0 * * * *",    // Hourly: session cleanup
    "0 5 1 * *",    // Monthly: stats aggregation
    "0 5 2 1 *",    // Annual: Wrapped generation
    "0 6 * * *"     // Daily: badge calculations (NEW - 6am PT)
  ]
}
```

### Frontend State Management

```typescript
// Zustand store for profile features
interface ProfileStore {
  stats: ProfileStats | null
  statsLoading: boolean
  statsError: string | null
  
  badges: UserBadge[]
  badgesLoading: boolean
  badgesError: string | null
  
  activityFeed: ActivityItem[]
  activityPage: number
  activityHasMore: boolean
  activityLoading: boolean
  activityError: string | null
  
  fetchStats: (userId: string, period?: string) => Promise<void>
  fetchBadges: (userId: string) => Promise<void>
  fetchActivity: (feed: 'me' | 'user' | 'community', page: number) => Promise<void>
  loadMoreActivity: () => Promise<void>
}
```

### Performance Considerations

**Database Indexes:**
- Composite index on `listening_sessions(user_id, session_date)` for fast stats queries
- Index on `activity_items(is_public, created_at DESC)` for community feed
- Existing indexes sufficient for badges (primary key lookups)

**Query Optimization:**
- Stats queries should complete in < 200ms (P95)
- Consider denormalizing heatmap data if calculation is slow (> 500ms)
- Badge cron should process all users in < 5 minutes

**Frontend Caching:**
- Stats: Cache 5 minutes in Zustand
- Badges: Cache 10 minutes in Zustand
- Activity feed: Cache 1 minute in Zustand
- Invalidate caches on relevant actions (badge earned, activity created)

**Image Optimization:**
- Small avatar: ~5-10KB (128x128 WebP)
- Large avatar: ~30-50KB (512x512 WebP)
- Quality 85% balances size vs. visual quality

**Badge Calculation:**
- Run daily at 6am PT (low traffic time)
- Process users in batches of 100 (reduce memory pressure)
- Timeout after 5 minutes (Cloudflare Workers limit: 15 min for cron)

### Route Structure

**New Routes:**
- `/app/profile` → Existing, add Badges tab
- `/app/activity` → New, personal activity feed
- `/app/community` → New, global community feed

**API Routes:**
- `GET /api/profile/:userId/stats?period=all|year|month` → New
- `GET /api/profile/:userId/badges` → New
- `GET /api/activity/me?page=X` → New
- `GET /api/activity/user/:userId` → New
- `GET /api/activity/community?page=X` → New
- `POST /api/profile/avatar/upload` → Updated for multi-size

## Success Metrics

### Phase 2 Completion Criteria

- [ ] Avatar upload generates two sizes (128x128 and 512x512)
- [ ] Old avatars deleted when new uploaded
- [ ] Profile header uses large size
- [ ] Activity feed uses small size
- [ ] Image file sizes < 50KB large, < 10KB small
- [ ] No regression in Phase 1 functionality

### Phase 3 Completion Criteria

**Stats:**
- [ ] Stats display on profile with all metrics
- [ ] Heatmap renders correctly
- [ ] Top artists show with durations
- [ ] Weekday pattern visualized
- [ ] Stats queries < 500ms (P95)

**Badges:**
- [ ] 20+ badge definitions implemented
- [ ] Daily cron awards badges
- [ ] Badge grid shows earned/locked states
- [ ] Tooltips show descriptions and criteria
- [ ] Badge earning creates activity item
- [ ] Cron processes all users in < 5 minutes

**Activity:**
- [ ] Personal feed shows all activity
- [ ] Profile shows last 5 items
- [ ] Global community feed works
- [ ] Pagination loads 20 items per page
- [ ] Privacy settings control visibility
- [ ] Each activity type renders correctly

**General:**
- [ ] All endpoints respond < 500ms (P95)
- [ ] Database migrations applied successfully
- [ ] No console errors
- [ ] All manual tests pass

### User Experience Goals

- Stats feel rich and insightful (discover patterns)
- Badges feel earned, not spammy (clear criteria)
- Activity feed feels alive without overwhelming
- Privacy controls feel obvious and trustworthy
- Images load fast (small file sizes)

### Technical Goals

- Stats queries < 200ms (P95) with proper indexes
- Badge calculation completes in < 5 minutes
- Activity feed supports 1000+ items without degradation
- Avatar generation < 3 seconds per upload
- Zero data loss during avatar replacement

## Open Questions

None — design approved and ready for implementation planning.
