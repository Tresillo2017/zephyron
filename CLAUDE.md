# Zephyron — AI Instructions

## Project Overview

Zephyron is a curated DJ set streaming platform ("Spotify for DJ sets") built on Cloudflare infrastructure (Workers, D1, R2, Workers AI, Vectorize, Durable Objects, Queues). React 19 + Vite 7 + Tailwind CSS 4 frontend. Invite-only beta with Better Auth.

Core features: audio streaming from R2, AI-powered tracklist detection (YouTube description/comments + LLM parsing + Last.fm enrichment), community annotation/voting, artist pages, admin dashboard.

## Design Context

Zephyron's UI is a 1:1 port of the bleh Last.fm redesign (https://github.com/katelyynn/bleh, GPL-3.0), via the user's sc-dashboard port (`../SafeCircle/sc-dashboard`). When in doubt about a visual detail, copy sc-dashboard, then check bleh.

### Users & brand
DJs, producers, festival/club fans and casual listeners; lean-back listening and active browsing. **Futuristic. Technical. Immersive.** Music first, chrome second; dense but breathable; progressive disclosure; community corrections feel like natural listening extensions.

### Design system (`src/styles/`)
- `tokens.css`: oklch colour model. Palette values are bare `L C H` triplets used as `oklch(var(--b5))` / `oklch(var(--b5) / 40%)`. One accent triplet (hue/sat/lit, default hue 285 violet) feeds `--h2..h4`, `--l2..l4`, `--k4`, `--f4`. Never use `hsl(var(--x))`.
- `themes.css`: 8 themes (Ash `dark`, Darker, Void `oled`, Light, Ink, Rosé Pine, Rosé Pine Dawn, Kanagawa Dragon) keyed by `data-bleh--theme` on `<html>`; surfaces `--b2..b8`, text `--c1..c3`, glass tokens, shadows.
- `base.css`: reset, grain overlay, `.glass*` classes; `motion.css`: keyframes, entrances written as `animation: var(--motion, <name> ...)` (reduced motion unsets `--motion`).
- Settings: `src/stores/settingsStore.ts` (theme, accent, glass, grain, serif, font, avatar shape, compact, reduced motion...) mirrored as `data-bleh--*` attributes; `index.html` has a prepaint script that must stay in sync with `applySettings`. `themeStore.ts` is a legacy facade.
- Compat layer at the top of `src/index.css` keeps legacy names (`--br1`, `--ease-out-custom`, Tailwind `surface`/`accent`/`text-primary`).
- Primitives: `src/components/bleh/` (`ui-*`, `cc-*` classes, ContentCard/Section/Toolbar), shell in `src/components/shell/` (Masthead, Hero, HeaderTabs, PageFrame, Footer), admin adapters in `src/components/admin/adminUi.tsx`. Icons: `@mingcute/react/core-filled` (verify the icon name exists). Fonts: Hanken Grotesk, Instrument Serif for display (`.font-head`), Inconsolata for code.
- Layout: top masthead (transparent over banners, glass otherwise), 280px full-bleed real-photo banners with bottom-only gradient, tab rows with underline indicator, main + 400px side column cards, glass player bar 72px, inset-shadow borders (no CSS borders).
- WCAG AA target. The audio player stays mounted outside the route outlet.

### Local development
`bun run dev` uses PRODUCTION D1/R2 (`remote: true` in wrangler.jsonc). Use `LOCAL_ONLY=1 bun run dev` for a local database, `bash scripts/seed-local.sh` for fixtures and `node .playwright-mcp/shoot.mjs` for screenshots (QA login in `scripts/seed-local.sql`).

### Tech Stack
React 19, Vite 8, Tailwind CSS 4, Zustand 5, React Router 8, Cloudflare Workers + D1 + R2, Better Auth 1.7, custom primitives (no external component library).

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
