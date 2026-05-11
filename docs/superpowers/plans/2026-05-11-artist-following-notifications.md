# Artist Following & In-App Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users follow artists and receive in-app notifications (new set added, annotation approved/rejected) via a bell icon + dropdown in the top nav.

**Architecture:** New D1 migration adds `artist_follows` and `notifications` tables. Two new worker route files handle the follow and notification APIs. Notification triggers are injected into `createSet` and `moderateAnnotation` via `ctx.waitUntil`. The frontend adds a `FollowButton` component on the artist page and a bell+dropdown to TopNav with 60-second polling.

**Tech Stack:** Cloudflare Workers + D1 (SQLite), React 19, Tailwind CSS 4, `nanoid` for IDs, existing `withAuth` middleware, existing `json`/`errorResponse` router helpers.

---

## File Map

| File | Change |
|------|--------|
| `migrations/0026_follows-and-notifications.sql` | Create — DB tables |
| `worker/routes/follows.ts` | Create — follow/unfollow/status handlers |
| `worker/routes/notifications.ts` | Create — fetch/read handlers |
| `worker/routes/admin-beta.ts` | Modify — add notification triggers |
| `worker/index.ts` | Modify — register 6 new routes + imports |
| `src/lib/types.ts` | Modify — add `Notification` interface |
| `src/lib/api.ts` | Modify — add 6 new API helpers |
| `src/components/artists/FollowButton.tsx` | Create — follow toggle button |
| `src/pages/ArtistPage.tsx` | Modify — add FollowButton to banner |
| `src/components/layout/TopNav.tsx` | Modify — add bell, dropdown, polling |

---

## Task 1: Database migration

**Files:**
- Create: `migrations/0026_follows-and-notifications.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Artist follows: user follows an artist to get notifications
CREATE TABLE artist_follows (
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, artist_id)
);
CREATE INDEX idx_artist_follows_artist ON artist_follows(artist_id);
CREATE INDEX idx_artist_follows_user ON artist_follows(user_id);

-- In-app notifications (pre-rendered title+body, no joins needed at read time)
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at);
```

- [ ] **Step 2: Apply the migration locally**

```bash
bunx wrangler d1 migrations apply zephyron-db --local
```
Expected output: `✅  Applied 1 migration` (or similar success message).

- [ ] **Step 3: Commit**

```bash
git add migrations/0026_follows-and-notifications.sql
git commit -m "feat(follows): add artist_follows and notifications tables"
```

---

## Task 2: Follow API routes

**Files:**
- Create: `worker/routes/follows.ts`

The follow routes follow the exact same pattern as `worker/routes/songs.ts` `likeSong`/`unlikeSong`. The `user` object is the 5th argument provided by `withAuth`.

- [ ] **Step 1: Create `worker/routes/follows.ts`**

```ts
import { json, errorResponse } from '../lib/router'

// POST /api/artists/:id/follow
export async function followArtist(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>,
  user: { id: string }
): Promise<Response> {
  const { id: artistId } = params

  const artist = await env.DB.prepare('SELECT id FROM artists WHERE id = ?')
    .bind(artistId)
    .first()
  if (!artist) return errorResponse('Artist not found', 404)

  await env.DB.prepare(
    'INSERT OR IGNORE INTO artist_follows (user_id, artist_id) VALUES (?, ?)'
  ).bind(user.id, artistId).run()

  return json({ data: { following: true }, ok: true })
}

// DELETE /api/artists/:id/follow
export async function unfollowArtist(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>,
  user: { id: string }
): Promise<Response> {
  const { id: artistId } = params

  await env.DB.prepare(
    'DELETE FROM artist_follows WHERE user_id = ? AND artist_id = ?'
  ).bind(user.id, artistId).run()

  return json({ data: { following: false }, ok: true })
}

// GET /api/artists/:id/follow
export async function getFollowStatus(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>,
  user: { id: string }
): Promise<Response> {
  const { id: artistId } = params

  const row = await env.DB.prepare(
    'SELECT 1 FROM artist_follows WHERE user_id = ? AND artist_id = ?'
  ).bind(user.id, artistId).first()

  return json({ data: { following: !!row }, ok: true })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
bun run typecheck
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add worker/routes/follows.ts
git commit -m "feat(follows): add follow/unfollow/status route handlers"
```

---

## Task 3: Notification API routes

**Files:**
- Create: `worker/routes/notifications.ts`

- [ ] **Step 1: Create `worker/routes/notifications.ts`**

```ts
import { json } from '../lib/router'

// GET /api/notifications — last 30, newest first, plus unread_count
export async function getNotifications(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>,
  user: { id: string }
): Promise<Response> {
  const [rows, countRow] = await Promise.all([
    env.DB.prepare(
      'SELECT id, type, title, body, link, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30'
    ).bind(user.id).all(),
    env.DB.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
    ).bind(user.id).first<{ count: number }>(),
  ])

  return json({
    data: {
      notifications: rows.results,
      unread_count: countRow?.count ?? 0,
    },
    ok: true,
  })
}

// POST /api/notifications/read-all
export async function markAllNotificationsRead(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>,
  user: { id: string }
): Promise<Response> {
  await env.DB.prepare(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0'
  ).bind(user.id).run()

  return json({ ok: true })
}

// POST /api/notifications/:id/read
export async function markNotificationRead(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>,
  user: { id: string }
): Promise<Response> {
  await env.DB.prepare(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
  ).bind(params.id, user.id).run()

  return json({ ok: true })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
bun run typecheck
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add worker/routes/notifications.ts
git commit -m "feat(notifications): add get/read notification route handlers"
```

---

## Task 4: Register routes + notification triggers

**Files:**
- Modify: `worker/index.ts`
- Modify: `worker/routes/admin-beta.ts`

### Part A: Register routes in `worker/index.ts`

- [ ] **Step 1: Add imports at the top of `worker/index.ts`**

After the existing imports (around line 35–45 where other route imports are), add:

```ts
import { followArtist, unfollowArtist, getFollowStatus } from './routes/follows'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from './routes/notifications'
```

- [ ] **Step 2: Register the 6 new routes**

Find the songs like/unlike routes block (around line 118–121):
```ts
router.post('/api/songs/:id/like', withAuth(likeSong))
router.delete('/api/songs/:id/like', withAuth(unlikeSong))
router.get('/api/songs/:id/like-status', withAuth(getSongLikeStatus))
router.get('/api/users/me/liked-songs', withAuth(getLikedSongs))
```

Add after it:
```ts
// Artist follows (authenticated)
router.post('/api/artists/:id/follow', withAuth(followArtist))
router.delete('/api/artists/:id/follow', withAuth(unfollowArtist))
router.get('/api/artists/:id/follow', withAuth(getFollowStatus))

// Notifications (authenticated)
router.get('/api/notifications', withAuth(getNotifications))
router.post('/api/notifications/read-all', withAuth(markAllNotificationsRead))
router.post('/api/notifications/:id/read', withAuth(markNotificationRead))
```

### Part B: Add notification triggers to `admin-beta.ts`

- [ ] **Step 3: Add `nanoid` import to `admin-beta.ts` if not already present**

Check line 3 of `worker/routes/admin-beta.ts`. It already has `import { nanoid } from 'nanoid'`. Nothing to add.

- [ ] **Step 4: Add new-set notification trigger in `createSet`**

In `worker/routes/admin-beta.ts`, find the `_ctx.waitUntil` block inside `createSet` (around line 351). It currently ends with:
```ts
    } catch (err) {
      console.error('[createSet] Discord notification failed (non-blocking):', err)
    }
  })())

  return json({ data: { id }, ok: true }, 201)
```

Replace the closing of that block to add the follower notification logic **inside the same `waitUntil`**, right after the Discord try/catch:

```ts
    } catch (err) {
      console.error('[createSet] Discord notification failed (non-blocking):', err)
    }

    // Notify followers of all artists linked to this set
    try {
      const setArtistRows = await env.DB.prepare(
        'SELECT artist_id FROM set_artists WHERE set_id = ?'
      ).bind(id).all<{ artist_id: string }>()

      for (const { artist_id } of setArtistRows.results) {
        const artist = await env.DB.prepare('SELECT name FROM artists WHERE id = ?')
          .bind(artist_id).first<{ name: string }>()
        if (!artist) continue

        const followers = await env.DB.prepare(
          'SELECT user_id FROM artist_follows WHERE artist_id = ?'
        ).bind(artist_id).all<{ user_id: string }>()

        if (followers.results.length === 0) continue

        const setTitle = await env.DB.prepare('SELECT title FROM sets WHERE id = ?')
          .bind(id).first<{ title: string }>()

        const inserts = followers.results.map(({ user_id }) =>
          env.DB.prepare(
            'INSERT INTO notifications (id, user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?, ?)'
          ).bind(
            nanoid(),
            user_id,
            'new_set',
            `${artist.name} added a new set`,
            setTitle?.title ?? 'New set',
            `/app/sets/${id}`
          )
        )
        await env.DB.batch(inserts)
      }
    } catch (err) {
      console.error('[createSet] Follower notifications failed (non-blocking):', err)
    }
  })())

  return json({ data: { id }, ok: true }, 201)
```

- [ ] **Step 5: Add annotation moderation notification trigger in `moderateAnnotation`**

In `worker/routes/admin-beta.ts`, find `moderateAnnotation`. It currently ends with:
```ts
  return json({ ok: true, action: newStatus })
}
```

Replace that final return with:
```ts
  // Notify the annotator (non-blocking, skip if anonymous)
  if (annotation.user_id) {
    _ctx.waitUntil((async () => {
      try {
        await env.DB.prepare(
          'INSERT INTO notifications (id, user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(
          nanoid(),
          annotation.user_id,
          body.action === 'approve' ? 'annotation_approved' : 'annotation_rejected',
          body.action === 'approve' ? 'Your annotation was approved' : 'Your annotation was rejected',
          annotation.track_title,
          `/app/sets/${annotation.set_id}`
        ).run()
      } catch (err) {
        console.error('[moderateAnnotation] Notification failed (non-blocking):', err)
      }
    })())
  }

  return json({ ok: true, action: newStatus })
}
```

Note: `moderateAnnotation` currently receives `_ctx: ExecutionContext` — rename it to `ctx` to use `ctx.waitUntil`. Find the function signature:
```ts
export async function moderateAnnotation(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
```
Change `_ctx` to `ctx`:
```ts
export async function moderateAnnotation(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
bun run typecheck
```
Expected: exits 0.

- [ ] **Step 7: Run tests**

```bash
bun test
```
Expected: 17 pass, 0 fail.

- [ ] **Step 8: Commit**

```bash
git add worker/index.ts worker/routes/admin-beta.ts
git commit -m "feat(follows): register routes, add new-set and annotation notification triggers"
```

---

## Task 5: Frontend types + API helpers

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Add `Notification` interface to `src/lib/types.ts`**

At the end of `src/lib/types.ts`, add:

```ts
export interface Notification {
  id: string
  type: 'new_set' | 'annotation_approved' | 'annotation_rejected'
  title: string
  body: string
  link: string | null
  is_read: number
  created_at: string
}
```

- [ ] **Step 2: Add 6 API helpers to `src/lib/api.ts`**

Add at the end of `src/lib/api.ts` (after the last export):

```ts
// ── Artist follows ──────────────────────────────────────────────────────────

export async function followArtist(artistId: string): Promise<{ data: { following: boolean }; ok: boolean }> {
  return fetchApi(`/artists/${artistId}/follow`, { method: 'POST' })
}

export async function unfollowArtist(artistId: string): Promise<{ data: { following: boolean }; ok: boolean }> {
  return fetchApi(`/artists/${artistId}/follow`, { method: 'DELETE' })
}

export async function getFollowStatus(artistId: string): Promise<{ data: { following: boolean }; ok: boolean }> {
  return fetchApi(`/artists/${artistId}/follow`)
}

// ── Notifications ────────────────────────────────────────────────────────────

export async function getNotifications(): Promise<{ data: { notifications: import('./types').Notification[]; unread_count: number }; ok: boolean }> {
  return fetchApi('/notifications')
}

export async function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  return fetchApi('/notifications/read-all', { method: 'POST' })
}

export async function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  return fetchApi(`/notifications/${id}/read`, { method: 'POST' })
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
bun run typecheck
```
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/api.ts
git commit -m "feat(follows): add Notification type and follow/notification API helpers"
```

---

## Task 6: FollowButton component + ArtistPage integration

**Files:**
- Create: `src/components/artists/FollowButton.tsx`
- Modify: `src/pages/ArtistPage.tsx`

- [ ] **Step 1: Create `src/components/artists/FollowButton.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { useSession } from '../../lib/auth-client'
import { followArtist, unfollowArtist, getFollowStatus } from '../../lib/api'
import { Button } from '../ui/Button'

interface Props {
  artistId: string
}

export function FollowButton({ artistId }: Props) {
  const { data: session } = useSession()
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [inFlight, setInFlight] = useState(false)

  useEffect(() => {
    if (!session) { setLoading(false); return }
    getFollowStatus(artistId)
      .then((res) => setFollowing(res.data.following))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [artistId, session])

  if (!session || loading) return null

  const handleToggle = async () => {
    if (inFlight) return
    const prev = following
    setFollowing(!prev)
    setInFlight(true)
    try {
      if (prev) {
        await unfollowArtist(artistId)
      } else {
        await followArtist(artistId)
      }
    } catch {
      setFollowing(prev)
    } finally {
      setInFlight(false)
    }
  }

  return (
    <Button
      variant={following ? 'primary' : 'secondary'}
      size="sm"
      onClick={handleToggle}
      disabled={inFlight}
    >
      {following ? (
        <>
          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Following
        </>
      ) : (
        'Follow'
      )}
    </Button>
  )
}
```

- [ ] **Step 2: Add `FollowButton` to `ArtistPage.tsx`**

In `src/pages/ArtistPage.tsx`, add the import at the top with other component imports:
```tsx
import { FollowButton } from '../components/artists/FollowButton'
```

Find the block in `ArtistPage` that contains the Edit button (admin only). It looks like:
```tsx
            {isAdmin && (
              <div className="mt-3">
                <Link to={`/app/artists/${id}?edit=1`}>
                  <Button variant="secondary" size="sm">
                    ...
                    Edit
                  </Button>
                </Link>
              </div>
            )}
```

Add `<FollowButton>` right before the `{isAdmin && ...}` block:

```tsx
            <div className="mt-3">
              <FollowButton artistId={artist.id} />
            </div>
            {isAdmin && (
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
bun run typecheck
```
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/artists/FollowButton.tsx src/pages/ArtistPage.tsx
git commit -m "feat(follows): add FollowButton component and wire into ArtistPage"
```

---

## Task 7: Bell icon + notification dropdown in TopNav

**Files:**
- Modify: `src/components/layout/TopNav.tsx`

The TopNav already has a user dropdown with glass blur styling. The bell + notifications dropdown follows the same pattern: `useRef` for outside-click, `useState` for open/close, exit animation. Reference `showUserMenu`/`menuRef`/`menuExiting` as the pattern to follow.

- [ ] **Step 1: Add imports at the top of `TopNav.tsx`**

The file already imports `useSession`, `useState`, `useRef`, `useEffect` from React and `Link` from react-router. Add `Notification` type and API helpers. Find the existing import from `../../lib/api` (or add one):

```tsx
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../lib/api'
import type { Notification } from '../../lib/types'
```

- [ ] **Step 2: Add notification state inside the `TopNav` component**

Find the existing state declarations near the top of `TopNav` (after `const { data: session } = useSession()`):
```tsx
const [showUserMenu, setShowUserMenu] = useState(false);
const [menuExiting, setMenuExiting] = useState(false);
```

Add after them:
```tsx
const [notifications, setNotifications] = useState<Notification[]>([])
const [unreadCount, setUnreadCount] = useState(0)
const [showNotifMenu, setShowNotifMenu] = useState(false)
const [notifExiting, setNotifExiting] = useState(false)
const notifRef = useRef<HTMLDivElement>(null)
```

- [ ] **Step 3: Add notification polling useEffect**

Find the block of `useEffect` calls in `TopNav`. Add a new one after the existing ones:

```tsx
// Fetch notifications on mount and poll every 60s
useEffect(() => {
  if (!session) return
  const fetchNotifs = () => {
    getNotifications()
      .then((res) => {
        setNotifications(res.data.notifications)
        setUnreadCount(res.data.unread_count)
      })
      .catch(() => {})
  }
  fetchNotifs()
  const interval = setInterval(fetchNotifs, 60_000)
  return () => clearInterval(interval)
}, [session])
```

- [ ] **Step 4: Add outside-click handler for notification dropdown**

Find the existing `useEffect` that handles closing the user menu on outside click. It references `menuRef`. Add a similar one for `notifRef`:

```tsx
useEffect(() => {
  if (!showNotifMenu) return
  const handler = (e: MouseEvent) => {
    if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
      setNotifExiting(true)
      setTimeout(() => { setShowNotifMenu(false); setNotifExiting(false) }, 150)
    }
  }
  document.addEventListener('mousedown', handler)
  return () => document.removeEventListener('mousedown', handler)
}, [showNotifMenu])
```

- [ ] **Step 5: Add the bell button + dropdown to the TopNav JSX**

Find the `{/* User dropdown */}` comment in the TopNav JSX. Add the bell button **immediately before** it:

```tsx
{/* Notification bell */}
{session?.user && (
  <div className="relative" ref={notifRef}>
    <button
      type="button"
      onClick={() => {
        if (showNotifMenu) {
          setNotifExiting(true)
          setTimeout(() => { setShowNotifMenu(false); setNotifExiting(false) }, 150)
        } else {
          setShowNotifMenu(true)
          if (unreadCount > 0) {
            markAllNotificationsRead()
              .then(() => setUnreadCount(0))
              .catch(() => {})
          }
        }
      }}
      className="relative flex items-center justify-center w-9 h-9 rounded-full transition-colors"
      style={{ color: 'hsl(var(--c2))' }}
      aria-label="Notifications"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
      </svg>
      {unreadCount > 0 && (
        <span
          className="absolute top-0.5 right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
          style={{ background: 'hsl(0 70% 55%)' }}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>

    {/* Notification dropdown */}
    {(showNotifMenu || notifExiting) && (
      <div
        className="absolute right-0 top-full mt-2 w-[320px] z-50 rounded-[var(--card-radius)] overflow-hidden"
        style={{
          background: 'hsl(var(--b5) / 0.97)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 35px rgba(0,0,0,0.35), inset 0 0 0 1px hsl(var(--b4) / 0.25)',
          animation: notifExiting
            ? 'menuExit 0.15s var(--ease-out-custom) forwards'
            : 'menuEnter 0.18s var(--ease-out-custom) forwards',
        }}
      >
        <div className="px-3 py-2.5" style={{ borderBottom: '1px solid hsl(var(--b4) / 0.3)' }}>
          <p className="text-xs font-mono uppercase tracking-wider" style={{ color: 'hsl(var(--c3))' }}>
            Notifications
          </p>
        </div>

        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>No notifications yet</p>
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.slice(0, 10).map((n) => (
              <Link
                key={n.id}
                to={n.link ?? '/app'}
                onClick={() => {
                  markNotificationRead(n.id).catch(() => {})
                  setNotifExiting(true)
                  setTimeout(() => { setShowNotifMenu(false); setNotifExiting(false) }, 150)
                }}
                className="flex items-start gap-3 px-3 py-2.5 no-underline transition-colors"
                style={{
                  background: n.is_read === 0 ? 'hsl(var(--h3) / 0.06)' : 'transparent',
                  borderBottom: '1px solid hsl(var(--b4) / 0.15)',
                }}
              >
                <span className="text-base mt-0.5 shrink-0">
                  {n.type === 'new_set' ? '🎧' : n.type === 'annotation_approved' ? '✅' : '✗'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--c1))' }}>
                    {n.title}
                  </p>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'hsl(var(--c2))' }}>
                    {n.body}
                  </p>
                  <p className="text-[10px] mt-1 font-mono" style={{ color: 'hsl(var(--c3))' }}>
                    {new Date(n.created_at).toLocaleDateString()}
                  </p>
                </div>
                {n.is_read === 0 && (
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'hsl(var(--h3))' }} />
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
)}

{/* User dropdown */}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
bun run typecheck
```
Expected: exits 0.

- [ ] **Step 7: Run full test suite**

```bash
bun test
```
Expected: 17 pass, 0 fail.

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/TopNav.tsx
git commit -m "feat(notifications): add bell icon, notification dropdown, and polling to TopNav"
```
