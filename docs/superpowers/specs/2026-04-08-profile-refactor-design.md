# Profile System Refactor — Phase 1: Foundation

**Date:** 2026-04-08  
**Version:** 0.4.0-alpha  
**Status:** Design Approved

## Overview

Refactor the profile system to remove the reputation/tier system and establish the foundation for rich community profile features. This is Phase 1 of a 3-phase rollout that prioritizes profile personalization and basic privacy controls.

### Three-Phase Roadmap

**Phase 1 - Profile Foundation** (this spec)
- Remove all reputation system elements
- Add profile picture upload (R2 + Workers proxy)
- Add bio field (160 chars)
- Add display name editing
- Add tabbed interface structure
- Add basic privacy controls (profile visibility toggle)

**Phase 2 - Analytics & Wrapped** (future spec)
- Rich listening statistics (top artists, genres, patterns)
- Monthly summaries
- Annual Wrapped with static image generation
- Stats visualization components

**Phase 3 - Social Features** (future spec)
- Comprehensive badge system
- Full activity feed
- Public profile pages (`/profile/:userId`)
- Granular privacy controls
- Activity notifications

## Goals

1. **Remove reputation complexity** — Eliminate tier system, reputation scores, and earning mechanics that add cognitive overhead
2. **Enable personalization** — Let users express themselves through avatars, bios, and display names
3. **Establish structure** — Create tabbed interface that can accommodate future analytics and social features
4. **Respect privacy** — Give users control over profile visibility
5. **Maintain simplicity** — Focus on core personalization features without overbuilding

## Architecture

### Frontend Changes

**Refactored Components:**
- `ProfilePage.tsx` — Convert to tabbed structure with 4 tabs: Overview, Activity (placeholder), Playlists, About
- Remove all reputation-related UI (tier badges, points, earning guide, progress bars)
- Replace stats grid: show Playlists, Liked Songs, Sets Listened (remove Reputation, Annotations, Votes)

**New Components:**
- `ProfileHeader.tsx` — Avatar + display name + bio + role badge
- `ProfilePictureUpload.tsx` — Modal dialog for avatar upload with preview
- `BioEditor.tsx` — Inline 160-char text editor with auto-save
- `DisplayNameEditor.tsx` — Inline display name editor with validation
- `ProfileSettingsTab.tsx` — New tab under `/app/settings/profile`

**State Management:**
- Expand Zustand `themeStore` to `userPreferencesStore` (or create new store)
- Store: `is_profile_public` boolean (synced with backend)

### Backend Changes

**New API Endpoints:**

**`POST /api/profile/avatar/upload`**
- Accepts multipart/form-data (max 10MB)
- Validates file type (JPG/PNG/WebP/GIF) and size
- Resizes to 800x800px square (smart crop from any aspect ratio)
- Converts to WebP (quality 85%)
- Uploads to R2 bucket: `zephyron-avatars/{userId}-{timestamp}.webp`
- Saves `avatar_url` to D1 user table
- Returns `{ success: true, avatar_url: string }`

**`PATCH /api/profile/settings`**
- Updates user profile fields: `display_name`, `bio`, `is_profile_public`
- Validates display_name: 3-50 chars, alphanumeric + spaces + basic punctuation
- Validates bio: max 160 chars, strips HTML
- Returns updated user object

**`GET /api/profile/:userId`** (Phase 1 stub)
- Returns public profile data when `is_profile_public = 1`
- Returns `{ error: 'PROFILE_PRIVATE' }` when private
- Phase 1: Basic implementation, full features in Phase 3

**Database Migration:**

New file: `migrations/0019_profile-enhancements.sql`

```sql
-- Add profile fields to user table
ALTER TABLE user ADD COLUMN bio TEXT DEFAULT NULL;
ALTER TABLE user ADD COLUMN avatar_url TEXT DEFAULT NULL;
ALTER TABLE user ADD COLUMN is_profile_public INTEGER DEFAULT 0;

-- Index for public profile lookups
CREATE INDEX IF NOT EXISTS idx_user_public_profiles 
  ON user(is_profile_public) 
  WHERE is_profile_public = 1;
```

**R2 Storage:**
- Bucket: `zephyron-avatars` (or use existing assets bucket with `/avatars/` prefix)
- Naming convention: `{userId}-{timestamp}.webp`
- Access: Public read (avatars visible to all users, regardless of profile privacy)
- Image processing: Workers Image Resizing API or sharp library

### Data Flow

**Profile Picture Upload:**
1. User clicks "Edit Profile" → Settings → Profile tab
2. Clicks avatar → Opens `ProfilePictureUpload` modal
3. Selects file (drag-drop or browse)
4. Frontend validates type/size, shows preview
5. Click Save → POST to `/api/profile/avatar/upload`
6. Workers validates, resizes, uploads to R2, saves URL to D1
7. Returns new `avatar_url` → frontend updates optimistically
8. Toast: "Profile picture updated" (3s)

**Display Name / Bio Edit:**
1. User clicks inline edit button
2. Component switches to edit mode (input field)
3. User types → character counter updates (bio only)
4. On blur (bio) or Save button (display_name) → PATCH to `/api/profile/settings`
5. Backend validates, updates D1, returns updated user
6. Frontend updates session user object
7. Toast: "Display name updated" (3s) or silent (bio auto-save)

**Privacy Toggle:**
1. User toggles "Make profile public" checkbox in Settings
2. Frontend immediately updates state (optimistic)
3. PATCH to `/api/profile/settings` with `is_profile_public: true/false`
4. Backend updates D1
5. Toast: "Privacy settings updated" (3s)

## Components & UI Structure

### ProfilePage.tsx — Tab Structure

```
<div className="px-6 lg:px-10 py-6">
  <ProfileHeader 
    user={user} 
    isOwnProfile={true}
    onEditClick={() => navigate('/app/settings/profile')}
  />
  
  <Tabs defaultTab="overview" className="mt-6">
    <TabList>
      <Tab id="overview">Overview</Tab>
      <Tab id="activity">Activity</Tab>
      <Tab id="playlists">Playlists</Tab>
      <Tab id="about">About</Tab>
    </TabList>
    
    <TabPanel id="overview">
      <StatsGrid>
        <StatCard value={playlistCount} label="Playlists" />
        <StatCard value={likedSongsCount} label="Liked Songs" />
        <StatCard value={setsListenedCount} label="Sets Listened" />
      </StatsGrid>
      <RecentActivity limit={5} showViewAll={true} />
    </TabPanel>
    
    <TabPanel id="activity">
      <EmptyState 
        title="Activity feed coming soon"
        description="Full activity feed will be available in Phase 3"
      />
    </TabPanel>
    
    <TabPanel id="playlists">
      <PlaylistGrid playlists={playlists} />
    </TabPanel>
    
    <TabPanel id="about">
      <AboutSection user={user} isOwnProfile={isOwnProfile} />
    </TabPanel>
  </Tabs>
</div>
```

### ProfileHeader.tsx

**Props:**
```typescript
interface ProfileHeaderProps {
  user: User
  isOwnProfile: boolean
  onEditClick?: () => void
}
```

**Layout:**
```
┌─────────────────────────────────────────────┐
│ [Avatar]  Display Name                      │
│           Bio text (160 chars max)          │
│           [role badge]                      │
│           [Edit Profile button] (own only)  │
└─────────────────────────────────────────────┘
```

**Avatar display:**
- Size: 80x80px on mobile, 96x96px on desktop
- Border radius: `var(--card-radius)` (12px)
- Fallback: Colored circle with initial letter (if no avatar_url)
- Clickable when `isOwnProfile = true` (opens upload modal)

**Bio display:**
- Single line, truncate with ellipsis if too long
- Color: `hsl(var(--c2))` (muted)
- Font size: 14px

### ProfilePictureUpload.tsx

**Modal dialog:**
- Title: "Upload Profile Picture"
- File input: Drag-drop zone + "Choose file" button
- Preview: Shows selected image with square crop indicator
- Character limit: "Max 10MB • JPG, PNG, WebP, GIF"
- Upload progress bar (shown during upload)
- Buttons: Cancel (ghost) + Save (primary, disabled until file selected)

**Validation feedback:**
- "File must be under 10MB" (red text)
- "Only images allowed" (red text)
- Success: Close modal + update avatar immediately

### BioEditor.tsx

**Inline editing component:**
- Display mode: Shows bio text + edit icon button
- Edit mode: Single-line text input with character counter
- Counter: "45 / 160" (red when > 160)
- Auto-save: Debounced 500ms on blur
- Placeholder: "Describe your music taste..."

### DisplayNameEditor.tsx

**Inline editing component:**
- Display mode: Shows display name + edit icon button
- Edit mode: Text input + Save/Cancel buttons
- Validation: 3-50 chars, alphanumeric + spaces + basic punctuation
- Shows error inline: "Display name must be at least 3 characters"
- Save button disabled when invalid

### ProfileSettingsTab.tsx

**Located at:** `/app/settings/profile`

**Layout:**
```
Profile Settings
────────────────

Profile Picture
[Avatar preview]
[Change Picture button]

Display Name
[DisplayNameEditor component]

Bio
[BioEditor component]

Privacy
[ ] Make my profile public
    When enabled, other users can view your profile
```

## Data Model

### User Type (worker/types.ts)

```typescript
export interface User {
  id: string
  email: string | null
  name: string  // Display name
  avatar_url: string | null
  bio: string | null
  is_profile_public: boolean
  role: 'listener' | 'annotator' | 'curator' | 'admin'
  created_at: string
  
  // Deprecated (keep for now, remove in Phase 3):
  reputation?: number
  total_annotations?: number
  total_votes?: number
}

export interface PublicUser {
  id: string
  name: string
  avatar_url: string | null
  bio: string | null
  role: string
  created_at: string
  // Email excluded for privacy
}
```

### API Request/Response Types

```typescript
// POST /api/profile/avatar/upload
interface UploadAvatarRequest {
  file: File  // multipart/form-data
}

interface UploadAvatarResponse {
  success: true
  avatar_url: string
}

interface UploadAvatarError {
  error: 'NO_FILE' | 'INVALID_FORMAT' | 'FILE_TOO_LARGE' | 'CORRUPT_IMAGE' | 'UPLOAD_FAILED'
  message?: string
}

// PATCH /api/profile/settings
interface UpdateProfileSettingsRequest {
  display_name?: string
  bio?: string
  is_profile_public?: boolean
}

interface UpdateProfileSettingsResponse {
  success: true
  user: User
}

interface UpdateProfileSettingsError {
  error: 'DISPLAY_NAME_TOO_SHORT' | 'DISPLAY_NAME_TOO_LONG' | 'DISPLAY_NAME_INVALID' | 'DISPLAY_NAME_TAKEN' | 'BIO_TOO_LONG'
  message?: string
}

// GET /api/profile/:userId
interface GetPublicProfileResponse {
  user: PublicUser
}

interface GetPublicProfileError {
  error: 'PROFILE_PRIVATE' | 'USER_NOT_FOUND'
}
```

## Reputation System Removal

### Elements to Remove from ProfilePage.tsx

**1. Tier calculation logic (lines 32-40):**
```typescript
// DELETE:
const reputation = user.reputation || 0
const annotations = user.totalAnnotations || user.total_annotations || 0
const votes = user.totalVotes || user.total_votes || 0

const tier =
  reputation >= 500 ? { name: 'Expert', hue: 'var(--h3)' }
    : reputation >= 100 ? { name: 'Contributor', hue: '40, 80%, 55%' }
    : reputation >= 10 ? { name: 'Active', hue: 'var(--c1)' }
    : { name: 'Newcomer', hue: 'var(--c3)' }
```

**2. Tier badge and reputation points (lines 70-74):**
```typescript
// DELETE:
<Badge variant="accent">{user.role || 'user'}</Badge>
<span className="text-xs font-[var(--font-weight-medium)]" style={{ color: `hsl(${tier.hue})` }}>{tier.name}</span>
<span className="text-xs font-mono" style={{ color: 'hsl(var(--c3))' }}>·</span>
<span className="text-xs font-mono" style={{ color: 'hsl(var(--h3))' }}>{reputation} pts</span>
```

**3. Stats grid (lines 80-94) — replace:**
```typescript
// BEFORE:
{ value: reputation, label: 'Reputation', accent: true }
{ value: annotations, label: 'Annotations', accent: false }
{ value: votes, label: 'Votes', accent: false }
{ value: recentCount, label: 'Listened', accent: false }

// AFTER:
{ value: playlistCount, label: 'Playlists', accent: false }
{ value: likedSongsCount, label: 'Liked Songs', accent: false }
{ value: recentCount, label: 'Sets Listened', accent: false }
```

**4. Reputation guide card (lines 96-136):**
```typescript
// DELETE ENTIRE CARD:
<div className="card">
  <h3>Reputation</h3>
  <p>Earn reputation by contributing...</p>
  {/* earning rules, tier progress bar, etc */}
</div>
```

### Database Fields (DO NOT DROP YET)

Keep `reputation`, `total_annotations`, `total_votes` columns in database for now:
- Prevents data loss
- Allows rollback if needed
- Mark as deprecated in types
- Consider dropping in Phase 3 if truly unused

### Visual Result

**Before (current):**
- Avatar with initial
- Display name + email
- Role badge + Tier badge + Reputation points
- Stats: Reputation, Annotations, Votes, Listened
- Large "Reputation" guide card with earning rules

**After (Phase 1):**
- Avatar (uploaded image or initial)
- Display name (editable)
- Bio (one line, 160 chars)
- Role badge only
- Stats: Playlists, Liked Songs, Sets Listened
- No reputation elements anywhere

## Error Handling & Validation

### Frontend Validation

**Profile Picture Upload:**
- File type: Check mime type before upload (image/jpeg, image/png, image/webp, image/gif)
- File size: Check `file.size < 10 * 1024 * 1024` (10MB)
- Show inline errors in modal: "File must be under 10MB", "Only images allowed"
- Loading state: Disable save button, show progress bar during upload
- Success toast: "Profile picture updated" (3s, success variant)
- Error toast: Show specific error message (7s, error variant)

**Bio Editor:**
- Character count: `bio.length` vs 160, show counter "45 / 160"
- Counter turns red when > 160
- Disable save when over limit
- Auto-save on blur (debounced 500ms)
- Success: Silent (no toast, just updates)
- Error toast: "Failed to save bio" (7s)

**Display Name Editor:**
- Min length: 3 chars — show inline error "Display name must be at least 3 characters"
- Max length: 50 chars — show inline error "Display name must be less than 50 characters"
- Pattern: `/^[\w\s\-'.]+$/` — show "Display name contains invalid characters"
- Uniqueness: Backend validates, returns error if taken
- Success toast: "Display name updated" (3s)
- Error toast: "Display name already taken" (7s) or other specific error

**Privacy Toggle:**
- No frontend validation needed
- Optimistic UI: Update immediately, revert on error
- Success toast: "Privacy settings updated" (3s)
- Error toast: "Failed to update privacy settings" (7s)

### Backend Validation

**POST /api/profile/avatar/upload — Validation Order:**
```typescript
1. Check authentication (return 401 if not authenticated)
2. Validate file exists in request (return 400 'NO_FILE')
3. Check mime type starts with 'image/' (return 400 'INVALID_FORMAT')
4. Check file size < 10MB (return 400 'FILE_TOO_LARGE')
5. Try image processing (catch errors → 400 'CORRUPT_IMAGE')
6. Upload to R2 (with retry logic, catch → 500 'UPLOAD_FAILED')
7. Save avatar_url to database (with transaction)
8. Return success with new avatar_url
```

**Error Responses:**
```typescript
{ error: 'NO_FILE', message: 'No file provided' }
{ error: 'INVALID_FORMAT', message: 'Only JPG, PNG, WebP, GIF allowed' }
{ error: 'FILE_TOO_LARGE', message: 'Maximum file size is 10MB' }
{ error: 'CORRUPT_IMAGE', message: 'Unable to process image' }
{ error: 'UPLOAD_FAILED', message: 'Failed to upload to storage' }
```

**PATCH /api/profile/settings — Validation:**
```typescript
if (display_name !== undefined) {
  // Validate length
  if (display_name.length < 3) return { error: 'DISPLAY_NAME_TOO_SHORT' }
  if (display_name.length > 50) return { error: 'DISPLAY_NAME_TOO_LONG' }
  
  // Validate pattern
  if (!/^[\w\s\-'.]+$/.test(display_name)) return { error: 'DISPLAY_NAME_INVALID' }
  
  // Check uniqueness (case-insensitive)
  const existing = await db.query('SELECT id FROM user WHERE LOWER(name) = LOWER(?) AND id != ?', [display_name, userId])
  if (existing.length > 0) return { error: 'DISPLAY_NAME_TAKEN' }
}

if (bio !== undefined) {
  // Validate length
  if (bio.length > 160) return { error: 'BIO_TOO_LONG' }
  
  // Strip HTML tags (security)
  bio = bio.replace(/<[^>]*>/g, '')
}

// is_profile_public: No validation needed (boolean)
```

**Rollback Strategy:**
- Avatar upload: If R2 succeeds but DB fails → delete from R2 in catch block
- Settings update: Use DB transaction, rollback on error
- Optimistic UI: Revert frontend state on error

## Testing Strategy

### Frontend Manual Testing

**Profile Picture Upload Flow:**
1. Navigate to Settings → Profile
2. Click "Change Picture" button
3. Test drag-drop: Drag image onto drop zone → see preview
4. Test file browser: Click "Choose file" → select image → see preview
5. Test validation:
   - Upload PDF → see error "Only images allowed"
   - Upload 15MB image → see error "File must be under 10MB"
   - Upload valid image → see preview with crop indicator
6. Click Save → see progress bar → see success toast → modal closes → avatar updates
7. Test error: Disconnect network, try upload → see error toast
8. Test formats: JPG, PNG, WebP, GIF (all should work)
9. Test aspect ratios: Square, portrait, landscape (all should crop to square)

**Display Name Editing:**
1. Navigate to Settings → Profile
2. Click edit button on display name
3. Test validation:
   - Type "ab" (too short) → see error, save disabled
   - Type "a" * 51 (too long) → see error, save disabled
   - Type "User@#$" (invalid chars) → see error, save disabled
   - Type "ValidName" → errors clear, save enabled
4. Click Save → see success toast → name updates in header
5. Navigate to profile page → verify name displays
6. Test uniqueness: Try to use another user's name → see error toast

**Bio Editing:**
1. Navigate to Settings → Profile
2. Click bio field (or edit button)
3. Type some text → see character counter "15 / 160"
4. Type until 161 chars → counter turns red, save disabled
5. Delete chars to 160 → counter normal, save enabled
6. Click outside field (blur) → auto-save triggers → no toast, bio updates
7. Navigate to profile page → verify bio displays in header
8. Test empty bio → should be allowed, shows placeholder

**Privacy Toggle:**
1. Navigate to Settings → Profile
2. Toggle "Make my profile public" checkbox → see immediate update (optimistic)
3. Refresh page → verify setting persisted
4. Test error: Disconnect network, toggle → see error toast, toggle reverts
5. (Phase 3) Verify public profile URL works when enabled

**Reputation Removal Verification:**
1. Navigate to profile page
2. Verify checklist:
   - [ ] NO reputation score visible
   - [ ] NO tier badges (Newcomer, Active, Contributor, Expert)
   - [ ] NO reputation guide card
   - [ ] NO annotation count
   - [ ] NO vote count
   - [ ] Stats show: Playlists, Liked Songs, Sets Listened (only)
   - [ ] Header shows: Avatar, Display Name, Bio, Role badge (only)

### Backend Testing

**Test Avatar Upload Endpoint:**
```bash
# Valid upload (JPG)
curl -X POST http://localhost:8787/api/profile/avatar/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@test-avatar.jpg"
# Expect: { success: true, avatar_url: "https://..." }

# Valid upload (PNG)
curl -X POST http://localhost:8787/api/profile/avatar/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@test-avatar.png"

# Too large (>10MB)
curl -X POST http://localhost:8787/api/profile/avatar/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@large-file.jpg"
# Expect: { error: 'FILE_TOO_LARGE', message: '...' }

# Invalid format (PDF)
curl -X POST http://localhost:8787/api/profile/avatar/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@document.pdf"
# Expect: { error: 'INVALID_FORMAT', message: '...' }

# No authentication
curl -X POST http://localhost:8787/api/profile/avatar/upload \
  -F "file=@test-avatar.jpg"
# Expect: 401 Unauthorized

# Corrupt image
curl -X POST http://localhost:8787/api/profile/avatar/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@corrupt.jpg"
# Expect: { error: 'CORRUPT_IMAGE', message: '...' }
```

**Test Settings Update Endpoint:**
```bash
# Valid update (all fields)
curl -X PATCH http://localhost:8787/api/profile/settings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"display_name":"NewName","bio":"Music lover","is_profile_public":true}'
# Expect: { success: true, user: {...} }

# Display name too short
curl -X PATCH http://localhost:8787/api/profile/settings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"display_name":"ab"}'
# Expect: { error: 'DISPLAY_NAME_TOO_SHORT', message: '...' }

# Display name too long (51 chars)
curl -X PATCH http://localhost:8787/api/profile/settings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"display_name":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}'
# Expect: { error: 'DISPLAY_NAME_TOO_LONG', message: '...' }

# Display name invalid characters
curl -X PATCH http://localhost:8787/api/profile/settings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"display_name":"User@#$%"}'
# Expect: { error: 'DISPLAY_NAME_INVALID', message: '...' }

# Bio too long (161 chars)
curl -X PATCH http://localhost:8787/api/profile/settings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"bio":"'$(python3 -c "print('a' * 161)")'"}'
# Expect: { error: 'BIO_TOO_LONG', message: '...' }

# Display name already taken
curl -X PATCH http://localhost:8787/api/profile/settings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"display_name":"ExistingUser"}'
# Expect: { error: 'DISPLAY_NAME_TAKEN', message: '...' }
```

**Test Public Profile Endpoint:**
```bash
# Public profile (when is_profile_public = 1)
curl http://localhost:8787/api/profile/abc123
# Expect: { user: { id, name, avatar_url, bio, role, created_at } }

# Private profile (when is_profile_public = 0)
curl http://localhost:8787/api/profile/xyz789
# Expect: { error: 'PROFILE_PRIVATE' }

# User not found
curl http://localhost:8787/api/profile/nonexistent
# Expect: { error: 'USER_NOT_FOUND' }
```

### Database Migration Testing

```bash
# Apply migration
bun run db:migrate

# Verify columns added
wrangler d1 execute ZEPHYRON --command "PRAGMA table_info(user);"
# Expect to see: bio, avatar_url, is_profile_public

# Check default values on existing users
wrangler d1 execute ZEPHYRON --command "SELECT id, bio, avatar_url, is_profile_public FROM user LIMIT 5;"
# Expect: bio = NULL, avatar_url = NULL, is_profile_public = 0

# Verify index created
wrangler d1 execute ZEPHYRON --command "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='user';"
# Expect to see: idx_user_public_profiles
```

### End-to-End Integration Test

**Complete Profile Edit Flow:**
1. Start dev server: `bun run dev`
2. Log in as test user
3. Navigate to `/app/settings` → Profile tab
4. Edit display name: "Test User 123" → Save → Verify toast + immediate update
5. Edit bio: "Electronic music enthusiast" → Blur → Verify auto-save (no toast)
6. Click "Change Picture" → Upload test image → Verify preview → Save → Verify toast + avatar updates
7. Toggle "Make my profile public" → Verify toast + checkbox stays checked
8. Navigate to `/app/profile` → Verify all changes visible:
   - [ ] Avatar displays uploaded image
   - [ ] Display name shows "Test User 123"
   - [ ] Bio shows "Electronic music enthusiast"
   - [ ] NO reputation elements
   - [ ] Stats show 3 cards only (Playlists, Liked Songs, Sets Listened)
9. Refresh page → Verify all changes persist
10. Log out → Log in → Navigate to profile → Verify changes still there
11. Open different browser (incognito) → Navigate to `/api/profile/<userId>` → Verify public profile returns data (since we toggled public)

## Implementation Notes

### Image Processing Options

**Option 1: Workers Image Resizing API (Recommended)**
- Built into Cloudflare Workers
- No external dependencies
- Simple API: `fetch(imageUrl, { cf: { image: { width: 800, height: 800, fit: 'cover' } } })`
- Automatically converts to WebP
- Docs: https://developers.cloudflare.com/images/image-resizing/

**Option 2: sharp library**
- More control over image processing
- Requires adding to dependencies
- Larger bundle size
- Better for complex transformations
- Example:
```typescript
import sharp from 'sharp'
const resized = await sharp(buffer)
  .resize(800, 800, { fit: 'cover', position: 'center' })
  .webp({ quality: 85 })
  .toBuffer()
```

**Recommendation:** Use Workers Image Resizing API — simpler, no dependencies, faster cold starts.

### Smart Crop Strategy

For non-square images, use center-crop (default behavior):
- Portrait image (600x900) → crops top/bottom → 600x600 → resizes to 800x800
- Landscape image (1200x800) → crops left/right → 800x800 → no resize needed
- Already square (1000x1000) → resize only → 800x800

No face detection or intelligent cropping in Phase 1 (keep it simple).

### R2 Bucket Configuration

```bash
# Create bucket (if doesn't exist)
wrangler r2 bucket create zephyron-avatars

# Add to wrangler.toml
[[r2_buckets]]
binding = "AVATARS"
bucket_name = "zephyron-avatars"

# Make bucket publicly readable
# (Set via dashboard or API - avatars should be accessible without auth)
```

### Database Column Notes

**`name` vs `display_name`:**
- Current schema: `user.name` (from Better Auth migration)
- This is effectively the display name (editable by user)
- DO NOT add separate `display_name` column
- Use `name` as the display name field

**`avatar_url` storage:**
- Store full URL: `https://avatars.zephyron.dev/abc123-1706123456789.webp`
- OR store relative path: `/avatars/abc123-1706123456789.webp` (then prepend domain in frontend)
- Recommendation: Store full URL (simpler, allows CDN changes without DB migration)

**`is_profile_public` default:**
- Default to `0` (private) for security
- Users must explicitly opt-in to public profiles
- Respect EU privacy regulations (GDPR)

## Future Phases

### Phase 2 - Analytics & Wrapped (Future Spec)

**Listening Statistics:**
- Total hours listened (calculate from history: `SUM(set.duration)`)
- Top 5 artists (from tracklists, grouped by `track.artist`)
- Favorite genre (most common genre in listening history)
- Listening patterns: Time of day heatmap, weekday vs weekend

**Monthly Summaries:**
- "Your Month in Music" view at `/app/wrapped/monthly/2026-04`
- Shows: Hours listened, top artists, top genre, longest set, discovery count (new artists)
- Generated on-demand from history data

**Annual Wrapped:**
- Special "Year in Review" at `/app/wrapped/2026`
- More polished than monthly summaries
- Static image generation (Canvas API or image service)
- 4-6 cards: Total hours, #1 artist, top 5 artists, discovery count, listening streak, favorite genre
- Downloadable as PNG (shareable on social media)
- Generated in December/January

### Phase 3 - Social Features (Future Spec)

**Achievement Badges:**
- Comprehensive set: Early Adopter, Curator, Night Owl, Marathon Listener, Genre Explorer, etc.
- Badge icons (SVG), display on profile, tooltip on hover
- Store in new table: `user_badges (user_id, badge_id, earned_at)`

**Activity Feed:**
- Full social feed: Likes, playlists, annotations, corrections, badges earned, milestones
- Paginated, with filters (by type)
- Real-time updates (optional: use Durable Objects for live feed)

**Public Profile Pages:**
- Route: `/profile/:userId`
- Full implementation of public profile view
- Respects granular privacy settings

**Granular Privacy Controls:**
- Toggle visibility for each section: Profile, Listening History, Playlists, Activity Feed, Liked Songs, Stats, Badges
- Stored in new table: `user_privacy_settings (user_id, field, is_visible)`

**Activity Notifications:**
- Notify when someone views your profile (optional)
- Notify when someone follows you (if follow feature added)

## Success Metrics

**Phase 1 Completion Criteria:**
- [ ] All reputation UI elements removed from ProfilePage
- [ ] Users can upload profile pictures (stored in R2)
- [ ] Users can edit display name (validated, unique)
- [ ] Users can edit bio (max 160 chars, auto-save)
- [ ] Users can toggle profile visibility (private by default)
- [ ] Profile page uses tabbed interface (4 tabs)
- [ ] Settings has new "Profile" tab
- [ ] Database migration applied successfully
- [ ] All manual tests pass
- [ ] No errors in browser console
- [ ] Toast notifications work for all actions

**User Experience Goals:**
- Profile editing feels fast and responsive (optimistic UI)
- Avatar upload completes in < 5 seconds for typical images
- No confusion about what happened (clear toast messages)
- Privacy setting is obvious and easy to understand
- Profile looks clean without reputation clutter

**Technical Goals:**
- Avatar images < 200KB after WebP conversion
- API endpoints respond in < 500ms (P95)
- R2 upload success rate > 99%
- No N+1 queries when loading profile
- Migration is reversible (no data loss)

## Open Questions

None — design approved and ready for implementation planning.

## Appendix: Reputation System Reference (Removed)

For historical context, the removed reputation system included:

**Tier System:**
- Newcomer: 0-9 points
- Active: 10-99 points
- Contributor: 100-499 points
- Expert: 500+ points

**Earning Mechanics:**
- Annotation approved: +10 points
- Correction confirmed by community: +25 points
- Vote on track detection: +1 point
- Annotation rejected: -5 points

**Removed UI Elements:**
- Tier badge next to display name
- Reputation score ("X pts")
- Reputation stat card in stats grid
- Reputation guide card (earning rules + tier progress bar)
- Annotation count stat
- Vote count stat

**Database Fields Deprecated:**
- `user.reputation` (INTEGER)
- `user.total_annotations` (INTEGER)
- `user.total_votes` (INTEGER)

These fields remain in the database schema but are no longer used in the UI. They can be dropped in a future migration if the reputation system is not revived.
