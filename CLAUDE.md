# Zephyron — AI Instructions

## Project Overview

Zephyron is a curated DJ set streaming platform ("Spotify for DJ sets") built on Cloudflare infrastructure (Workers, D1, R2, Workers AI, Vectorize, Durable Objects, Queues). React 19 + Vite 7 + Tailwind CSS 4 frontend. Invite-only beta with Better Auth.

Core features: audio streaming from R2, AI-powered tracklist detection (YouTube description/comments + LLM parsing + Last.fm enrichment), community annotation/voting, artist pages, admin dashboard.

## Design Context

### Users
The full spectrum of electronic music culture — DJs, producers, festival/club fans, and casual enthusiasts. Usage contexts range from late-night listening sessions to commuting to active discovery. The interface must serve both lean-back passive listening and engaged active browsing.

### Brand Personality
**Futuristic. Technical. Immersive.** Confident and knowledgeable without pretension. Speaks electronic music culture. Respects both underground credibility and mainstream appeal.

### Aesthetic Direction
Dark-first design inspired by the bleh Last.fm redesign. Full-bleed hero banners with real photography (not blurred), bottom-only gradients. HSL-parametric color system driven by a single `--hue` variable. Glass/blur effects on overlays and menus. Inset shadow borders on cards instead of CSS borders. No visible white borders anywhere.

References: bleh for Last.fm (HSL color system, card styling, banner treatment, glass menus), Mixcloud (DJ-focused, tracklist-centric), SoundCloud (waveform-forward). NOT corporate/sterile, NOT playful/childish, NOT cluttered/busy.

### Design Principles

1. **Music First, Chrome Second** — UI recedes when music plays. Content is the star.
2. **Dense but Breathable** — Show tracklist richness with intentional spacing and hierarchy.
3. **Expressive Restraint** — Dark canvas with earned moments of energy (waveform animation, accent pulse).
4. **Progressive Disclosure** — Essential info immediately, technical depth on interaction.
5. **Community as a Feature** — Corrections and votes feel like natural listening extensions.

### Navigation Pattern
- **Top navigation bar** (not sidebar) — transparent on banner pages, glass backdrop on others
- **User dropdown menu** from top-right avatar (glass blur, menu shadow, solarium animation)
- **Tab bars** on detail pages (Artist, Settings) with bottom-border active indicator
- **Full-width banners** on Artist and Set pages with overlapping cover art/avatar

### Color System (HSL-Parametric)
All colors derived from a single `--hue` CSS variable (default: 255 violet). Changing `--hue` shifts the entire UI.

**4 theme variants**: Dark (default, 14% root), Darker (6% root), OLED (0% root), Light (94% root)
**10 accent presets**: Violet, Blue, Cyan, Teal, Green, Yellow, Orange, Red, Pink, Rose
**Custom hue slider**: 0-360 degree fine-tuning

Background scale: `--b6` (root) through `--b2` (highlights) — all hue-tinted
Text scale: `--c1` (primary) through `--c3` (muted) — hue-tinted
Accent scale: `--h2` (light) through `--h4` (dark)

### Design Tokens
- Surfaces: HSL-derived from `--b6` (root bg, ~14% L) through `--b2` (bright, ~40% L)
- Accent: HSL-derived from `--h3` (~70% L, 60% S at current hue)
- Text: HSL-derived `--c1` (near white), `--c2` (67%), `--c3` (36%)
- Card border: `inset 0 0 0 1px hsl(var(--b4) / 0.25)` — NO visible CSS borders
- Card shadow: `0 8px 35px rgba(0,0,0,0.35)`
- Card radius: 12px, Button radius: 12px
- Font: Geist (variable, weight 480 default), Geist Mono for data
- Font weights: 480 (body), 650 (medium), 730 (bold)
- Transitions: 0.2s with `cubic-bezier(0.095, 0.41, 0.055, 0.96)`
- WCAG AA accessibility target

### Component Patterns
- **Buttons**: 12px radius, 30px height, `scale(0.98)` on active, accent glow shadow on primary
- **Cards**: `.card` utility — `hsl(var(--b5))` bg, inset shadow border, 12px radius, 20px padding
- **Tags**: `#` prefixed, low-opacity bg, 6px radius, no border
- **Badges**: accent/default/muted variants, no inset shadow borders
- **Toggles**: 42x24px switch with white knob, accent when checked
- **Sliders**: Accent-filled track, white 16px thumb

### Layout
- **Top nav bar**: Transparent, `h-[calc(20px + var(--button-height))]`, glass backdrop on non-banner pages
- **Player bar**: Glass backdrop, 72px height, accent play button with glow shadow, centered controls
- **Banner pages**: 280px full-bleed hero, bottom-only gradient, -100px content overlap, cover art with `var(--subtle-shadow)`
- **Content pages**: `px-6 lg:px-10 py-6` padding, no max-width constraint
- **Settings**: Vertical tab nav on left (200px), content on right

### Tech Stack
React 19, Vite 7, Tailwind CSS 4 (`@theme` + CSS custom properties), Zustand 5, Cloudflare Workers + D1 + R2, Better Auth, custom UI primitives (no external component library).

## Package manager
Remember to always use bun for package management to ensure consistency across the team. Run `bun install` to install dependencies and `bun run <script>` for running scripts defined in package.json. Avoid using npm or yarn to prevent potential issues with lockfiles and node_modules structure.

## Approach
- Think before acting. Read existing files before writing code.
- Be concise in output but thorough in reasoning.
- Prefer editing over rewriting whole files.
- Do not re-read files you have already read unless the file may have changed.
- Test your code before declaring done.
- No sycophantic openers or closing fluff.
- Keep solutions simple and direct.
- User instructions always override this file.
