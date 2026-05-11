# New User Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a single-screen orientation modal to first-time users explaining what Zephyron is, triggered once via localStorage and never shown again after dismissal.

**Architecture:** New `src/components/Onboarding.tsx` modelled exactly after `src/components/WhatsNew.tsx` — self-contained, uses the existing `Modal` component, persists to localStorage. Mounted in `App.tsx` alongside `<WhatsNew />`. Defers if `WhatsNew` would also open in the same session to avoid stacking two modals.

**Tech Stack:** React 19, existing `Modal` component (`src/components/ui/Modal.tsx`), localStorage, `__APP_VERSION__` global (already declared in `vite.config.ts`).

---

## File Map

| File | Change |
|------|--------|
| `src/components/Onboarding.tsx` | Create |
| `src/App.tsx` | Add `<Onboarding />` import and mount |

---

## Task 1: Create `Onboarding.tsx`

**Files:**
- Create: `src/components/Onboarding.tsx`

- [ ] **Step 1: Create the file with the full component**

```tsx
import { useState, useEffect } from 'react'
import { Modal } from './ui/Modal'

const LS_KEY = 'zephyron_onboarding_done'
const LS_WHATS_NEW_KEY = 'zephyron_last_seen_version'

const FEATURES = [
  {
    icon: '🎧',
    title: 'Stream DJ sets',
    description: 'Festival and club recordings from artists you follow',
  },
  {
    icon: '🔍',
    title: 'Find any track',
    description: 'Search by artist, event, or song across every tracklist',
  },
  {
    icon: '🗳',
    title: 'Vote & correct',
    description: 'Help verify AI detections and earn reputation',
  },
]

export function Onboarding() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Already dismissed
    if (localStorage.getItem(LS_KEY)) return

    // Defer if WhatsNew would also open this session — avoid stacking two modals
    if (localStorage.getItem(LS_WHATS_NEW_KEY) !== __APP_VERSION__) return

    setOpen(true)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(LS_KEY, '1')
    setOpen(false)
  }

  return (
    <Modal
      isOpen={open}
      onClose={handleDismiss}
      title="Welcome to Zephyron"
      className="max-w-sm"
    >
      <div className="space-y-1 mb-6">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex items-start gap-3 py-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
              style={{ background: 'hsl(var(--h3) / 0.12)' }}
            >
              {f.icon}
            </div>
            <div>
              <p className="text-sm font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--c1))' }}>
                {f.title}
              </p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'hsl(var(--c2))' }}>
                {f.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleDismiss}
        className="w-full h-[var(--button-height)] rounded-[var(--button-radius)] text-sm font-[var(--font-weight-medium)] cursor-pointer transition-all"
        style={{
          background: 'hsl(var(--h3))',
          color: 'white',
          boxShadow: '0 0 20px hsl(var(--h3) / 0.3)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'hsl(var(--h2))'
          e.currentTarget.style.transform = 'scale(0.98)'
          e.currentTarget.style.boxShadow = '0 0 25px hsl(var(--h3) / 0.4)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'hsl(var(--h3))'
          e.currentTarget.style.transform = ''
          e.currentTarget.style.boxShadow = '0 0 20px hsl(var(--h3) / 0.3)'
        }}
      >
        Let's go →
      </button>
    </Modal>
  )
}
```

**Notes on the defer logic:** The `useEffect` checks `LS_WHATS_NEW_KEY !== __APP_VERSION__`. When `WhatsNew` would open, the last-seen version key is NOT yet equal to the current version — so the condition `!== __APP_VERSION__` is true and onboarding returns early. After `WhatsNew` is dismissed it writes the current version — but by then `Onboarding` has already decided not to open. Net result: on a brand-new first session for a brand-new user, if `WhatsNew` fires, `Onboarding` defers. On subsequent sessions (WhatsNew already seen), `Onboarding` opens normally. This is the correct precedence: WhatsNew wins the first session, Onboarding gets the next.

Wait — re-reading this: a truly new user has NEITHER key set. So:
- `LS_KEY` absent → would open
- `LS_WHATS_NEW_KEY !== __APP_VERSION__` → WhatsNew would also open → defer

That means a brand-new user sees WhatsNew first, then on next login sees Onboarding. That's acceptable — better than two modals stacking.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
bun run typecheck
```
Expected: exits 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Onboarding.tsx
git commit -m "feat(onboarding): add Onboarding component"
```

---

## Task 2: Mount in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the import**

The current imports in `src/App.tsx` include:
```tsx
import { WhatsNew } from './components/WhatsNew'
```

Add immediately after it:
```tsx
import { Onboarding } from './components/Onboarding'
```

- [ ] **Step 2: Mount the component**

The current `AppLayout` return in `src/App.tsx` looks like:
```tsx
    <div className="h-screen flex flex-col bg-surface text-text-primary">
      <div id="app-scroll-container" className="flex-1 overflow-y-auto relative">
        <TopNav />
        <PageTransition />
      </div>
      <PlayerBar />
      <WhatsNew />
    </div>
```

Add `<Onboarding />` directly after `<WhatsNew />`:
```tsx
    <div className="h-screen flex flex-col bg-surface text-text-primary">
      <div id="app-scroll-container" className="flex-1 overflow-y-auto relative">
        <TopNav />
        <PageTransition />
      </div>
      <PlayerBar />
      <WhatsNew />
      <Onboarding />
    </div>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
bun run typecheck
```
Expected: exits 0.

- [ ] **Step 4: Run the test suite**

```bash
bun test
```
Expected: 17 pass, 0 fail. (No new tests needed — this is a UI-only component with localStorage state; the logic is trivial and the existing test suite covers infrastructure.)

- [ ] **Step 5: Manual verification in browser**

```bash
bun run dev
```

Open http://localhost:5173, log in. The onboarding modal will NOT appear yet because `WhatsNew` fires first (your last-seen version is stale).

To test onboarding directly:
1. Open DevTools console
2. Run: `localStorage.setItem('zephyron_last_seen_version', window.__APP_VERSION__)`  
   (This simulates having already seen WhatsNew)
3. Run: `localStorage.removeItem('zephyron_onboarding_done')`
4. Refresh the page

Expected: "Welcome to Zephyron" modal appears with three rows (🎧 Stream DJ sets, 🔍 Find any track, 🗳 Vote & correct) and a "Let's go →" button.

5. Click "Let's go →" — modal closes
6. Refresh — modal does NOT reappear (key was written)
7. Run: `localStorage.removeItem('zephyron_onboarding_done')` then refresh — modal reappears (confirming reset works)

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat(onboarding): mount Onboarding in AppLayout"
```
