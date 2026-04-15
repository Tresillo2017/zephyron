# Artist Page Redesign

**Date:** 2026-04-15  
**Status:** Approved  

---

## Overview

Redesign `src/pages/ArtistPage.tsx` to be more cinematic and information-dense. The current page uses a 280px banner, buries stats in a sidebar card, and hides similar artists behind a dedicated tab. The redesign surfaces key data upfront and brings the visual weight in line with the platform's dark/immersive aesthetic.

---

## Layout Changes

### Banner: 280px → 340px

- Increase banner height from `h-[280px]` to `h-[340px]`
- Add a **left-to-right gradient** (`from rgba(14,14,18,0.85) at 25% → transparent at 65%`) on top of the background image so the artist name is always legible regardless of photo content
- Keep the existing bottom gradient (`from-surface to-transparent`)
- No other banner changes — avatar overlap, photo blur fallback, and admin edit button remain

### Stats bar (new)

A horizontal strip inserted **between the banner and the tab bar**. Displays:

- Monthly listeners (if `artist.listeners > 0`)
- Scrobbles (if `artist.playcount > 0`)  
- Sets on Zephyron (if `sets.length > 0`)

Styling:
- `background: hsl(var(--b6) / 0.5)` with `border-bottom: 1px solid hsl(var(--b4) / 0.3)`
- `padding: 0 px-6 lg:px-10`
- Each stat: value in `text-lg font-bold text-text-primary`, label in `text-[10px] text-text-muted`
- Stats separated by `border-right: 1px solid hsl(var(--b4) / 0.3)` with `px-6` internal padding
- Use `<NumberFlow>` for all three values

If all three values are zero/absent, render nothing (no empty bar).

### Sidebar: stats removed

Remove the stats card from the sidebar entirely — stats now live in the bar. Sidebar retains:
1. "Find on" music links card (`categories={['music']}`)
2. "Social" links card (`categories={['social']}`)

Both cards use the existing `<SocialLinks>` component unchanged. The `tags` sidebar card (shown on non-home tabs) is also removed — tags are already in the header.

### Similar artists: tab → home tab card

Move the similar artists content out of the dedicated `similar` tab and into the **home tab** as a card below the sets grid. Remove the `similar` tab from `TABS` entirely.

The card contains a **horizontally scrollable row** of artist bubbles:
- Each bubble: circular avatar (56px, `rounded-full`) with a per-letter gradient + initial, artist name below (max-width 64px, truncate)
- `overflow-x: auto`, `scrollbar-width: none` / `::-webkit-scrollbar { display: none }`
- Each bubble links externally (`href={sa.url}`, `target="_blank"`) with `hover: scale(1.06)` on the avatar
- Per-letter gradient: deterministic color from artist name's first letter (map A–Z to a set of 6–8 hue values using `charCodeAt % gradients.length`)
- Only render the card if `similarArtists.length > 0`

---

## Tab Content Transitions

When the active tab changes, animate the incoming content with a short fade + upward translate. No exit animation needed (content swaps immediately).

Implementation: wrap each tab's content block in a `<div key={activeTab}>` so React remounts it on tab change, then apply a CSS animation on mount:

```tsx
<div key={activeTab} style={{ animation: 'tab-enter 0.18s var(--ease-spring) both' }}>
  {/* tab content */}
</div>
```

Add keyframe to `index.css`:

```css
@keyframes tab-enter {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

This is the same pattern as `page-enter` but faster (0.18s vs 0.22s) and with a smaller translate (6px vs 10px) to feel lighter.

---

## Similar Artists Gradient Helper

Add a small pure function in `ArtistPage.tsx` (not exported):

```ts
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #2a1060, #5a20a0)',
  'linear-gradient(135deg, #0a1a50, #1a4090)',
  'linear-gradient(135deg, #0a2820, #1a6050)',
  'linear-gradient(135deg, #301020, #701040)',
  'linear-gradient(135deg, #1a1808, #504010)',
  'linear-gradient(135deg, #280a28, #681068)',
]

function avatarGradient(name: string): string {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length]
}
```

Used for both similar artist bubbles and the main artist avatar fallback (replaces the current `from-accent/15 to-surface-overlay` gradient).

---

## Files Changed

| File | Change |
|---|---|
| `src/pages/ArtistPage.tsx` | Main implementation — all layout changes above |
| `src/index.css` | Add `tab-enter` keyframe |

No new components. No new dependencies.

---

## What Does Not Change

- `TabBar` component — unchanged
- `SetGrid` component — unchanged  
- `SocialLinks` component — unchanged
- `Badge` component — unchanged
- Loading skeleton (`ArtistBannerSkeleton`) — unchanged
- Admin edit button — unchanged
- Bio "read more / show less" toggle — unchanged
- "Biography" tab content — unchanged
- "Live Sets" tab (sets-only view) — unchanged
- Error state — unchanged
