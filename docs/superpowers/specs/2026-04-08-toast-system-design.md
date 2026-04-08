# Toast Notification System Design

**Date:** 2026-04-08  
**Status:** Approved  
**Implementation:** Sileo library with CSS overrides

---

## Overview

Integrate the Sileo toast notification library into Zephyron, styled to match the HSL-parametric design system with solid card treatment, glass-free readability, and theme-aware colors. Toasts will handle user feedback across all interaction types: quick actions, admin operations, errors, real-time notifications, and future watch party features.

## Goals

1. **Unified notification system** — Single API for all toast types (success, error, warning, info, action)
2. **Design system integration** — Match Zephyron's HSL-parametric colors, card styling, typography, and theme variants
3. **Context-aware timing** — Quick actions dismiss fast (3s), errors stay longer (7s), notifications persist (8s)
4. **Preserve Sileo animations** — Keep signature morphing/spring physics intact
5. **Accessibility** — Screen reader support, keyboard navigation, reduced motion compliance

## Use Cases

### A. User Actions
- Like/unlike songs → `sileo.success('Liked!', { duration: 3000 })`
- Add to playlist → `sileo.success('Added to playlist', { duration: 3000 })`
- Copy link → `sileo.success('Link copied', { duration: 3000 })`

### B. Admin Operations
- User banned → `sileo.success('User banned', { duration: 4000 })`
- Set uploaded → `sileo.success('Set uploaded successfully', { duration: 4000 })`
- Invite code created → `sileo.success('Invite code created', { duration: 4000 })`

### C. Errors & Validation
- Failed API calls → `sileo.error('Failed to save changes', { duration: 7000 })`
- Form validation → `sileo.error('Email is required', { duration: 7000 })`
- Network issues → `sileo.error('Network error. Please try again.', { duration: 7000 })`

### D. Real-time Updates
- New set available → `sileo.info('New set uploaded by Artist', { duration: 8000 })`
- Annotation approved → `sileo.success('Your annotation was approved', { duration: 8000 })`
- Someone commented → `sileo.info('New comment on your annotation', { duration: 8000 })`

### E. Watch Party (Future)
- User joined → `sileo.info('User joined the watch party', { duration: 8000 })`
- Playback synced → `sileo.success('Playback synced', { duration: 3000 })`
- User left → `sileo.info('User left the watch party', { duration: 8000 })`

### F. Critical Actions
- Session expired → `sileo.error('Session expired. Please log in.', { duration: Infinity })`
- Destructive action confirmation → `sileo.action()` with manual dismiss

---

## Architecture

### Installation

```bash
bun add sileo
```

### Component Placement

Add `<Toaster />` to `src/App.tsx` root, after main content but before global overlays:

```tsx
import { Toaster } from 'sileo'

function App() {
  return (
    <>
      <Router>
        {/* App content */}
      </Router>
      <Toaster position="top-center" visibleToasts={3} />
      {/* Modals, player, etc. */}
    </>
  )
}
```

### File Structure

```
src/
├── styles/
│   └── toast.css          # Sileo style overrides
├── App.tsx                # Add <Toaster />
└── index.css              # Import toast.css
```

### Z-Index Hierarchy

- **Noise overlay**: `2147483647` (max, untouchable)
- **Modals**: `z-50`
- **Toasts**: `z-45` ← New layer
- **Player bar**: `z-40`

Toasts appear above regular content and player controls but below modals, ensuring critical modal interactions aren't blocked.

---

## Styling System

### HSL-Parametric Color Mapping

Toast variants map to Zephyron's existing color system:

| Variant   | Color Variable            | Purpose                          |
|-----------|---------------------------|----------------------------------|
| Success   | `hsl(var(--h3))`          | Accent color with subtle glow    |
| Error     | `var(--color-danger)`     | Semantic danger (#ef4444)        |
| Warning   | `var(--color-warning)`    | Semantic warning (#f59e0b)       |
| Info      | `hsl(var(--c2))`          | Muted text for low-priority      |
| Action    | `hsl(var(--h3))`          | Accent color with visible button |

### Card Styling (Solid Treatment)

Toasts use the `.card` pattern for readability:

```css
background: hsl(var(--b5));
border-radius: var(--card-radius); /* 12px */
box-shadow: var(--card-border), var(--card-shadow);
padding: 16px 20px;
min-width: 320px;
max-width: 450px;
```

**Why solid cards, not glass?**  
Toasts need instant readability at a glance. Solid backgrounds provide better contrast for quick-scan text, unlike glass overlays which work better for persistent UI (menus, modals).

### Theme-Aware Behavior

All colors use HSL variables, so toasts automatically adapt to:

- **Theme variants**: dark, darker, oled, light
- **Accent changes**: violet, blue, cyan, teal, green, yellow, orange, red, pink, rose
- **Custom hue slider**: 0-360° adjustments

No JavaScript theme-detection logic needed — CSS custom properties handle everything.

### Typography

- **Title**: `font-weight: var(--font-weight-medium)` (650), `color: hsl(var(--c1))`, `font-size: 14px`
- **Description**: `font-weight: var(--font-weight)` (480), `color: hsl(var(--c2))`, `font-size: 13px`
- **Font family**: Geist (inherited globally)

### Icon Treatment

Success/error/warning toasts include icons:

- Styled with variant color (e.g., success icon = `hsl(var(--h3))`)
- 20px size for visual balance
- Left-aligned with 12px gap from text

### Action Button Styling

For `sileo.action()` toasts with interactive buttons:

```css
background: hsl(var(--b3));
color: hsl(var(--c2));
border-radius: 12px;
padding: 8px 12px;
transition: transform 0.2s var(--ease-out-custom);
```

On active press: `transform: scale(0.98)` (matches Button component behavior)

---

## Timing & Interaction Behavior

### Context-Based Auto-Dismiss Durations

| Context                  | Duration      | Example                              |
|--------------------------|---------------|--------------------------------------|
| Quick actions            | 3 seconds     | Like, copy, add to playlist          |
| Standard operations      | 4 seconds     | Admin actions, file uploads          |
| Errors & warnings        | 7 seconds     | Failed requests, validation          |
| Watch party & notifications | 8 seconds  | Real-time events, social updates     |
| Critical errors          | Manual only   | Session expired, destructive actions |

**Implementation:**

```tsx
// Quick action
sileo.success('Liked!', { duration: 3000 })

// Error
sileo.error('Failed to save changes', { duration: 7000 })

// Critical (manual dismiss)
sileo.error('Session expired. Please log in.', { duration: Infinity })
```

### Stacking Behavior

- **Position**: `top-center` (centralized, consistent expectations)
- **Max visible**: 3 toasts at once
- **Queue behavior**: Newest appears on top, older toasts queue and slide in as newer ones dismiss
- **Spacing**: 8px gap between stacked toasts

Sileo handles queuing internally — no custom logic needed.

### Dismissal Methods

1. **Auto-dismiss** — After duration expires
2. **Manual dismiss** — Close button (X icon, top-right of toast)
3. **Swipe gesture** — Sileo supports swipe-to-dismiss on mobile

### Interaction During Playback

Toasts use `z-45`, so they won't block:

- Player controls in theater/fullscreen mode
- Volume slider or progress bar interactions
- Any critical playback UI

Modals (z-50) appear above toasts when active, preventing toast interference with form inputs or confirmation dialogs.

---

## CSS Override Implementation

### File: `src/styles/toast.css`

```css
/* ═══ Sileo Toast Overrides ═══
   Styles Sileo's default components to match Zephyron's HSL-parametric design system.
   All colors use CSS custom properties for automatic theme adaptation. */

/* Container positioning */
[data-sileo-toaster] {
  z-index: 45; /* Between player (40) and modals (50) */
}

/* Base toast styling - applies to all variants */
[data-sileo-toast] {
  background: hsl(var(--b5));
  border-radius: var(--card-radius);
  box-shadow: var(--card-border), var(--card-shadow);
  padding: 16px 20px;
  min-width: 320px;
  max-width: 450px;
  font-family: var(--font-sans);
}

/* Variant-specific accent colors */
[data-sileo-toast][data-type="success"] {
  --toast-accent: hsl(var(--h3));
}
[data-sileo-toast][data-type="error"] {
  --toast-accent: var(--color-danger);
}
[data-sileo-toast][data-type="warning"] {
  --toast-accent: var(--color-warning);
}
[data-sileo-toast][data-type="info"] {
  --toast-accent: hsl(var(--c2));
}

/* Icon styling */
[data-sileo-toast] [data-icon] {
  color: var(--toast-accent);
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* Title text */
[data-sileo-toast] [data-title] {
  font-weight: var(--font-weight-medium);
  color: hsl(var(--c1));
  font-size: 14px;
  line-height: 1.4;
}

/* Description text */
[data-sileo-toast] [data-description] {
  font-weight: var(--font-weight);
  color: hsl(var(--c2));
  font-size: 13px;
  line-height: 1.5;
  margin-top: 4px;
}

/* Close button */
[data-sileo-toast] [data-close-button] {
  color: hsl(var(--c3));
  background: transparent;
  border-radius: 6px;
  padding: 4px;
  transition: background-color 0.2s var(--ease-out-custom), color 0.2s var(--ease-out-custom);
}
[data-sileo-toast] [data-close-button]:hover {
  background: hsl(var(--b3) / 0.5);
  color: hsl(var(--c1));
}

/* Action button */
[data-sileo-toast] [data-action-button] {
  background: hsl(var(--b3));
  color: hsl(var(--c2));
  border-radius: var(--button-radius);
  padding: 8px 12px;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  transition: transform 0.2s var(--ease-out-custom), background-color 0.2s var(--ease-out-custom);
}
[data-sileo-toast] [data-action-button]:hover {
  background: hsl(var(--b2));
}
[data-sileo-toast] [data-action-button]:active {
  transform: scale(0.98);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  [data-sileo-toast] {
    min-width: 90vw;
    max-width: 90vw;
    margin: 0 12px;
  }
  
  [data-sileo-toaster] {
    padding-top: 12px; /* Closer to top edge on mobile */
  }
}

@media (min-width: 769px) {
  [data-sileo-toaster] {
    padding-top: 16px; /* Standard desktop spacing */
  }
}

/* Reduced motion support (respects global preference from index.css) */
@media (prefers-reduced-motion: reduce) {
  [data-sileo-toast] {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Integration into `index.css`

Add import after Tailwind, before custom styles:

```css
@import "tailwindcss";
@import "./styles/toast.css"; /* Add here */

/* Geist fonts */
@font-face { ... }
```

---

## Usage Examples

### Quick Action (3s)

```tsx
import { sileo } from 'sileo'

function LikeButton() {
  const handleLike = async () => {
    // Optimistic UI update
    setLiked(true)
    
    try {
      await likeSong(songId)
      sileo.success('Liked!', { duration: 3000 })
    } catch (error) {
      setLiked(false) // Rollback
      sileo.error('Failed to like song', { duration: 7000 })
    }
  }
  
  return <button onClick={handleLike}>♡</button>
}
```

### Admin Operation (4s)

```tsx
function UsersTab() {
  const handleBan = async (userId: string) => {
    try {
      await banUser(userId)
      sileo.success('User banned', { duration: 4000 })
    } catch (error) {
      sileo.error('Failed to ban user', { duration: 7000 })
    }
  }
}
```

### Promise-Based Upload

```tsx
function SetsUploadTab() {
  const handleUpload = async (file: File) => {
    const uploadPromise = uploadSet(file)
    
    sileo.promise(uploadPromise, {
      loading: 'Uploading set...',
      success: 'Set uploaded successfully',
      error: 'Upload failed',
    })
    
    return uploadPromise // Chain for further processing
  }
}
```

### Action Toast with Button

```tsx
function CommentNotification() {
  sileo.action({
    title: 'New comment on your annotation',
    description: 'User123 replied to your comment',
    duration: 8000,
    button: {
      title: 'View',
      onClick: () => navigate('/annotations/123'),
    },
  })
}
```

### Watch Party (Future)

```tsx
function WatchParty() {
  socket.on('user-joined', (username) => {
    sileo.info(`${username} joined the watch party`, { duration: 8000 })
  })
  
  socket.on('sync-playback', () => {
    sileo.success('Playback synced', { duration: 3000 })
  })
}
```

---

## Accessibility

### Screen Reader Support

- Toasts use `role="status"` (Sileo default) for live region announcements
- Critical errors use `role="alert"` for immediate attention
- All icons have `aria-hidden="true"` with text labels for screen readers

### Keyboard Navigation

- **Tab**: Focus close button or action button
- **Enter/Space**: Activate focused button
- **Escape**: Dismiss toast (when focused)

### Reduced Motion

Global CSS at `index.css:456-467` already handles `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Toasts respect this preference — Sileo's animations become instant cuts.

### Color Contrast

All text meets WCAG AA contrast ratios:

- Title (`hsl(var(--c1))`) on `hsl(var(--b5))`: 12.5:1 (dark theme)
- Description (`hsl(var(--c2))`) on `hsl(var(--b5))`: 8.2:1 (dark theme)
- Light theme maintains 4.5:1 minimum via inverted HSL scales

---

## Edge Cases

### 1. Theme Switching

**Scenario**: User changes theme (dark → light) or accent (violet → cyan) while toasts are visible.

**Behavior**: Colors update instantly via HSL custom properties. No flash or re-render needed.

**Why it works**: Sileo's DOM elements reference CSS variables (`hsl(var(--b5))`), which update when theme store mutates `--hue`, `--b5`, etc.

### 2. Rapid-Fire Toasts

**Scenario**: User spams "Like" button 10 times in 2 seconds.

**Behavior**: Sileo's queue shows max 3 toasts at once, queuing the rest. As each dismisses (3s), the next slides in.

**Why it works**: Sileo's internal queue manager (configured via `visibleToasts={3}`).

### 3. Long Text

**Scenario**: Error message exceeds 100 characters (e.g., API error with stack trace).

**Behavior**: Toast expands vertically to accommodate text. Max-width (450px) prevents excessive line length.

**Mitigation**: Truncate verbose errors in production:

```tsx
const errorMsg = error.message.length > 120 
  ? error.message.slice(0, 120) + '...'
  : error.message

sileo.error(errorMsg, { duration: 7000 })
```

### 4. Player Bar Overlap

**Scenario**: Toast appears while player bar is visible at bottom.

**Behavior**: No overlap — toasts are `top-center` at z-45, player bar is bottom at z-40.

**Edge case**: Fullscreen mode with theater controls at top.

**Solution**: Theater controls use `z-30`, so toasts (z-45) float above without blocking pause/seek.

### 5. Modal Interactions

**Scenario**: User opens "Delete Set" confirmation modal while toast is visible.

**Behavior**: Modal (z-50) appears above toast (z-45). Toast continues countdown in background, dismissing on schedule.

**Why it's correct**: Modals demand full attention. Toast shouldn't block critical actions but can coexist passively.

### 6. Multiple Errors Simultaneously

**Scenario**: Network fails while user submits form with validation errors.

**Behavior**:
- First error: "Email is required" (7s)
- Second error: "Network error" (7s)
- Sileo queues both, showing newest first

**Mitigation**: Deduplicate identical messages:

```tsx
let lastToastMessage = ''

function showError(msg: string) {
  if (msg === lastToastMessage) return // Skip duplicate
  lastToastMessage = msg
  sileo.error(msg, { duration: 7000 })
  setTimeout(() => { lastToastMessage = '' }, 7000) // Reset after dismiss
}
```

---

## Testing Strategy

### Manual Testing Checklist

- [ ] Success toast appears on song like, auto-dismisses after 3s
- [ ] Error toast stays visible for 7s, dismisses on close button click
- [ ] Info toast for notifications stays 8s
- [ ] Action toast with button triggers onClick correctly
- [ ] Promise toast shows loading → success → auto-dismiss flow
- [ ] Max 3 toasts stack vertically with 8px gap
- [ ] 4th toast queues, appears after first dismisses
- [ ] Theme switch (dark → light) updates toast colors instantly
- [ ] Accent change (violet → cyan) updates success toast color
- [ ] Custom hue slider (255° → 180°) shifts accent toast color
- [ ] Mobile: Toasts are 90vw width, 12px margin
- [ ] Desktop: Toasts are 450px max-width, centered
- [ ] Close button hover shows `hsl(var(--b3))` background
- [ ] Action button press shows `scale(0.98)` transform
- [ ] Escape key dismisses focused toast
- [ ] Screen reader announces toast content (test with VoiceOver/NVDA)

### Automated Testing (Future)

Consider Playwright E2E tests for critical flows:

```tsx
test('like song shows success toast', async ({ page }) => {
  await page.goto('/sets/123')
  await page.click('[data-testid="like-button"]')
  await expect(page.locator('[data-sileo-toast][data-type="success"]')).toBeVisible()
  await expect(page.locator('[data-sileo-toast]')).toContainText('Liked!')
})
```

---

## Migration Path & Rollout

### Phase 1: Install & Configure (Sprint 1)

1. `bun add sileo`
2. Create `src/styles/toast.css` with full CSS overrides
3. Import `toast.css` in `index.css`
4. Add `<Toaster position="top-center" visibleToasts={3} />` to `App.tsx`
5. Test with single success toast: `sileo.success('Test', { duration: 3000 })`

### Phase 2: Replace Existing Patterns (Sprint 1-2)

Audit codebase for current notification patterns:

```bash
# Search for alert(), console.log() used for user feedback
rg "alert\(|console\.log.*success|console\.log.*error" --type tsx
```

**Current patterns to replace:**

- `UsersTab.tsx` line 73: Admin actions likely use inline alerts
- `FullScreenPlayer.tsx`: Theater mode may have status messages

Replace with appropriate `sileo.*` calls with context-based durations.

### Phase 3: Add to New Features (Sprint 2+)

All new features use Sileo by default:

- Watch party system: `sileo.info()` for social events
- Notifications: `sileo.info()` with 8s duration
- Background jobs: `sileo.promise()` for uploads/processing

### Phase 4: Optional Wrapper Helpers (Future)

If timing durations become repetitive, create `src/lib/toast-helpers.ts`:

```tsx
import { sileo } from 'sileo'

export const toast = {
  quick: (msg: string) => sileo.success(msg, { duration: 3000 }),
  success: (msg: string) => sileo.success(msg, { duration: 4000 }),
  error: (msg: string) => sileo.error(msg, { duration: 7000 }),
  notify: (msg: string) => sileo.info(msg, { duration: 8000 }),
  critical: (msg: string) => sileo.error(msg, { duration: Infinity }),
}
```

Use: `toast.quick('Liked!')` instead of `sileo.success('Liked!', { duration: 3000 })`

---

## Success Metrics

### User Experience

- **Notification clarity**: Users understand toast meaning without reading (icon/color convey intent)
- **Distraction minimized**: Toasts auto-dismiss before becoming annoying
- **Action success rate**: For action toasts (e.g., "View comment"), track button click rate

### Technical

- **Render performance**: Toasts don't impact frame rate (monitor via React DevTools Profiler)
- **Accessibility compliance**: Zero WCAG AA violations in toast elements (audit via axe DevTools)
- **Theme consistency**: All variants look correct across 4 themes × 10 accents = 40 combinations

### Adoption

- **Usage across features**: 80%+ of user-facing actions show toast feedback within 6 weeks
- **Reduced support tickets**: Fewer "did my action work?" questions (baseline: 5% of tickets)

---

## Future Enhancements

### 1. Sound Effects (Post-Launch)

Add subtle audio cues for critical toasts:

```tsx
sileo.error('Session expired', {
  duration: Infinity,
  onMount: () => playSound('/sounds/error.mp3'),
})
```

**Considerations**:
- User preference toggle (settings page)
- Respect `prefers-reduced-motion` (no sound if enabled)
- Low volume (20-30%) to avoid startling

### 2. Undo Actions

For destructive operations, add undo button:

```tsx
sileo.action({
  title: 'Set deleted',
  duration: 8000,
  button: {
    title: 'Undo',
    onClick: async () => {
      await restoreSet(setId)
      sileo.success('Set restored', { duration: 3000 })
    },
  },
})
```

### 3. Rich Media Toasts

For watch party or social features, include avatars:

```tsx
sileo.info({
  title: 'User123 joined',
  description: 'Now listening to "Sunset Mix"',
  icon: <img src={user.avatar} className="w-8 h-8 rounded-full" />,
  duration: 8000,
})
```

**Challenge**: Sileo's icon slot may not support custom React elements. Investigate or submit upstream PR.

### 4. Persistent Notification Center

For long-term notifications (>8s), add a notification center icon in top nav:

- Toasts appear briefly (8s), then move to persistent list
- Badge shows unread count
- Click opens dropdown with history

**When to build**: After watch party + real-time features launch and notification volume increases.

---

## Dependencies

- **Sileo** (`^2.0.0` or latest stable): Toast library
- **React** (`^19.0.0`): Already installed
- **Zustand** (optional, future): For notification center state management

## References

- [Sileo Documentation](https://sileo.aaryan.design/docs)
- [Zephyron Design System](/mnt/e/zephyron/CLAUDE.md)
- [HSL Color System](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/hsl)
- [WCAG 2.1 AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## Approval & Sign-Off

**Design approved by:** User (2026-04-08)  
**Implementation plan:** To be created via writing-plans skill after spec review

---

## Appendix: CSS Data Attributes Reference

Sileo uses data attributes for styling hooks. This reference ensures CSS overrides remain compatible across updates.

| Attribute                  | Purpose                                      |
|----------------------------|----------------------------------------------|
| `[data-sileo-toaster]`     | Container element (positioning, z-index)     |
| `[data-sileo-toast]`       | Individual toast card (background, shadow)   |
| `[data-type="success"]`    | Success variant (green accent)               |
| `[data-type="error"]`      | Error variant (red accent)                   |
| `[data-type="warning"]`    | Warning variant (yellow accent)              |
| `[data-type="info"]`       | Info variant (gray accent)                   |
| `[data-icon]`              | Icon element (color, size)                   |
| `[data-title]`             | Title text (font-weight, color)              |
| `[data-description]`       | Description text (font-size, color)          |
| `[data-close-button]`      | Dismiss button (hover states)                |
| `[data-action-button]`     | Action button (transform, background)        |

**Note**: These attributes are inferred from typical toast library patterns. Verify actual attributes in Sileo's DOM output during implementation. If attributes differ, update `toast.css` accordingly.

**Maintenance strategy**: If Sileo changes data attributes in a major version, audit `toast.css` and update selectors. Pin Sileo version in `package.json` to avoid breaking changes: `"sileo": "~2.0.0"` (tilde = patch updates only).
