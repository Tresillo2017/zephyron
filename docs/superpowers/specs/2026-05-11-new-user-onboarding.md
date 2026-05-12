# New User Onboarding

**Date:** 2026-05-11
**Status:** Approved, ready for implementation

## Goal

Show first-time users a single-screen orientation modal that explains what Zephyron is and what they can do. Target: beta testers arriving via invite code who have no prior context about the platform.

## Approach

Single modal, one screen, three icon+text rows covering the three core value propositions. No steps, no forced actions — pure orientation. Dismissed with one button. Never shown again after dismissal.

## Architecture

New `src/components/Onboarding.tsx` component, self-contained with no props. Follows the exact same pattern as `src/components/WhatsNew.tsx`:

- Uses the existing `Modal` component (`src/components/ui/Modal.tsx`)
- Persists dismissal state in localStorage
- Mounts in `App.tsx` alongside `<WhatsNew />`
- No backend changes, no API calls

## Trigger Logic

On mount, `Onboarding` checks `localStorage.getItem('zephyron_onboarding_done')`. If absent, opens the modal. On dismiss (button click or modal backdrop/× close), writes `localStorage.setItem('zephyron_onboarding_done', '1')` and closes.

**Conflict with `WhatsNew`:** If `WhatsNew` would also open on the same session (i.e. `localStorage.getItem('zephyron_last_seen_version') !== __APP_VERSION__`), `Onboarding` does NOT open — it defers permanently and the key is never written. Two modals stacking is a worse experience than skipping onboarding for one session. Returning users who already have `zephyron_onboarding_done` set are unaffected.

**localStorage key:** `zephyron_onboarding_done`

**Reset for testing:** `localStorage.removeItem('zephyron_onboarding_done')` in the browser console.

## Component Design

```
Modal (max-w-sm, title="Welcome to Zephyron", logo in title)
└── Body: three rows
    ├── Row 1: 🎧 icon | "Stream DJ sets" | "Festival and club recordings from artists you follow"
    ├── Row 2: 🔍 icon | "Find any track" | "Search by artist, event, or song across every tracklist"
    └── Row 3: 🗳 icon  | "Vote & correct" | "Help verify AI detections and earn reputation"
└── Footer: "Let's go →" primary button (right-aligned, full dismiss)
```

**Row structure:** Each row has a small rounded icon container (`hsl(var(--h3) / 0.12)` bg, `hsl(var(--h2))` color), a bold title (`--c1`), and a one-line description (`--c2`). Rows separated by subtle gap, no dividers.

**No skip link** — the modal is one screen and takes ~5 seconds to read. The `onClose` handler on the `Modal` component (backdrop click, × button) also dismisses and writes the key.

## Files Changed

| File | Change |
|---|---|
| `src/components/Onboarding.tsx` | Create |
| `src/App.tsx` | Add `<Onboarding />` alongside `<WhatsNew />` |
