# Artist Following & In-App Notifications

**Date:** 2026-05-11
**Status:** Approved, ready for implementation

## Goal

Let users follow artists and receive in-app notifications when: a new set is added for a followed artist, their annotation is approved, or their annotation is rejected. Notifications appear as a bell icon with badge in the top nav, opening a dropdown list.

---

## Data Layer

**Migration:** `migrations/0026_follows-and-notifications.sql`

```sql
CREATE TABLE artist_follows (
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, artist_id)
);
CREATE INDEX idx_artist_follows_artist ON artist_follows(artist_id);

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

**Notification types:** `'new_set'` | `'annotation_approved'` | `'annotation_rejected'`

Notifications are pre-rendered (title + body as plain strings) — the frontend never joins anything.

---

## API

### Follow routes (`worker/routes/follows.ts` — new file)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/artists/:id/follow` | required | Follow artist → `{ following: true }` |
| `DELETE` | `/api/artists/:id/follow` | required | Unfollow → `{ following: false }` |
| `GET` | `/api/artists/:id/follow` | required | Check status → `{ following: bool }` |

### Notification routes (`worker/routes/notifications.ts` — new file)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | required | Last 30 notifications, newest first, plus `unread_count` |
| `POST` | `/api/notifications/read-all` | required | Mark all as read → `{ ok: true }` |
| `POST` | `/api/notifications/:id/read` | required | Mark one as read → `{ ok: true }` |

`GET /api/notifications` response shape:
```json
{
  "data": {
    "notifications": [
      {
        "id": "...",
        "type": "new_set",
        "title": "John Summit added a new set",
        "body": "DC-10 Closing Party",
        "link": "/app/sets/abc123",
        "is_read": 0,
        "created_at": "2026-05-11T10:00:00Z"
      }
    ],
    "unread_count": 3
  },
  "ok": true
}
```

### Notification triggers (modifications to existing routes)

**New set trigger** — `worker/routes/admin-beta.ts`, `createSet` function:
After the set is saved and the Discord notification fires, add inside `ctx.waitUntil()`:
1. Query `set_artists` for all `artist_id` values linked to this set
2. For each artist, query `artist_follows` for all `user_id` followers
3. Bulk-insert one `notifications` row per follower:
   - `type`: `'new_set'`
   - `title`: `"${artist.name} added a new set"`
   - `body`: set title
   - `link`: `/app/sets/${set.id}`

**Annotation moderation trigger** — `worker/routes/admin-beta.ts`, `moderateAnnotation` function:
After the status update, add inside `ctx.waitUntil()` (non-blocking):
- If `action === 'approve'`: insert notification for `annotation.user_id`:
  - `type`: `'annotation_approved'`
  - `title`: `"Your annotation was approved"`
  - `body`: track title from the annotation
  - `link`: `/app/sets/${annotation.set_id}`
- If `action === 'reject'`: same but `type: 'annotation_rejected'`, `title: "Your annotation was rejected"`
- Skip if `annotation.user_id` is null (anonymous annotation)

Both triggers use `ctx.waitUntil()` — fire-and-forget, never block the response.

### Route registrations (`worker/index.ts`)

```ts
// Follow
router.post('/api/artists/:id/follow', withAuth(followArtist))
router.delete('/api/artists/:id/follow', withAuth(unfollowArtist))
router.get('/api/artists/:id/follow', withAuth(getFollowStatus))

// Notifications
router.get('/api/notifications', withAuth(getNotifications))
router.post('/api/notifications/read-all', withAuth(markAllNotificationsRead))
router.post('/api/notifications/:id/read', withAuth(markNotificationRead))
```

---

## Frontend

### New API helpers (`src/lib/api.ts`)

```ts
followArtist(id: string): Promise<{ data: { following: boolean } }>
unfollowArtist(id: string): Promise<{ data: { following: boolean } }>
getFollowStatus(id: string): Promise<{ data: { following: boolean } }>
getNotifications(): Promise<{ data: { notifications: Notification[]; unread_count: number } }>
markAllNotificationsRead(): Promise<{ ok: boolean }>
markNotificationRead(id: string): Promise<{ ok: boolean }>
```

Add `Notification` type to `src/lib/types.ts`:
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

### FollowButton component (`src/components/artists/FollowButton.tsx` — new file)

- Props: `artistId: string`
- On mount: calls `getFollowStatus(artistId)`, sets `following` state
- Not rendered when no session (check via `useSession()`)
- "Follow" state: outline `Button`, no icon
- "Following" state: accent `Button`, checkmark icon (SVG)
- On click: optimistic toggle, calls `followArtist` or `unfollowArtist`, reverts on error
- Loading state: button disabled during in-flight request

Placement: added in `ArtistPage.tsx` in the banner area, below the artist name/stats, alongside existing social links.

### Bell + dropdown (modifications to `src/components/layout/TopNav.tsx`)

**State added to TopNav:**
```ts
const [notifications, setNotifications] = useState<Notification[]>([])
const [unreadCount, setUnreadCount] = useState(0)
const [notifOpen, setNotifOpen] = useState(false)
```

**Polling:** `useEffect` that calls `getNotifications()` on mount and every 60 seconds (only when `session` exists). Updates `notifications` and `unreadCount`.

**Bell button:** Added to the right side of TopNav (before the avatar/user dropdown), only shown when session exists:
- SVG bell icon
- Red badge with `unreadCount` when > 0 (shows `9+` if > 9)
- Click: toggles `notifOpen`, calls `markAllNotificationsRead()` when opening (clears badge)

**Dropdown:** Glass blur panel (same style as existing user dropdown in TopNav), appears below bell:
- Header: "Notifications" label
- Up to 10 most recent notifications from `notifications` state
- Each row: type icon (🎧 / ✅ / ✗), title, body (truncated), relative time, unread dot if `is_read === 0`
- Each row is a `<Link>` to `notification.link`, closes dropdown on click, calls `markNotificationRead(id)`
- Empty state: "No notifications yet" centered in the panel
- Closes on outside click (same pattern as existing user dropdown)

---

## Edge Cases

| Case | Behaviour |
|---|---|
| Set added with no linked artists | No notifications sent (no rows in `set_artists`) |
| Anonymous annotation moderated | Skip notification (`user_id` is null) |
| User follows artist they already follow | `INSERT OR IGNORE` — no error |
| `unreadCount` > 9 | Badge shows `9+` |
| Notifications fetch fails | Silently fails — no badge shown, no error UI |
| Artist deleted | `artist_follows` rows cascade-deleted |

---

## Files Changed

| File | Change |
|---|---|
| `migrations/0026_follows-and-notifications.sql` | Create |
| `worker/routes/follows.ts` | Create |
| `worker/routes/notifications.ts` | Create |
| `worker/routes/admin-beta.ts` | Add notification triggers to `createSet` and `moderateAnnotation` |
| `worker/index.ts` | Register 6 new routes |
| `src/lib/types.ts` | Add `Notification` interface |
| `src/lib/api.ts` | Add 6 new API helpers |
| `src/components/artists/FollowButton.tsx` | Create |
| `src/pages/ArtistPage.tsx` | Add `FollowButton` to banner |
| `src/components/layout/TopNav.tsx` | Add bell, dropdown, polling |
