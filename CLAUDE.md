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

<!-- autoskills:start -->

Summary generated by `autoskills`. Check the full files inside `.claude/skills`.

## Accessibility (a11y)

Audit and improve web accessibility following WCAG 2.2 guidelines. Use when asked to "improve accessibility", "a11y audit", "WCAG compliance", "screen reader support", "keyboard navigation", or "make accessible".

- `.claude/skills/accessibility/SKILL.md`
- `.claude/skills/accessibility/references/A11Y-PATTERNS.md`: Practical, copy-paste-ready patterns for common accessibility requirements. Each pattern is self-contained and linked from the main [SKILL.md](../SKILL.md).
- `.claude/skills/accessibility/references/WCAG.md`

## MANDATORY PREPARATION

Adapt designs to work across different screen sizes, devices, contexts, or platforms. Ensures consistent experience across varied environments.

- `.claude/skills/adapt/SKILL.md`

## MANDATORY PREPARATION

Review a feature and enhance it with purposeful animations, micro-interactions, and motion effects that improve usability and delight.

- `.claude/skills/animate/SKILL.md`

## MANDATORY PREPARATION

Improve layout, spacing, and visual rhythm. Fixes monotonous grids, inconsistent spacing, and weak visual hierarchy to create intentional compositions.

- `.claude/skills/arrange/SKILL.md`

## Diagnostic Scan

Perform comprehensive audit of interface quality across accessibility, performance, theming, and responsive design. Generates detailed report of issues with severity ratings and recommendations.

- `.claude/skills/audit/SKILL.md`

## Better Auth Integration Guide

Configure Better Auth server and client, set up database adapters, manage sessions, add plugins, and handle environment variables. Use when users mention Better Auth, betterauth, auth.ts, or need to set up TypeScript authentication with email/password, OAuth, or plugin configuration.

- `.claude/skills/better-auth-best-practices/SKILL.md`

## Secret Management

Configure rate limiting, manage auth secrets, set up CSRF protection, define trusted origins, secure sessions and cookies, encrypt OAuth tokens, track IP addresses, and implement audit logging for Better Auth. Use when users need to secure their auth setup, prevent brute force attacks, or harden...

- `.claude/skills/better-auth-security-best-practices/SKILL.MD`

## MANDATORY PREPARATION

Amplify safe or boring designs to make them more visually interesting and stimulating. Increases impact while maintaining usability.

- `.claude/skills/bolder/SKILL.md`

## Bun Skill Reference

Use when building, testing, or deploying JavaScript/TypeScript applications. Reach for Bun when you need to run scripts, install packages, bundle code, or test applications — it's a drop-in replacement for Node.js with integrated package manager, test runner, and bundler.

- `.claude/skills/bun/SKILL.md`

## MANDATORY PREPARATION

Improve unclear UX copy, error messages, microcopy, labels, and instructions. Makes interfaces easier to understand and use.

- `.claude/skills/clarify/SKILL.md`

## Cloudflare Deploy

Deploy applications and infrastructure to Cloudflare using Workers, Pages, and related platform services. Use when the user asks to deploy, host, publish, or set up a project on Cloudflare.

- `.claude/skills/cloudflare-deploy/SKILL.md`
- `.claude/skills/cloudflare-deploy/references/agents-sdk/api.md`: For AI chat with auto-streaming, message history, tools, resumable streaming.
- `.claude/skills/cloudflare-deploy/references/agents-sdk/configuration.md`: **Type-safe pattern:**
- `.claude/skills/cloudflare-deploy/references/agents-sdk/gotchas.md`: **Cause:** Mutating state directly or not calling `setState()` after modifications **Solution:** Always use `setState()` with immutable updates:
- `.claude/skills/cloudflare-deploy/references/agents-sdk/patterns.md`: **Server (AIChatAgent):**
- `.claude/skills/cloudflare-deploy/references/agents-sdk/README.md`: Cloudflare Agents SDK enables building AI-powered agents on Durable Objects with state, WebSockets, SQL, scheduling, and AI integration.
- `.claude/skills/cloudflare-deploy/references/ai-gateway/configuration.md`: AI > AI Gateway > Create Gateway > Configure (auth, caching, rate limiting, logging)
- `.claude/skills/cloudflare-deploy/references/ai-gateway/dynamic-routing.md`: Configure complex routing in dashboard without code changes. Use route names instead of model names.
- `.claude/skills/cloudflare-deploy/references/ai-gateway/features.md`: Dashboard: Settings → Cache Responses → Enable
- `.claude/skills/cloudflare-deploy/references/ai-gateway/README.md`: Expert guidance for implementing Cloudflare AI Gateway - a universal gateway for AI model providers with analytics, caching, rate limiting, and routing capabilities.
- `.claude/skills/cloudflare-deploy/references/ai-gateway/sdk-integration.md`
- `.claude/skills/cloudflare-deploy/references/ai-gateway/troubleshooting.md`: **Causes:** - Different request params (temperature, etc.) - Streaming enabled - Caching disabled in settings
- `.claude/skills/cloudflare-deploy/references/ai-search/api.md`: **Operators:** `eq`, `ne`, `gt`, `gte`, `lt`, `lte`
- `.claude/skills/cloudflare-deploy/references/ai-search/configuration.md`: Dashboard: AI Search → Create Instance → Select R2 bucket
- `.claude/skills/cloudflare-deploy/references/ai-search/gotchas.md`: **Timestamp precision:** Use seconds (10-digit), not milliseconds.
- `.claude/skills/cloudflare-deploy/references/ai-search/patterns.md`: Enable for high-stakes use cases (adds ~300ms latency):
- `.claude/skills/cloudflare-deploy/references/ai-search/README.md`: Expert guidance for implementing Cloudflare AI Search (formerly AutoRAG), Cloudflare's managed semantic search and RAG service.
- `.claude/skills/cloudflare-deploy/references/analytics-engine/api.md`: Fire-and-forget (returns `void`, not Promise). Writes happen asynchronously.
- `.claude/skills/cloudflare-deploy/references/analytics-engine/configuration.md`: Multiple datasets for separate concerns:
- `.claude/skills/cloudflare-deploy/references/analytics-engine/gotchas.md`: **Problem:** Queries return fewer points than written at >1M writes/min.
- `.claude/skills/cloudflare-deploy/references/analytics-engine/patterns.md`
- `.claude/skills/cloudflare-deploy/references/analytics-engine/README.md`: Expert guidance for implementing unlimited-cardinality analytics at scale using Cloudflare Workers Analytics Engine.
- `.claude/skills/cloudflare-deploy/references/api-shield/api.md`: Base: `/zones/{zone_id}/api_gateway`
- `.claude/skills/cloudflare-deploy/references/api-shield/configuration.md`: **Upload schema (Dashboard):**
- `.claude/skills/cloudflare-deploy/references/api-shield/gotchas.md`: **Cause:** Classic rules still active, conflicting with new system **Solution:** 1. Delete ALL Classic schema validation rules 2. Clear Cloudflare cache (wait 5 min) 3. Re-upload schema via new Schema Validation 2.0 interface 4. Verify in Security > Events 5. Check action is set (Log/Block)
- `.claude/skills/cloudflare-deploy/references/api-shield/patterns.md`: Detects sequential resource access (e.g., `/users/1`, `/users/2`, `/users/3`).
- `.claude/skills/cloudflare-deploy/references/api-shield/README.md`: Expert guidance for API Shield - comprehensive API security suite for discovery, protection, and monitoring.
- `.claude/skills/cloudflare-deploy/references/api/api.md`: **Create token**: Dashboard → My Profile → API Tokens → Create Token
- `.claude/skills/cloudflare-deploy/references/api/configuration.md`: **Security:** Never commit tokens. Use `.env` files (gitignored) or secret managers.
- `.claude/skills/cloudflare-deploy/references/api/gotchas.md`: **Actual Limits:** - **1200 requests / 5 minutes** per user/token (global) - **200 requests / second** per IP address - **GraphQL: 320 / 5 minutes** (cost-based)
- `.claude/skills/cloudflare-deploy/references/api/patterns.md`: **Problem:** API returns paginated results. Default page size is 20.
- `.claude/skills/cloudflare-deploy/references/api/README.md`: Guide for working with Cloudflare's REST API - authentication, SDK usage, common patterns, and troubleshooting.
- `.claude/skills/cloudflare-deploy/references/argo-smart-routing/api.md`: **Note on Smart Shield:** Argo Smart Routing is being integrated into Cloudflare's Smart Shield product. API endpoints remain stable; existing integrations continue to work without changes.
- `.claude/skills/cloudflare-deploy/references/argo-smart-routing/configuration.md`: **Note on Smart Shield Evolution:** Argo Smart Routing is being integrated into Smart Shield. Configuration methods below remain valid; Terraform and IaC patterns unchanged.
- `.claude/skills/cloudflare-deploy/references/argo-smart-routing/gotchas.md`: **Smart Shield Note:** Argo Smart Routing evolving into Smart Shield. Best practices below remain applicable; monitor Cloudflare changelog for Smart Shield updates.
- `.claude/skills/cloudflare-deploy/references/argo-smart-routing/patterns.md`: **Flow:** Visitor → Edge (Lower-Tier) → [Cache Miss] → Upper-Tier → [Cache Miss + Argo] → Origin
- `.claude/skills/cloudflare-deploy/references/argo-smart-routing/README.md`: Cloudflare Argo Smart Routing is a performance optimization service that detects real-time network issues and routes web traffic across the most efficient network path. It continuously monitors network conditions and intelligently routes traffic through the fastest, most reliable routes in Cloudf...
- `.claude/skills/cloudflare-deploy/references/bindings/api.md`: Cloudflare generates binding types via `npx wrangler types`. This creates `.wrangler/types/runtime.d.ts` with your Env interface.
- `.claude/skills/cloudflare-deploy/references/bindings/configuration.md`: **Create commands:**
- `.claude/skills/cloudflare-deploy/references/bindings/gotchas.md`: **Why it breaks:** - `env` not available in global scope - If using workarounds, secrets may not update without redeployment - Leads to "Cannot read property 'X' of undefined" errors
- `.claude/skills/cloudflare-deploy/references/bindings/patterns.md`: **Why RPC?** Zero latency (same datacenter), no DNS, free, type-safe.
- `.claude/skills/cloudflare-deploy/references/bindings/README.md`: Expert guidance on Cloudflare Workers Bindings - the runtime APIs that connect Workers to Cloudflare platform resources.
- `.claude/skills/cloudflare-deploy/references/bot-management/api.md`: See [patterns.md](./patterns.md) for Workers examples: mobile app allowlisting, corporate proxy exemption, datacenter detection, conditional delay, and more.
- `.claude/skills/cloudflare-deploy/references/bot-management/configuration.md`: **Note:** Dashboard paths differ between old and new UI: - **New:** Security > Settings > Filter "Bot traffic" - **Old:** Security > Bots
- `.claude/skills/cloudflare-deploy/references/bot-management/gotchas.md`: **Cause:** Bot Management didn't run (internal Cloudflare request, Worker routing to zone (Orange-to-Orange), or request handled before BM (Redirect Rules, etc.)) **Solution:** Check request flow and ensure Bot Management runs in request lifecycle
- `.claude/skills/cloudflare-deploy/references/bot-management/patterns.md`
- `.claude/skills/cloudflare-deploy/references/bot-management/README.md`: Enterprise-grade bot detection, protection, and mitigation using ML/heuristics, bot scores, JavaScript detections, and verified bot handling.
- `.claude/skills/cloudflare-deploy/references/browser-rendering/api.md`: **Base:** `https://api.cloudflare.com/client/v4/accounts/{accountId}/browser-rendering` **Auth:** `Authorization: Bearer <token>` (Browser Rendering - Edit permission)
- `.claude/skills/cloudflare-deploy/references/browser-rendering/configuration.md`: **Use Cloudflare packages** - standard `puppeteer`/`playwright` won't work in Workers.
- `.claude/skills/cloudflare-deploy/references/browser-rendering/gotchas.md`: *Subject to fair-use policy.
- `.claude/skills/cloudflare-deploy/references/browser-rendering/patterns.md`: Keep sessions alive for performance:
- `.claude/skills/cloudflare-deploy/references/browser-rendering/README.md`: **Description**: Expert knowledge for Cloudflare Browser Rendering - control headless Chrome on Cloudflare's global network for browser automation, screenshots, PDFs, web scraping, testing, and content generation.
- `.claude/skills/cloudflare-deploy/references/c3/api.md`
- `.claude/skills/cloudflare-deploy/references/c3/configuration.md`: C3 generates **placeholder IDs** that must be replaced before deploy:
- `.claude/skills/cloudflare-deploy/references/c3/gotchas.md`: **Error:** "Invalid namespace ID" **Fix:** Replace placeholders in wrangler.jsonc with real IDs:
- `.claude/skills/cloudflare-deploy/references/c3/patterns.md`: **Non-interactive requires:**
- `.claude/skills/cloudflare-deploy/references/c3/README.md`: Official CLI for scaffolding Cloudflare Workers and Pages projects with templates, TypeScript, and instant deployment.
- `.claude/skills/cloudflare-deploy/references/cache-reserve/api.md`: Cache Reserve is a **zone-level configuration**, not a per-request API. It works automatically when enabled for the zone:
- `.claude/skills/cloudflare-deploy/references/cache-reserve/configuration.md`: **Minimum steps to enable:**
- `.claude/skills/cloudflare-deploy/references/cache-reserve/gotchas.md`: **Cause:** Asset is not cacheable, TTL < 10 hours, Content-Length header missing, or blocking headers present (Set-Cookie, Vary: *) **Solution:** Ensure minimum TTL of 10+ hours (`Cache-Control: public, max-age=36000`), add Content-Length header, remove Set-Cookie header, and set `Vary: Accept-En...
- `.claude/skills/cloudflare-deploy/references/cache-reserve/patterns.md`: **Note**: This modifies response headers to meet eligibility criteria but does NOT directly control Cache Reserve storage (which is zone-level automatic).
- `.claude/skills/cloudflare-deploy/references/cache-reserve/README.md`: **Persistent cache storage built on R2 for long-term content retention**
- `.claude/skills/cloudflare-deploy/references/containers/api.md`: **getByName(id)** - Named instance for session affinity, per-user state **getRandom()** - Random instance for load balancing stateless services
- `.claude/skills/cloudflare-deploy/references/containers/configuration.md`: Key config requirements: - `image` - Path to Dockerfile or directory containing Dockerfile - `class_name` - Must match Container class export name - `max_instances` - Max concurrent container instances - Must configure Durable Objects binding AND migrations
- `.claude/skills/cloudflare-deploy/references/containers/gotchas.md`: **Problem:** WebSocket connections fail silently
- `.claude/skills/cloudflare-deploy/references/containers/patterns.md`: **Use:** User sessions, WebSocket, stateful games, per-user caching.
- `.claude/skills/cloudflare-deploy/references/containers/README.md`: **APPLIES TO: Cloudflare Containers ONLY - NOT general Cloudflare Workers**
- `.claude/skills/cloudflare-deploy/references/cron-triggers/api.md`: **JavaScript:** Same signature without types **Python:** `class Default(WorkerEntrypoint): async def scheduled(self, controller, env, ctx)`
- `.claude/skills/cloudflare-deploy/references/cron-triggers/configuration.md`: Schedule crons during low-carbon periods for carbon-aware execution:
- `.claude/skills/cloudflare-deploy/references/cron-triggers/gotchas.md`: **Problem:** Cron runs at wrong time relative to local timezone **Cause:** All crons execute in UTC, no local timezone support **Solution:** Convert local time to UTC manually
- `.claude/skills/cloudflare-deploy/references/cron-triggers/patterns.md`: **View logs:** `npx wrangler tail` or Dashboard → Workers & Pages → Worker → Logs
- `.claude/skills/cloudflare-deploy/references/cron-triggers/README.md`: Schedule Workers execution using cron expressions. Runs on Cloudflare's global network during underutilized periods.
- `.claude/skills/cloudflare-deploy/references/d1/api.md`: Long-running sessions for operations exceeding 30s timeout (up to 15 min).
- `.claude/skills/cloudflare-deploy/references/d1/configuration.md`: File structure: `migrations/0001_initial_schema.sql`, `0002_add_posts.sql`, etc.
- `.claude/skills/cloudflare-deploy/references/d1/gotchas.md`: **Cause:** Using string interpolation instead of prepared statements with bind() **Solution:** ALWAYS use prepared statements: `env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).all()` instead of string interpolation which allows attackers to inject malicious SQL
- `.claude/skills/cloudflare-deploy/references/d1/patterns.md`: **Use replicas for**: Analytics dashboards, search results, public queries (eventual consistency OK) **Use primary for**: Read-after-write, financial transactions, authentication (consistency required)
- `.claude/skills/cloudflare-deploy/references/d1/README.md`: Expert guidance for Cloudflare D1, a serverless SQLite database designed for horizontal scale-out across multiple databases.
- `.claude/skills/cloudflare-deploy/references/ddos/api.md`: **SDK Version**: Requires `cloudflare` >= 3.0.0 for ruleset phase methods.
- `.claude/skills/cloudflare-deploy/references/ddos/configuration.md`: Multiple override layers apply in this order (higher precedence wins):
- `.claude/skills/cloudflare-deploy/references/ddos/gotchas.md`: **Cause**: Sensitivity too high, wrong action, or missing exceptions **Solution**: 1. Lower sensitivity for specific rule/category 2. Use `log` action first to validate (Enterprise Advanced) 3. Add exception with custom expression (e.g., allowlist IPs) 4. Query flagged requests via GraphQL Analyt...
- `.claude/skills/cloudflare-deploy/references/ddos/patterns.md`: Layered security stack: DDoS + WAF + Rate Limiting + Bot Management.
- `.claude/skills/cloudflare-deploy/references/ddos/README.md`: Autonomous, always-on protection against DDoS attacks across L3/4 and L7.
- `.claude/skills/cloudflare-deploy/references/do-storage/api.md`
- `.claude/skills/cloudflare-deploy/references/do-storage/configuration.md`: **wrangler.jsonc:**
- `.claude/skills/cloudflare-deploy/references/do-storage/gotchas.md`: Durable Objects use **input/output gates** to prevent race conditions:
- `.claude/skills/cloudflare-deploy/references/do-storage/patterns.md`: Hierarchical DO pattern where parent manages child DOs:
- `.claude/skills/cloudflare-deploy/references/do-storage/README.md`: Persistent storage API for Durable Objects with SQLite and KV backends, PITR, and automatic concurrency control.
- `.claude/skills/cloudflare-deploy/references/do-storage/testing.md`: Testing Durable Objects with storage using `vitest-pool-workers`.
- `.claude/skills/cloudflare-deploy/references/durable-objects/api.md`: **When to use:** - `waitUntil()`: Background cleanup, logging, non-critical work after response - `blockConcurrencyWhile()`: First-time init, schema migration, critical state setup
- `.claude/skills/cloudflare-deploy/references/durable-objects/configuration.md`: Specify jurisdiction at ID creation for data residency compliance:
- `.claude/skills/cloudflare-deploy/references/durable-objects/gotchas.md`: **Problem:** Variables lost after hibernation **Cause:** DO auto-hibernates when idle; in-memory state not persisted **Solution:** Use `ctx.storage` for critical data, `ws.serializeAttachment()` for per-connection metadata
- `.claude/skills/cloudflare-deploy/references/durable-objects/patterns.md`: **RPC** (compat ≥2024-04-03): Type-safe, simpler, default for new projects **fetch()**: Legacy compat, HTTP semantics, proxying
- `.claude/skills/cloudflare-deploy/references/durable-objects/README.md`: Expert guidance for building stateful applications with Cloudflare Durable Objects.
- `.claude/skills/cloudflare-deploy/references/email-routing/api.md`: Main interface for incoming emails:
- `.claude/skills/cloudflare-deploy/references/email-routing/configuration.md`: **Connect to Email Routing:**
- `.claude/skills/cloudflare-deploy/references/email-routing/gotchas.md`: **Problem:** "stream already consumed" or worker hangs
- `.claude/skills/cloudflare-deploy/references/email-routing/patterns.md`
- `.claude/skills/cloudflare-deploy/references/email-routing/README.md`: Cloudflare Email Routing enables custom email addresses for your domain that route to verified destination addresses. It's free, privacy-focused (no storage/access), and includes Email Workers for programmatic email processing.
- `.claude/skills/cloudflare-deploy/references/email-workers/api.md`: Complete API reference for Cloudflare Email Workers runtime.
- `.claude/skills/cloudflare-deploy/references/email-workers/configuration.md`: Use postal-mime v2.x, mimetext v3.x.
- `.claude/skills/cloudflare-deploy/references/email-workers/gotchas.md`: Replies fail silently without DMARC. Verify: `dig TXT _dmarc.example.com`
- `.claude/skills/cloudflare-deploy/references/email-workers/patterns.md`
- `.claude/skills/cloudflare-deploy/references/email-workers/README.md`: Process incoming emails programmatically using Cloudflare Workers runtime.
- `.claude/skills/cloudflare-deploy/references/hyperdrive/api.md`: See [README.md](./README.md) for overview, [configuration.md](./configuration.md) for setup.
- `.claude/skills/cloudflare-deploy/references/hyperdrive/configuration.md`: See [README.md](./README.md) for overview.
- `.claude/skills/cloudflare-deploy/references/hyperdrive/gotchas.md`: See [README.md](./README.md), [configuration.md](./configuration.md), [api.md](./api.md), [patterns.md](./patterns.md).
- `.claude/skills/cloudflare-deploy/references/hyperdrive/patterns.md`: See [README.md](./README.md), [configuration.md](./configuration.md), [api.md](./api.md).
- `.claude/skills/cloudflare-deploy/references/hyperdrive/README.md`: Accelerates database queries from Workers via connection pooling, edge setup, query caching.
- `.claude/skills/cloudflare-deploy/references/images/api.md`: **Params:** `w=`, `h=`, `fit=`, `q=`, `f=`, `dpr=`, `gravity=`, `sharpen=`, `blur=`, `rotate=`, `background=`, `metadata=`
- `.claude/skills/cloudflare-deploy/references/images/configuration.md`: Add to `wrangler.toml`:
- `.claude/skills/cloudflare-deploy/references/images/gotchas.md`: **Support:** AVIF (Chrome 85+, Firefox 93+, Safari 16.4+), WebP (Chrome 23+, Firefox 65+, Safari 14+)
- `.claude/skills/cloudflare-deploy/references/images/patterns.md`
- `.claude/skills/cloudflare-deploy/references/images/README.md`: **Cloudflare Images** is an end-to-end image management solution providing storage, transformation, optimization, and delivery at scale via Cloudflare's global network.
- `.claude/skills/cloudflare-deploy/references/kv/api.md`: See [gotchas.md](./gotchas.md) for detailed error patterns and solutions.
- `.claude/skills/cloudflare-deploy/references/kv/configuration.md`: **wrangler.jsonc:**
- `.claude/skills/cloudflare-deploy/references/kv/gotchas.md`: **Cause:** Eventual consistency means writes may not be immediately visible in other regions **Solution:** Don't read immediately after write; return confirmation without reading or use the local value you just wrote. Writes visible immediately in same location, ≤60s globally
- `.claude/skills/cloudflare-deploy/references/kv/patterns.md`
- `.claude/skills/cloudflare-deploy/references/kv/README.md`: Globally-distributed, eventually-consistent key-value store optimized for high read volume and low latency.
- `.claude/skills/cloudflare-deploy/references/miniflare/api.md`: **Fetch (no HTTP server):**
- `.claude/skills/cloudflare-deploy/references/miniflare/configuration.md`: **Critical:** Use `compatibilityDate: "2026-01-01"` or latest to match production runtime. Old dates limit available APIs.
- `.claude/skills/cloudflare-deploy/references/miniflare/gotchas.md`: **Not supported:** - Analytics Engine (use mocks) - Cloudflare Images/Stream - Browser Rendering API - Tail Workers - Workers for Platforms (partial support)
- `.claude/skills/cloudflare-deploy/references/miniflare/patterns.md`: **Quick guide:** - Unit tests → getPlatformProxy - Integration tests → Miniflare API - Vitest workflows → vitest-pool-workers
- `.claude/skills/cloudflare-deploy/references/miniflare/README.md`: Local simulator for Cloudflare Workers development/testing. Runs Workers in workerd sandbox implementing runtime APIs - no internet required.
- `.claude/skills/cloudflare-deploy/references/network-interconnect/api.md`: See [README.md](README.md) for overview.
- `.claude/skills/cloudflare-deploy/references/network-interconnect/configuration.md`: See [README.md](README.md) for overview.
- `.claude/skills/cloudflare-deploy/references/network-interconnect/gotchas.md`: **Cause:** Cross-connect not installed, RX/TX fibers reversed, wrong fiber type, or low light levels **Solution:** 1. Verify cross-connect installed 2. Check fiber at patch panel 3. Swap RX/TX fibers 4. Check light with optical power meter (target > -20 dBm) 5. Contact account team
- `.claude/skills/cloudflare-deploy/references/network-interconnect/patterns.md`: See [README.md](README.md) for overview.
- `.claude/skills/cloudflare-deploy/references/network-interconnect/README.md`: Private, high-performance connectivity to Cloudflare's network. **Enterprise-only**.
- `.claude/skills/cloudflare-deploy/references/observability/api.md`: **Endpoint**: `https://api.cloudflare.com/client/v4/graphql`
- `.claude/skills/cloudflare-deploy/references/observability/configuration.md`: **Best Practice**: Use structured JSON logging for better indexing
- `.claude/skills/cloudflare-deploy/references/observability/gotchas.md`: **Cause:** Observability disabled, Worker not redeployed, no traffic, low sampling rate, or log size exceeds 256 KB **Solution:** Ensure `observability.enabled = true`, redeploy Worker, check `head_sampling_rate`, verify traffic
- `.claude/skills/cloudflare-deploy/references/observability/patterns.md`
- `.claude/skills/cloudflare-deploy/references/observability/README.md`: **Purpose**: Comprehensive guidance for implementing observability in Cloudflare Workers, covering traces, logs, metrics, and analytics.
- `.claude/skills/cloudflare-deploy/references/pages-functions/api.md`: **TypeScript:** See [configuration.md](./configuration.md) for `wrangler types` setup
- `.claude/skills/cloudflare-deploy/references/pages-functions/configuration.md`: **Generate types from wrangler.jsonc** (replaces deprecated `@cloudflare/workers-types`):
- `.claude/skills/cloudflare-deploy/references/pages-functions/gotchas.md`: **Problem:** `ctx.env.MY_BINDING` shows type error **Cause:** No type definition for `Env` **Solution:** Run `npx wrangler types` or manually define:
- `.claude/skills/cloudflare-deploy/references/pages-functions/patterns.md`: Non-blocking tasks after response sent (analytics, cleanup, webhooks):
- `.claude/skills/cloudflare-deploy/references/pages-functions/README.md`: Serverless functions on Cloudflare Pages using Workers runtime. Full-stack dev with file-based routing.
- `.claude/skills/cloudflare-deploy/references/pages/api.md`: **Rules**: `[param]` = single segment, `[[param]]` = multi-segment catchall, more specific wins.
- `.claude/skills/cloudflare-deploy/references/pages/configuration.md`: **Git deployment**: Dashboard → Project → Settings → Build settings Set build command, output dir, env vars. Framework auto-detection configures automatically.
- `.claude/skills/cloudflare-deploy/references/pages/gotchas.md`: **Problem**: Function endpoints return 404 or don't execute **Causes**: `_routes.json` excludes path; wrong file extension (`.jsx`/`.tsx`); Functions dir not at output root **Solution**: Check `_routes.json`, rename to `.ts`/`.js`, verify build output structure
- `.claude/skills/cloudflare-deploy/references/pages/patterns.md`: Enable Smart Placement for apps with D1 or centralized data sources:
- `.claude/skills/cloudflare-deploy/references/pages/README.md`: JAMstack platform for full-stack apps on Cloudflare's global network.
- `.claude/skills/cloudflare-deploy/references/pipelines/api.md`: **Key points:** - `send()` accepts single object or array - Always returns `Promise<void>` (no confirmation data) - Throws on network/validation errors (wrap in try/catch) - Use `ctx.waitUntil()` for fire-and-forget pattern
- `.claude/skills/cloudflare-deploy/references/pipelines/configuration.md`: Get stream ID: `npx wrangler pipelines streams list`
- `.claude/skills/cloudflare-deploy/references/pipelines/gotchas.md`: **Most common issue.** Events accepted (HTTP 200) but never appear in sink.
- `.claude/skills/cloudflare-deploy/references/pipelines/patterns.md`: **Why:** Structured streams drop invalid events silently. Client validation gives immediate feedback.
- `.claude/skills/cloudflare-deploy/references/pipelines/README.md`: ETL streaming platform for ingesting, transforming, and loading data into R2 with SQL transformations.
- `.claude/skills/cloudflare-deploy/references/pulumi/api.md`: Export resource identifiers:
- `.claude/skills/cloudflare-deploy/references/pulumi/configuration.md`: Serve static assets from Workers:
- `.claude/skills/cloudflare-deploy/references/pulumi/gotchas.md`: **Problem:** Worker fails with "Cannot use import statement outside a module" **Cause:** Pulumi doesn't bundle Worker code - uploads exactly what you provide **Solution:** Build Worker BEFORE Pulumi deploy
- `.claude/skills/cloudflare-deploy/references/pulumi/patterns.md`: **Use:** Canary releases, A/B testing, blue-green. Most apps use `WorkerScript` (auto-versioning).
- `.claude/skills/cloudflare-deploy/references/pulumi/README.md`: Expert guidance for Cloudflare Pulumi Provider (@pulumi/cloudflare).
- `.claude/skills/cloudflare-deploy/references/queues/api.md`: **CRITICAL WARNINGS:**
- `.claude/skills/cloudflare-deploy/references/queues/configuration.md`: **wrangler.jsonc:**
- `.claude/skills/cloudflare-deploy/references/queues/gotchas.md`: **Problem:** Throwing uncaught error in queue handler retries the entire batch, not just the failed message **Cause:** Uncaught exceptions propagate to the runtime, triggering batch-level retry **Solution:** Always wrap individual message processing in try/catch and call `msg.retry()` explicitly
- `.claude/skills/cloudflare-deploy/references/queues/patterns.md`: High priority: `max_batch_size: 5, max_batch_timeout: 1`. Low priority: `max_batch_size: 100, max_batch_timeout: 30`.
- `.claude/skills/cloudflare-deploy/references/queues/README.md`: Flexible message queuing for async task processing with guaranteed at-least-once delivery and configurable batching.
- `.claude/skills/cloudflare-deploy/references/r2-data-catalog/api.md`: R2 Data Catalog exposes standard [Apache Iceberg REST Catalog API](https://github.com/apache/iceberg/blob/main/open-api/rest-catalog-open-api.yaml).
- `.claude/skills/cloudflare-deploy/references/r2-data-catalog/configuration.md`: How to enable R2 Data Catalog and configure authentication.
- `.claude/skills/cloudflare-deploy/references/r2-data-catalog/gotchas.md`: Common problems → causes → solutions.
- `.claude/skills/cloudflare-deploy/references/r2-data-catalog/patterns.md`: Practical patterns for R2 Data Catalog with PyIceberg.
- `.claude/skills/cloudflare-deploy/references/r2-data-catalog/README.md`: Expert guidance for Cloudflare R2 Data Catalog - Apache Iceberg catalog built into R2 buckets.
- `.claude/skills/cloudflare-deploy/references/r2-sql/api.md`: SQL syntax, functions, operators, and data types for R2 SQL queries.
- `.claude/skills/cloudflare-deploy/references/r2-sql/configuration.md`: Setup and configuration for R2 SQL queries.
- `.claude/skills/cloudflare-deploy/references/r2-sql/gotchas.md`: Limitations, troubleshooting, and common pitfalls for R2 SQL.
- `.claude/skills/cloudflare-deploy/references/r2-sql/patterns.md`: Common patterns, use cases, and integration examples for R2 SQL.
- `.claude/skills/cloudflare-deploy/references/r2-sql/README.md`: Expert guidance for Cloudflare R2 SQL - serverless distributed query engine for Apache Iceberg tables.
- `.claude/skills/cloudflare-deploy/references/r2/api.md`
- `.claude/skills/cloudflare-deploy/references/r2/configuration.md`: **wrangler.jsonc:**
- `.claude/skills/cloudflare-deploy/references/r2/gotchas.md`: **Reason:** `include` with metadata may return fewer objects per page to fit metadata.
- `.claude/skills/cloudflare-deploy/references/r2/patterns.md`: Enable r2.dev in dashboard for simple public access: `https://pub-${hashId}.r2.dev/${key}` Or add custom domain via dashboard: `https://files.example.com/${key}`
- `.claude/skills/cloudflare-deploy/references/r2/README.md`: S3-compatible object storage with zero egress fees, optimized for large file storage and delivery.
- `.claude/skills/cloudflare-deploy/references/realtime-sfu/api.md`: **Sessions:** PeerConnection to Cloudflare edge **Tracks:** Media/data channels (audio/video/datachannel) **No rooms:** Build presence via track sharing
- `.claude/skills/cloudflare-deploy/references/realtime-sfu/configuration.md`: **Backend (Workers):** Built-in fetch API, no additional packages required
- `.claude/skills/cloudflare-deploy/references/realtime-sfu/gotchas.md`: **Cause:** First STUN delayed during consensus forming (normal behavior) **Solution:** Subsequent connections are faster. CF detects DTLS ClientHello early to compensate.
- `.claude/skills/cloudflare-deploy/references/realtime-sfu/patterns.md`: Anycast: Last-mile <50ms (95%), no region select, NACK shield, distributed consensus
- `.claude/skills/cloudflare-deploy/references/realtime-sfu/README.md`: Expert guidance for building real-time audio/video/data applications using Cloudflare Realtime SFU (Selective Forwarding Unit).
- `.claude/skills/cloudflare-deploy/references/realtimekit/api.md`: Complete API reference for Meeting object, REST endpoints, and SDK methods.
- `.claude/skills/cloudflare-deploy/references/realtimekit/configuration.md`: Configuration guide for RealtimeKit setup, client SDKs, and wrangler integration.
- `.claude/skills/cloudflare-deploy/references/realtimekit/gotchas.md`: **Cause:** Auth token invalid/expired, API credentials lack permissions, or network blocks WebRTC **Solution:** Verify token validity, check API token has **Realtime / Realtime Admin** permissions, enable TURN service for restrictive networks
- `.claude/skills/cloudflare-deploy/references/realtimekit/patterns.md`: RealtimeKit provides 133+ pre-built Stencil.js Web Components with framework wrappers:
- `.claude/skills/cloudflare-deploy/references/realtimekit/README.md`: Expert guidance for building real-time video and audio applications using **Cloudflare RealtimeKit** - a comprehensive SDK suite for adding customizable live video and voice to web or mobile applications.
- `.claude/skills/cloudflare-deploy/references/sandbox/api.md`: Each session maintains own shell state, env vars, cwd, process namespace.
- `.claude/skills/cloudflare-deploy/references/sandbox/configuration.md`: **Sleep Config**: - `sleepAfter`: Duration string (e.g., '5m', '10m', '1h') - default: '10m' - `keepAlive: false`: Auto-sleep (default, cost-optimized) - `keepAlive: true`: Never sleep (higher cost, requires explicit `destroy()`) - Sleeping sandboxes wake automatically (cold start)
- `.claude/skills/cloudflare-deploy/references/sandbox/gotchas.md`: **Cause:** `keepAlive: true` without calling `destroy()` **Solution:** Always call `destroy()` when done with keepAlive containers
- `.claude/skills/cloudflare-deploy/references/sandbox/patterns.md`: **Dockerfile**:
- `.claude/skills/cloudflare-deploy/references/sandbox/README.md`: Secure isolated code execution in containers on Cloudflare's edge. Run untrusted code, manage files, expose services, integrate with AI agents.
- `.claude/skills/cloudflare-deploy/references/secrets-store/api.md`: **CRITICAL**: Async `.get()` required - secrets NOT directly available.
- `.claude/skills/cloudflare-deploy/references/secrets-store/configuration.md`: **wrangler.jsonc**:
- `.claude/skills/cloudflare-deploy/references/secrets-store/gotchas.md`: **Cause:** Assuming `.get()` returns null on failure instead of throwing **Solution:** Always wrap `.get()` calls in try/catch blocks to handle errors gracefully
- `.claude/skills/cloudflare-deploy/references/secrets-store/patterns.md`: Zero-downtime rotation with versioned naming (`api_key_v1`, `api_key_v2`):
- `.claude/skills/cloudflare-deploy/references/secrets-store/README.md`: Account-level encrypted secret management for Workers and AI Gateway.
- `.claude/skills/cloudflare-deploy/references/smart-placement/api.md`: Query Worker placement status via Cloudflare API:
- `.claude/skills/cloudflare-deploy/references/smart-placement/configuration.md`: **Note:** Smart Placement vs Explicit Placement are separate features. Smart Placement (`mode: "smart"`) uses automatic analysis. For manual placement control, see explicit placement options (`region`, `host`, `hostname` fields - not covered in this reference).
- `.claude/skills/cloudflare-deploy/references/smart-placement/gotchas.md`: **Cause:** Not enough traffic for Smart Placement to analyze **Solution:** - Ensure Worker receives consistent global traffic - Wait longer (analysis takes up to 15 minutes) - Send test traffic from multiple global locations - Check Worker has fetch event handler
- `.claude/skills/cloudflare-deploy/references/smart-placement/patterns.md`: **Frontend:** Runs at edge for fast user response **Backend:** Smart Placement runs close to database
- `.claude/skills/cloudflare-deploy/references/smart-placement/README.md`: Automatic workload placement optimization to minimize latency by running Workers closer to backend infrastructure rather than end users.
- `.claude/skills/cloudflare-deploy/references/snippets/api.md`: Access Cloudflare-specific metadata about the request:
- `.claude/skills/cloudflare-deploy/references/snippets/configuration.md`: **Best for**: Quick tests, single snippets, visual rule building
- `.claude/skills/cloudflare-deploy/references/snippets/gotchas.md`: Runtime error or syntax error. Wrap code in try/catch:
- `.claude/skills/cloudflare-deploy/references/snippets/patterns.md`: **Rule:** `true` (all requests)
- `.claude/skills/cloudflare-deploy/references/snippets/README.md`: Expert guidance for **Cloudflare Snippets ONLY** - a lightweight JavaScript-based edge logic platform for modifying HTTP requests and responses. Snippets run as part of the Ruleset Engine and are included at no additional cost on paid plans (Pro, Business, Enterprise).
- `.claude/skills/cloudflare-deploy/references/spectrum/api.md`: **Metrics:** - `bytesIngress` - Bytes received from clients - `bytesEgress` - Bytes sent to clients - `count` - Number of connections - `duration` - Connection duration (seconds)
- `.claude/skills/cloudflare-deploy/references/spectrum/configuration.md`: Use when origin is a single server with static IP.
- `.claude/skills/cloudflare-deploy/references/spectrum/gotchas.md`: **Problem:** Connections fail or timeout **Cause:** Origin firewall blocking Cloudflare IPs, origin service not running, incorrect DNS **Solution:** 1. Verify origin firewall allows Cloudflare IP ranges 2. Check origin service running on correct port 3. Ensure DNS record is CNAME (not A/AAAA) 4....
- `.claude/skills/cloudflare-deploy/references/spectrum/patterns.md`: **Terraform:**
- `.claude/skills/cloudflare-deploy/references/spectrum/README.md`: Cloudflare Spectrum provides security and acceleration for ANY TCP or UDP-based application. It's a global Layer 4 (L4) reverse proxy running on Cloudflare's edge nodes that routes MQTT, email, file transfer, version control, games, and more through Cloudflare to mask origins and protect from DDo...
- `.claude/skills/cloudflare-deploy/references/static-assets/api.md`: The `ASSETS` binding provides access to static assets via the `Fetcher` interface.
- `.claude/skills/cloudflare-deploy/references/static-assets/configuration.md`: Minimal configuration requires only `assets.directory`:
- `.claude/skills/cloudflare-deploy/references/static-assets/gotchas.md`: Instead of `run_worker_first = true`, use array patterns:
- `.claude/skills/cloudflare-deploy/references/static-assets/patterns.md`: **1. Forward request to assets:**
- `.claude/skills/cloudflare-deploy/references/static-assets/README.md`: Expert guidance for deploying and configuring static assets with Cloudflare Workers. This skill covers configuration patterns, routing architectures, asset binding usage, and best practices for SPAs, SSG sites, and full-stack applications.
- `.claude/skills/cloudflare-deploy/references/stream/api-live.md`: Live input creation, status checking, simulcast, and WebRTC streaming.
- `.claude/skills/cloudflare-deploy/references/stream/api.md`: Upload, playback, live streaming, and management APIs.
- `.claude/skills/cloudflare-deploy/references/stream/configuration.md`: Setup, environment variables, and wrangler configuration.
- `.claude/skills/cloudflare-deploy/references/stream/gotchas.md`: **Cause:** Uploaded file is not a valid video format **Solution:** Ensure file is in supported format (MP4, MKV, MOV, AVI, FLV, MPEG-2 TS/PS, MXF, LXF, GXF, 3GP, WebM, MPG, QuickTime)
- `.claude/skills/cloudflare-deploy/references/stream/patterns.md`: Common workflows, full-stack flows, and best practices.
- `.claude/skills/cloudflare-deploy/references/stream/README.md`: Serverless live and on-demand video streaming platform with one API.
- `.claude/skills/cloudflare-deploy/references/tail-workers/api.md`: **Parameters:** - `events`: Array of `TraceItem` objects (one per producer invocation) - `env`: Bindings (KV, D1, R2, env vars, etc.) - `ctx`: Context with `waitUntil()` for async work
- `.claude/skills/cloudflare-deploy/references/tail-workers/configuration.md`: Create a Worker with a `tail()` handler:
- `.claude/skills/cloudflare-deploy/references/tail-workers/gotchas.md`: **Problem:** Async work doesn't complete or tail Worker times out **Cause:** Handlers exit immediately; awaiting blocks processing **Solution:**
- `.claude/skills/cloudflare-deploy/references/tail-workers/patterns.md`: While most tail Worker implementations are custom, these libraries may help:
- `.claude/skills/cloudflare-deploy/references/tail-workers/README.md`: Specialized Workers that consume execution events from producer Workers for logging, debugging, analytics, and observability.
- `.claude/skills/cloudflare-deploy/references/terraform/api.md`: Query existing Cloudflare resources to reference in your configurations.
- `.claude/skills/cloudflare-deploy/references/terraform/configuration.md`: Complete resource configurations for Cloudflare infrastructure.
- `.claude/skills/cloudflare-deploy/references/terraform/gotchas.md`: Common issues, security considerations, and best practices.
- `.claude/skills/cloudflare-deploy/references/terraform/patterns.md`: Architecture patterns, multi-environment setups, and real-world use cases.
- `.claude/skills/cloudflare-deploy/references/terraform/README.md`: **Expert guidance for Cloudflare Terraform Provider - infrastructure as code for Cloudflare resources.**
- `.claude/skills/cloudflare-deploy/references/tunnel/api.md`: **Base URL**: `https://api.cloudflare.com/client/v4`
- `.claude/skills/cloudflare-deploy/references/tunnel/configuration.md`: Tunnels use one of two config sources:
- `.claude/skills/cloudflare-deploy/references/tunnel/gotchas.md`: **Cause:** Tunnel not running or not connected **Solution:**
- `.claude/skills/cloudflare-deploy/references/tunnel/networking.md`: Cloudflared requires outbound access on:
- `.claude/skills/cloudflare-deploy/references/tunnel/patterns.md`: Run same config on multiple machines. Cloudflare automatically load balances. Long-lived connections (WebSocket, SSH) may drop during updates.
- `.claude/skills/cloudflare-deploy/references/tunnel/README.md`: Secure outbound-only connections between infrastructure and Cloudflare's global network.
- `.claude/skills/cloudflare-deploy/references/turn/api.md`: Complete API documentation for Cloudflare TURN service credentials and key management.
- `.claude/skills/cloudflare-deploy/references/turn/configuration.md`: Setup and configuration for Cloudflare TURN service in Workers and applications.
- `.claude/skills/cloudflare-deploy/references/turn/gotchas.md`: Common mistakes, security best practices, and troubleshooting for Cloudflare TURN.
- `.claude/skills/cloudflare-deploy/references/turn/patterns.md`: Production-ready patterns for implementing Cloudflare TURN in WebRTC applications.
- `.claude/skills/cloudflare-deploy/references/turn/README.md`: Expert guidance for implementing Cloudflare TURN Service in WebRTC applications.
- `.claude/skills/cloudflare-deploy/references/turnstile/api.md`: The Turnstile JavaScript API is available at `window.turnstile` after loading the script.
- `.claude/skills/cloudflare-deploy/references/turnstile/configuration.md`: Automatically renders widgets with `class="cf-turnstile"` on page load.
- `.claude/skills/cloudflare-deploy/references/turnstile/gotchas.md`: **Problem:** Client-only validation is easily bypassed.
- `.claude/skills/cloudflare-deploy/references/turnstile/patterns.md`
- `.claude/skills/cloudflare-deploy/references/turnstile/README.md`: Expert guidance for implementing Cloudflare Turnstile - a smart CAPTCHA alternative that protects websites from bots without showing traditional CAPTCHA puzzles.
- `.claude/skills/cloudflare-deploy/references/vectorize/api.md`: **returnMetadata:** `"none"` (fastest) → `"indexed"` (recommended) → `"all"` (topK max 20)
- `.claude/skills/cloudflare-deploy/references/vectorize/configuration.md`: **⚠️ Dimensions and metric are immutable** - cannot change after creation.
- `.claude/skills/cloudflare-deploy/references/vectorize/gotchas.md`: Insert/upsert/delete return immediately but vectors aren't queryable for 5-10 seconds.
- `.claude/skills/cloudflare-deploy/references/vectorize/patterns.md`
- `.claude/skills/cloudflare-deploy/references/vectorize/README.md`: Globally distributed vector database for AI applications. Store and query vector embeddings for semantic search, recommendations, RAG, and classification.
- `.claude/skills/cloudflare-deploy/references/waf/api.md`: Skip rules bypass subsequent rule evaluation. Two skip types:
- `.claude/skills/cloudflare-deploy/references/waf/configuration.md`: **API Token**: Create at https://dash.cloudflare.com/profile/api-tokens - Permission: `Zone.WAF Edit` or `Zone.Firewall Services Edit` - Zone Resources: Include specific zones or all zones
- `.claude/skills/cloudflare-deploy/references/waf/gotchas.md`: **Problem:** Rules execute in unexpected order **Cause:** Misunderstanding phase execution **Solution:**
- `.claude/skills/cloudflare-deploy/references/waf/patterns.md`: Combine all three phases for comprehensive protection:
- `.claude/skills/cloudflare-deploy/references/waf/README.md`: **Expertise**: Cloudflare Web Application Firewall (WAF) configuration, custom rules, managed rulesets, rate limiting, attack detection, and API integration
- `.claude/skills/cloudflare-deploy/references/web-analytics/configuration.md`: Dashboard → Web Analytics → Add site → Select hostname → Done
- `.claude/skills/cloudflare-deploy/references/web-analytics/gotchas.md`: **Symptom:** Only initial pageload counted **Fix:** Add `spa: true`:
- `.claude/skills/cloudflare-deploy/references/web-analytics/integration.md`: **Web Analytics is dashboard-only** - no programmatic API. This covers beacon integration.
- `.claude/skills/cloudflare-deploy/references/web-analytics/patterns.md`: Dashboard → Core Web Vitals → Click metric → Debug View shows top 5 problematic elements.
- `.claude/skills/cloudflare-deploy/references/web-analytics/README.md`: Privacy-first web analytics providing Core Web Vitals, traffic metrics, and user insights without compromising visitor privacy.
- `.claude/skills/cloudflare-deploy/references/workerd/api.md`: **Generate from wrangler.toml (Recommended):**
- `.claude/skills/cloudflare-deploy/references/workerd/configuration.md`: **Worker**: Run JS/Wasm code
- `.claude/skills/cloudflare-deploy/references/workerd/gotchas.md`: **Cause:** Compatibility date not set **Solution:** ❌ Wrong:
- `.claude/skills/cloudflare-deploy/references/workerd/patterns.md`: **Recommended:** Use Wrangler
- `.claude/skills/cloudflare-deploy/references/workerd/README.md`: V8-based JS/Wasm runtime powering Cloudflare Workers. Use as app server, dev tool, or HTTP proxy.
- `.claude/skills/cloudflare-deploy/references/workers-ai/api.md`: **Streaming:**
- `.claude/skills/cloudflare-deploy/references/workers-ai/configuration.md`: Create API token at: dash.cloudflare.com/profile/api-tokens (Workers AI - Read permission)
- `.claude/skills/cloudflare-deploy/references/workers-ai/gotchas.md`: Add binding to wrangler.jsonc:
- `.claude/skills/cloudflare-deploy/references/workers-ai/patterns.md`
- `.claude/skills/cloudflare-deploy/references/workers-ai/README.md`: Expert guidance for Cloudflare Workers AI - serverless GPU-powered AI inference at the edge.
- `.claude/skills/cloudflare-deploy/references/workers-for-platforms/api.md`: **Pagination:** SDK supports async iteration. Manual: add `?per_page=100&page=1` query params.
- `.claude/skills/cloudflare-deploy/references/workers-for-platforms/configuration.md`: Workers in a namespace run in **untrusted mode** by default for security: - No access to `request.cf` object - Isolated cache per Worker (no shared cache) - `caches.default` disabled
- `.claude/skills/cloudflare-deploy/references/workers-for-platforms/gotchas.md`: **Cause:** Attempting to get Worker that doesn't exist in namespace **Solution:** Catch error and return 404:
- `.claude/skills/cloudflare-deploy/references/workers-for-platforms/patterns.md`: **Complete isolation:** Create unique resources per customer - KV namespace per customer - D1 database per customer - R2 bucket per customer
- `.claude/skills/cloudflare-deploy/references/workers-for-platforms/README.md`: Multi-tenant platform with isolated customer code execution at scale.
- `.claude/skills/cloudflare-deploy/references/workers-playground/api.md`
- `.claude/skills/cloudflare-deploy/references/workers-playground/configuration.md`: Navigate to [workers.cloudflare.com/playground](https://workers.cloudflare.com/playground)
- `.claude/skills/cloudflare-deploy/references/workers-playground/gotchas.md`: **Limit:** 10ms (free), 50ms (paid)
- `.claude/skills/cloudflare-deploy/references/workers-playground/patterns.md`: **Note:** In-memory state (Maps, variables) resets on Worker cold start. Use Durable Objects or KV for persistence.
- `.claude/skills/cloudflare-deploy/references/workers-playground/README.md`: Cloudflare Workers Playground is a browser-based sandbox for instantly experimenting with, testing, and deploying Cloudflare Workers without authentication or setup. This skill provides patterns, APIs, and best practices specifically for Workers Playground development.
- `.claude/skills/cloudflare-deploy/references/workers-vpc/api.md`: Complete API reference for the Cloudflare Workers TCP Sockets API (`cloudflare:sockets`).
- `.claude/skills/cloudflare-deploy/references/workers-vpc/configuration.md`: Setup and configuration for TCP Sockets in Cloudflare Workers.
- `.claude/skills/cloudflare-deploy/references/workers-vpc/gotchas.md`: Common pitfalls, limitations, and solutions for TCP Sockets in Cloudflare Workers.
- `.claude/skills/cloudflare-deploy/references/workers-vpc/patterns.md`: Real-world patterns and examples for TCP Sockets in Cloudflare Workers.
- `.claude/skills/cloudflare-deploy/references/workers-vpc/README.md`: Connect Cloudflare Workers to private networks and internal infrastructure using TCP Sockets.
- `.claude/skills/cloudflare-deploy/references/workers/api.md`: **Never** `await` background operations - use `ctx.waitUntil()`.
- `.claude/skills/cloudflare-deploy/references/workers/configuration.md`: **Inheritable**: `name`, `main`, `compatibility_date`, `routes`, `workers_dev` **Non-inheritable**: All bindings (`vars`, `kv_namespaces`, `r2_buckets`, etc.) **Top-level only**: `migrations`, `keep_vars`, `send_metrics`
- `.claude/skills/cloudflare-deploy/references/workers/frameworks.md`: Workers-native web framework with excellent TypeScript support and middleware ecosystem.
- `.claude/skills/cloudflare-deploy/references/workers/gotchas.md`: **Cause:** Worker exceeded CPU time limit (10ms standard, 30ms unbound) **Solution:** Use `ctx.waitUntil()` for background work, offload heavy compute to Durable Objects, or consider Workers AI for ML workloads
- `.claude/skills/cloudflare-deploy/references/workers/patterns.md`: **Production**: Use Hono, itty-router, or Worktop (see [frameworks.md](./frameworks.md))
- `.claude/skills/cloudflare-deploy/references/workers/README.md`: Expert guidance for building, deploying, and optimizing Cloudflare Workers applications.
- `.claude/skills/cloudflare-deploy/references/workflows/api.md`: Params and step returns must be `Rpc.Serializable<T>`:
- `.claude/skills/cloudflare-deploy/references/workflows/configuration.md`: Each class extends `WorkflowEntrypoint` with its own `Params` type.
- `.claude/skills/cloudflare-deploy/references/workflows/gotchas.md`: **Cause:** Step execution exceeding 10 minute default timeout or configured timeout **Solution:** Set custom timeout with `step.do('long operation', {timeout: '30 minutes'}, async () => {...})` or increase CPU limit in wrangler.jsonc (max 5min CPU time)
- `.claude/skills/cloudflare-deploy/references/workflows/patterns.md`: See: [configuration.md](./configuration.md), [api.md](./api.md), [gotchas.md](./gotchas.md)
- `.claude/skills/cloudflare-deploy/references/workflows/README.md`: Durable multi-step applications with automatic retries, state persistence, and long-running execution.
- `.claude/skills/cloudflare-deploy/references/wrangler/api.md`: Node.js APIs for testing and development.
- `.claude/skills/cloudflare-deploy/references/wrangler/auth.md`: Authenticate with Cloudflare before deploying Workers or Pages.
- `.claude/skills/cloudflare-deploy/references/wrangler/configuration.md`: Configuration reference for wrangler.jsonc (recommended).
- `.claude/skills/cloudflare-deploy/references/wrangler/gotchas.md`: **Cause:** Confusion between binding name (code) and resource ID **Solution:** Bindings use `binding` (code name) and `id`/`database_id`/`bucket_name` (resource ID). Preview bindings need separate IDs: `preview_id`, `preview_database_id`
- `.claude/skills/cloudflare-deploy/references/wrangler/patterns.md`: Common workflows and best practices.
- `.claude/skills/cloudflare-deploy/references/wrangler/README.md`: Official CLI for Cloudflare Workers - develop, manage, and deploy Workers from the command line.
- `.claude/skills/cloudflare-deploy/references/zaraz/api.md`: Client-side JavaScript API for tracking events, setting properties, and managing consent.
- `.claude/skills/cloudflare-deploy/references/zaraz/configuration.md`: Fires on `pushState`, `replaceState`, hash changes. **No manual tracking needed.**
- `.claude/skills/cloudflare-deploy/references/zaraz/gotchas.md`: **Check:** 1. Tool enabled in dashboard (green dot) 2. Trigger conditions met 3. Consent granted for tool's purpose 4. Tool credentials correct (GA4: `G-XXXXXXXXXX`, FB: numeric only)
- `.claude/skills/cloudflare-deploy/references/zaraz/IMPLEMENTATION_SUMMARY.md`: All tasks loaded 366 lines regardless of need.
- `.claude/skills/cloudflare-deploy/references/zaraz/patterns.md`: **History Change Trigger (Recommended):** Configure in dashboard - no code needed, Zaraz auto-detects route changes.
- `.claude/skills/cloudflare-deploy/references/zaraz/README.md`: Expert guidance for Cloudflare Zaraz - server-side tag manager for loading third-party tools at the edge.

## Cloudflare Platform Skill

Comprehensive Cloudflare platform skill covering Workers, Pages, storage (KV, D1, R2), AI (Workers AI, Vectorize, Agents SDK), networking (Tunnel, Spectrum), security (WAF, DDoS), and infrastructure-as-code (Terraform, Pulumi). Use for any Cloudflare development task. Biases towards retrieval fro...

- `.claude/skills/cloudflare/SKILL.md`
- `.claude/skills/cloudflare/references/agents-sdk/api.md`: For AI chat with auto-streaming, message history, tools, resumable streaming.
- `.claude/skills/cloudflare/references/agents-sdk/configuration.md`: **Type-safe pattern:**
- `.claude/skills/cloudflare/references/agents-sdk/gotchas.md`: **Cause:** Mutating state directly or not calling `setState()` after modifications **Solution:** Always use `setState()` with immutable updates:
- `.claude/skills/cloudflare/references/agents-sdk/patterns.md`: **Server (AIChatAgent):**
- `.claude/skills/cloudflare/references/agents-sdk/README.md`: Cloudflare Agents SDK enables building AI-powered agents on Durable Objects with state, WebSockets, SQL, scheduling, and AI integration.
- `.claude/skills/cloudflare/references/ai-gateway/configuration.md`: AI > AI Gateway > Create Gateway > Configure (auth, caching, rate limiting, logging)
- `.claude/skills/cloudflare/references/ai-gateway/dynamic-routing.md`: Configure complex routing in dashboard without code changes. Use route names instead of model names.
- `.claude/skills/cloudflare/references/ai-gateway/features.md`: Dashboard: Settings → Cache Responses → Enable
- `.claude/skills/cloudflare/references/ai-gateway/README.md`: Expert guidance for implementing Cloudflare AI Gateway - a universal gateway for AI model providers with analytics, caching, rate limiting, and routing capabilities.
- `.claude/skills/cloudflare/references/ai-gateway/sdk-integration.md`
- `.claude/skills/cloudflare/references/ai-gateway/troubleshooting.md`: **Causes:** - Different request params (temperature, etc.) - Streaming enabled - Caching disabled in settings
- `.claude/skills/cloudflare/references/ai-search/api.md`: **Operators:** `eq`, `ne`, `gt`, `gte`, `lt`, `lte`
- `.claude/skills/cloudflare/references/ai-search/configuration.md`: Dashboard: AI Search → Create Instance → Select R2 bucket
- `.claude/skills/cloudflare/references/ai-search/gotchas.md`: **Timestamp precision:** Use seconds (10-digit), not milliseconds.
- `.claude/skills/cloudflare/references/ai-search/patterns.md`: Enable for high-stakes use cases (adds ~300ms latency):
- `.claude/skills/cloudflare/references/ai-search/README.md`: Expert guidance for implementing Cloudflare AI Search (formerly AutoRAG), Cloudflare's managed semantic search and RAG service.
- `.claude/skills/cloudflare/references/analytics-engine/api.md`: Fire-and-forget (returns `void`, not Promise). Writes happen asynchronously.
- `.claude/skills/cloudflare/references/analytics-engine/configuration.md`: Multiple datasets for separate concerns:
- `.claude/skills/cloudflare/references/analytics-engine/gotchas.md`: **Problem:** Queries return fewer points than written at >1M writes/min.
- `.claude/skills/cloudflare/references/analytics-engine/patterns.md`
- `.claude/skills/cloudflare/references/analytics-engine/README.md`: Expert guidance for implementing unlimited-cardinality analytics at scale using Cloudflare Workers Analytics Engine.
- `.claude/skills/cloudflare/references/api-shield/api.md`: Base: `/zones/{zone_id}/api_gateway`
- `.claude/skills/cloudflare/references/api-shield/configuration.md`: **Upload schema (Dashboard):**
- `.claude/skills/cloudflare/references/api-shield/gotchas.md`: **Cause:** Classic rules still active, conflicting with new system **Solution:** 1. Delete ALL Classic schema validation rules 2. Clear Cloudflare cache (wait 5 min) 3. Re-upload schema via new Schema Validation 2.0 interface 4. Verify in Security > Events 5. Check action is set (Log/Block)
- `.claude/skills/cloudflare/references/api-shield/patterns.md`: Detects sequential resource access (e.g., `/users/1`, `/users/2`, `/users/3`).
- `.claude/skills/cloudflare/references/api-shield/README.md`: Expert guidance for API Shield - comprehensive API security suite for discovery, protection, and monitoring.
- `.claude/skills/cloudflare/references/api/api.md`: **Create token**: Dashboard → My Profile → API Tokens → Create Token
- `.claude/skills/cloudflare/references/api/configuration.md`: **Security:** Never commit tokens. Use `.env` files (gitignored) or secret managers.
- `.claude/skills/cloudflare/references/api/gotchas.md`: **Actual Limits:** - **1200 requests / 5 minutes** per user/token (global) - **200 requests / second** per IP address - **GraphQL: 320 / 5 minutes** (cost-based)
- `.claude/skills/cloudflare/references/api/patterns.md`: **Problem:** API returns paginated results. Default page size is 20.
- `.claude/skills/cloudflare/references/api/README.md`: Guide for working with Cloudflare's REST API - authentication, SDK usage, common patterns, and troubleshooting.
- `.claude/skills/cloudflare/references/argo-smart-routing/api.md`: **Note on Smart Shield:** Argo Smart Routing is being integrated into Cloudflare's Smart Shield product. API endpoints remain stable; existing integrations continue to work without changes.
- `.claude/skills/cloudflare/references/argo-smart-routing/configuration.md`: **Note on Smart Shield Evolution:** Argo Smart Routing is being integrated into Smart Shield. Configuration methods below remain valid; Terraform and IaC patterns unchanged.
- `.claude/skills/cloudflare/references/argo-smart-routing/gotchas.md`: **Smart Shield Note:** Argo Smart Routing evolving into Smart Shield. Best practices below remain applicable; monitor Cloudflare changelog for Smart Shield updates.
- `.claude/skills/cloudflare/references/argo-smart-routing/patterns.md`: **Flow:** Visitor → Edge (Lower-Tier) → [Cache Miss] → Upper-Tier → [Cache Miss + Argo] → Origin
- `.claude/skills/cloudflare/references/argo-smart-routing/README.md`: Cloudflare Argo Smart Routing is a performance optimization service that detects real-time network issues and routes web traffic across the most efficient network path. It continuously monitors network conditions and intelligently routes traffic through the fastest, most reliable routes in Cloudf...
- `.claude/skills/cloudflare/references/bindings/api.md`: Cloudflare generates binding types via `npx wrangler types`. This creates `.wrangler/types/runtime.d.ts` with your Env interface.
- `.claude/skills/cloudflare/references/bindings/configuration.md`: **Create commands:**
- `.claude/skills/cloudflare/references/bindings/gotchas.md`: **Why it breaks:** - `env` not available in global scope - If using workarounds, secrets may not update without redeployment - Leads to "Cannot read property 'X' of undefined" errors
- `.claude/skills/cloudflare/references/bindings/patterns.md`: **Why RPC?** Zero latency (same datacenter), no DNS, free, type-safe.
- `.claude/skills/cloudflare/references/bindings/README.md`: Expert guidance on Cloudflare Workers Bindings - the runtime APIs that connect Workers to Cloudflare platform resources.
- `.claude/skills/cloudflare/references/bot-management/api.md`: See [patterns.md](./patterns.md) for Workers examples: mobile app allowlisting, corporate proxy exemption, datacenter detection, conditional delay, and more.
- `.claude/skills/cloudflare/references/bot-management/configuration.md`: **Note:** Dashboard paths differ between old and new UI: - **New:** Security > Settings > Filter "Bot traffic" - **Old:** Security > Bots
- `.claude/skills/cloudflare/references/bot-management/gotchas.md`: **Cause:** Bot Management didn't run (internal Cloudflare request, Worker routing to zone (Orange-to-Orange), or request handled before BM (Redirect Rules, etc.)) **Solution:** Check request flow and ensure Bot Management runs in request lifecycle
- `.claude/skills/cloudflare/references/bot-management/patterns.md`
- `.claude/skills/cloudflare/references/bot-management/README.md`: Enterprise-grade bot detection, protection, and mitigation using ML/heuristics, bot scores, JavaScript detections, and verified bot handling.
- `.claude/skills/cloudflare/references/browser-rendering/api.md`: **Base:** `https://api.cloudflare.com/client/v4/accounts/{accountId}/browser-rendering` **Auth:** `Authorization: Bearer <token>` (Browser Rendering - Edit permission)
- `.claude/skills/cloudflare/references/browser-rendering/configuration.md`: **Use Cloudflare packages** - standard `puppeteer`/`playwright` won't work in Workers.
- `.claude/skills/cloudflare/references/browser-rendering/gotchas.md`: *Subject to fair-use policy.
- `.claude/skills/cloudflare/references/browser-rendering/patterns.md`: Keep sessions alive for performance:
- `.claude/skills/cloudflare/references/browser-rendering/README.md`: **Description**: Expert knowledge for Cloudflare Browser Rendering - control headless Chrome on Cloudflare's global network for browser automation, screenshots, PDFs, web scraping, testing, and content generation.
- `.claude/skills/cloudflare/references/c3/api.md`
- `.claude/skills/cloudflare/references/c3/configuration.md`: C3 generates **placeholder IDs** that must be replaced before deploy:
- `.claude/skills/cloudflare/references/c3/gotchas.md`: **Error:** "Invalid namespace ID" **Fix:** Replace placeholders in wrangler.jsonc with real IDs:
- `.claude/skills/cloudflare/references/c3/patterns.md`: **Non-interactive requires:**
- `.claude/skills/cloudflare/references/c3/README.md`: Official CLI for scaffolding Cloudflare Workers and Pages projects with templates, TypeScript, and instant deployment.
- `.claude/skills/cloudflare/references/cache-reserve/api.md`: Cache Reserve is a **zone-level configuration**, not a per-request API. It works automatically when enabled for the zone:
- `.claude/skills/cloudflare/references/cache-reserve/configuration.md`: **Minimum steps to enable:**
- `.claude/skills/cloudflare/references/cache-reserve/gotchas.md`: **Cause:** Asset is not cacheable, TTL < 10 hours, Content-Length header missing, or blocking headers present (Set-Cookie, Vary: *) **Solution:** Ensure minimum TTL of 10+ hours (`Cache-Control: public, max-age=36000`), add Content-Length header, remove Set-Cookie header, and set `Vary: Accept-En...
- `.claude/skills/cloudflare/references/cache-reserve/patterns.md`: **Note**: This modifies response headers to meet eligibility criteria but does NOT directly control Cache Reserve storage (which is zone-level automatic).
- `.claude/skills/cloudflare/references/cache-reserve/README.md`: **Persistent cache storage built on R2 for long-term content retention**
- `.claude/skills/cloudflare/references/containers/api.md`: **getByName(id)** - Named instance for session affinity, per-user state **getRandom()** - Random instance for load balancing stateless services
- `.claude/skills/cloudflare/references/containers/configuration.md`: Key config requirements: - `image` - Path to Dockerfile or directory containing Dockerfile - `class_name` - Must match Container class export name - `max_instances` - Max concurrent container instances - Must configure Durable Objects binding AND migrations
- `.claude/skills/cloudflare/references/containers/gotchas.md`: **Problem:** WebSocket connections fail silently
- `.claude/skills/cloudflare/references/containers/patterns.md`: **Use:** User sessions, WebSocket, stateful games, per-user caching.
- `.claude/skills/cloudflare/references/containers/README.md`: **APPLIES TO: Cloudflare Containers ONLY - NOT general Cloudflare Workers**
- `.claude/skills/cloudflare/references/cron-triggers/api.md`: **JavaScript:** Same signature without types **Python:** `class Default(WorkerEntrypoint): async def scheduled(self, controller, env, ctx)`
- `.claude/skills/cloudflare/references/cron-triggers/configuration.md`: Schedule crons during low-carbon periods for carbon-aware execution:
- `.claude/skills/cloudflare/references/cron-triggers/gotchas.md`: **Problem:** Cron runs at wrong time relative to local timezone **Cause:** All crons execute in UTC, no local timezone support **Solution:** Convert local time to UTC manually
- `.claude/skills/cloudflare/references/cron-triggers/patterns.md`: **View logs:** `npx wrangler tail` or Dashboard → Workers & Pages → Worker → Logs
- `.claude/skills/cloudflare/references/cron-triggers/README.md`: Schedule Workers execution using cron expressions. Runs on Cloudflare's global network during underutilized periods.
- `.claude/skills/cloudflare/references/d1/api.md`: Long-running sessions for operations exceeding 30s timeout (up to 15 min).
- `.claude/skills/cloudflare/references/d1/configuration.md`: File structure: `migrations/0001_initial_schema.sql`, `0002_add_posts.sql`, etc.
- `.claude/skills/cloudflare/references/d1/gotchas.md`: **Cause:** Using string interpolation instead of prepared statements with bind() **Solution:** ALWAYS use prepared statements: `env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).all()` instead of string interpolation which allows attackers to inject malicious SQL
- `.claude/skills/cloudflare/references/d1/patterns.md`: **Use replicas for**: Analytics dashboards, search results, public queries (eventual consistency OK) **Use primary for**: Read-after-write, financial transactions, authentication (consistency required)
- `.claude/skills/cloudflare/references/d1/README.md`: Expert guidance for Cloudflare D1, a serverless SQLite database designed for horizontal scale-out across multiple databases.
- `.claude/skills/cloudflare/references/ddos/api.md`: **SDK Version**: Requires `cloudflare` >= 3.0.0 for ruleset phase methods.
- `.claude/skills/cloudflare/references/ddos/configuration.md`: Multiple override layers apply in this order (higher precedence wins):
- `.claude/skills/cloudflare/references/ddos/gotchas.md`: **Cause**: Sensitivity too high, wrong action, or missing exceptions **Solution**: 1. Lower sensitivity for specific rule/category 2. Use `log` action first to validate (Enterprise Advanced) 3. Add exception with custom expression (e.g., allowlist IPs) 4. Query flagged requests via GraphQL Analyt...
- `.claude/skills/cloudflare/references/ddos/patterns.md`: Layered security stack: DDoS + WAF + Rate Limiting + Bot Management.
- `.claude/skills/cloudflare/references/ddos/README.md`: Autonomous, always-on protection against DDoS attacks across L3/4 and L7.
- `.claude/skills/cloudflare/references/do-storage/api.md`
- `.claude/skills/cloudflare/references/do-storage/configuration.md`: **wrangler.jsonc:**
- `.claude/skills/cloudflare/references/do-storage/gotchas.md`: Durable Objects use **input/output gates** to prevent race conditions:
- `.claude/skills/cloudflare/references/do-storage/patterns.md`: **Note:** `PRAGMA user_version` is **not supported** in Durable Objects SQLite storage. Use a `_sql_schema_migrations` table instead:
- `.claude/skills/cloudflare/references/do-storage/README.md`: Persistent storage API for Durable Objects with SQLite and KV backends, PITR, and automatic concurrency control.
- `.claude/skills/cloudflare/references/do-storage/testing.md`: Testing Durable Objects with storage using `vitest-pool-workers`.
- `.claude/skills/cloudflare/references/durable-objects/api.md`: **When to use:** - `waitUntil()`: Background cleanup, logging, non-critical work after response - `blockConcurrencyWhile()`: First-time init, schema migration, critical state setup
- `.claude/skills/cloudflare/references/durable-objects/configuration.md`: Specify jurisdiction at ID creation for data residency compliance:
- `.claude/skills/cloudflare/references/durable-objects/gotchas.md`: **Problem:** Variables lost after hibernation **Cause:** DO auto-hibernates when idle; in-memory state not persisted **Solution:** Use `ctx.storage` for critical data, `ws.serializeAttachment()` for per-connection metadata
- `.claude/skills/cloudflare/references/durable-objects/patterns.md`: **RPC** (compat ≥2024-04-03): Type-safe, simpler, default for new projects **fetch()**: Legacy compat, HTTP semantics, proxying
- `.claude/skills/cloudflare/references/durable-objects/README.md`: Expert guidance for building stateful applications with Cloudflare Durable Objects.
- `.claude/skills/cloudflare/references/email-routing/api.md`: Main interface for incoming emails:
- `.claude/skills/cloudflare/references/email-routing/configuration.md`: **Connect to Email Routing:**
- `.claude/skills/cloudflare/references/email-routing/gotchas.md`: **Problem:** "stream already consumed" or worker hangs
- `.claude/skills/cloudflare/references/email-routing/patterns.md`
- `.claude/skills/cloudflare/references/email-routing/README.md`: Cloudflare Email Routing enables custom email addresses for your domain that route to verified destination addresses. It's free, privacy-focused (no storage/access), and includes Email Workers for programmatic email processing.
- `.claude/skills/cloudflare/references/email-workers/api.md`: Complete API reference for Cloudflare Email Workers runtime.
- `.claude/skills/cloudflare/references/email-workers/configuration.md`: Use postal-mime v2.x, mimetext v3.x.
- `.claude/skills/cloudflare/references/email-workers/gotchas.md`: Replies fail silently without DMARC. Verify: `dig TXT _dmarc.example.com`
- `.claude/skills/cloudflare/references/email-workers/patterns.md`
- `.claude/skills/cloudflare/references/email-workers/README.md`: Process incoming emails programmatically using Cloudflare Workers runtime.
- `.claude/skills/cloudflare/references/graphql-api/api.md`: The schema has a single entry point: `Query.viewer`. Mutations are not supported.
- `.claude/skills/cloudflare/references/graphql-api/configuration.md`: Create tokens at: [dash.cloudflare.com > Account API Tokens](https://dash.cloudflare.com/?to=/:account/api-tokens)
- `.claude/skills/cloudflare/references/graphql-api/gotchas.md`: The GraphQL rate limit is separate from the general API limit. Exceeding either results in `HTTP 429` and blocks all API calls for 5 minutes. Enterprise customers can contact support to raise limits.
- `.claude/skills/cloudflare/references/graphql-api/patterns.md`: Use time dimension granularity matching your range (see Best Practices below).
- `.claude/skills/cloudflare/references/graphql-api/README.md`: Query analytics data across all Cloudflare products via a single GraphQL endpoint. Covers HTTP requests, Workers metrics, DNS, Firewall events, Network Analytics, and 70+ other datasets.
- `.claude/skills/cloudflare/references/hyperdrive/api.md`: See [README.md](./README.md) for overview, [configuration.md](./configuration.md) for setup.
- `.claude/skills/cloudflare/references/hyperdrive/configuration.md`: See [README.md](./README.md) for overview.
- `.claude/skills/cloudflare/references/hyperdrive/gotchas.md`: See [README.md](./README.md), [configuration.md](./configuration.md), [api.md](./api.md), [patterns.md](./patterns.md).
- `.claude/skills/cloudflare/references/hyperdrive/patterns.md`: See [README.md](./README.md), [configuration.md](./configuration.md), [api.md](./api.md).
- `.claude/skills/cloudflare/references/hyperdrive/README.md`: Accelerates database queries from Workers via connection pooling, edge setup, query caching.
- `.claude/skills/cloudflare/references/images/api.md`: **Params:** `w=`, `h=`, `fit=`, `q=`, `f=`, `dpr=`, `gravity=`, `sharpen=`, `blur=`, `rotate=`, `background=`, `metadata=`
- `.claude/skills/cloudflare/references/images/configuration.md`: Add to `wrangler.toml`:
- `.claude/skills/cloudflare/references/images/gotchas.md`: **Support:** AVIF (Chrome 85+, Firefox 93+, Safari 16.4+), WebP (Chrome 23+, Firefox 65+, Safari 14+)
- `.claude/skills/cloudflare/references/images/patterns.md`
- `.claude/skills/cloudflare/references/images/README.md`: **Cloudflare Images** is an end-to-end image management solution providing storage, transformation, optimization, and delivery at scale via Cloudflare's global network.
- `.claude/skills/cloudflare/references/kv/api.md`: See [gotchas.md](./gotchas.md) for detailed error patterns and solutions.
- `.claude/skills/cloudflare/references/kv/configuration.md`: **wrangler.jsonc:**
- `.claude/skills/cloudflare/references/kv/gotchas.md`: **Cause:** Eventual consistency means writes may not be immediately visible in other regions **Solution:** Don't read immediately after write; return confirmation without reading or use the local value you just wrote. Writes visible immediately in same location, ≤60s globally
- `.claude/skills/cloudflare/references/kv/patterns.md`
- `.claude/skills/cloudflare/references/kv/README.md`: Globally-distributed, eventually-consistent key-value store optimized for high read volume and low latency.
- `.claude/skills/cloudflare/references/miniflare/api.md`: **Fetch (no HTTP server):**
- `.claude/skills/cloudflare/references/miniflare/configuration.md`: **Critical:** Use `compatibilityDate: "2026-01-01"` or latest to match production runtime. Old dates limit available APIs.
- `.claude/skills/cloudflare/references/miniflare/gotchas.md`: **Not supported:** - Analytics Engine (use mocks) - Cloudflare Images/Stream - Browser Rendering API - Tail Workers - Workers for Platforms (partial support)
- `.claude/skills/cloudflare/references/miniflare/patterns.md`: **Quick guide:** - Unit tests → getPlatformProxy - Integration tests → Miniflare API - Vitest workflows → vitest-pool-workers
- `.claude/skills/cloudflare/references/miniflare/README.md`: Local simulator for Cloudflare Workers development/testing. Runs Workers in workerd sandbox implementing runtime APIs - no internet required.
- `.claude/skills/cloudflare/references/network-interconnect/api.md`: See [README.md](README.md) for overview.
- `.claude/skills/cloudflare/references/network-interconnect/configuration.md`: See [README.md](README.md) for overview.
- `.claude/skills/cloudflare/references/network-interconnect/gotchas.md`: **Cause:** Cross-connect not installed, RX/TX fibers reversed, wrong fiber type, or low light levels **Solution:** 1. Verify cross-connect installed 2. Check fiber at patch panel 3. Swap RX/TX fibers 4. Check light with optical power meter (target > -20 dBm) 5. Contact account team
- `.claude/skills/cloudflare/references/network-interconnect/patterns.md`: See [README.md](README.md) for overview.
- `.claude/skills/cloudflare/references/network-interconnect/README.md`: Private, high-performance connectivity to Cloudflare's network. **Enterprise-only**.
- `.claude/skills/cloudflare/references/observability/api.md`: **Endpoint**: `https://api.cloudflare.com/client/v4/graphql`
- `.claude/skills/cloudflare/references/observability/configuration.md`: **Best Practice**: Use structured JSON logging for better indexing
- `.claude/skills/cloudflare/references/observability/gotchas.md`: **Cause:** Observability disabled, Worker not redeployed, no traffic, low sampling rate, or log size exceeds 256 KB **Solution:** Ensure `observability.enabled = true`, redeploy Worker, check `head_sampling_rate`, verify traffic
- `.claude/skills/cloudflare/references/observability/patterns.md`
- `.claude/skills/cloudflare/references/observability/README.md`: **Purpose**: Comprehensive guidance for implementing observability in Cloudflare Workers, covering traces, logs, metrics, and analytics.
- `.claude/skills/cloudflare/references/pages-functions/api.md`: **TypeScript:** See [configuration.md](./configuration.md) for `wrangler types` setup
- `.claude/skills/cloudflare/references/pages-functions/configuration.md`: **Generate types from wrangler.jsonc** (replaces deprecated `@cloudflare/workers-types`):
- `.claude/skills/cloudflare/references/pages-functions/gotchas.md`: **Problem:** `ctx.env.MY_BINDING` shows type error **Cause:** No type definition for `Env` **Solution:** Run `npx wrangler types` or manually define:
- `.claude/skills/cloudflare/references/pages-functions/patterns.md`: Non-blocking tasks after response sent (analytics, cleanup, webhooks):
- `.claude/skills/cloudflare/references/pages-functions/README.md`: Serverless functions on Cloudflare Pages using Workers runtime. Full-stack dev with file-based routing.
- `.claude/skills/cloudflare/references/pages/api.md`: **Rules**: `[param]` = single segment, `[[param]]` = multi-segment catchall, more specific wins.
- `.claude/skills/cloudflare/references/pages/configuration.md`: **Git deployment**: Dashboard → Project → Settings → Build settings Set build command, output dir, env vars. Framework auto-detection configures automatically.
- `.claude/skills/cloudflare/references/pages/gotchas.md`: **Problem**: Function endpoints return 404 or don't execute **Causes**: `_routes.json` excludes path; wrong file extension (`.jsx`/`.tsx`); Functions dir not at output root **Solution**: Check `_routes.json`, rename to `.ts`/`.js`, verify build output structure
- `.claude/skills/cloudflare/references/pages/patterns.md`: Enable Smart Placement for apps with D1 or centralized data sources:
- `.claude/skills/cloudflare/references/pages/README.md`: JAMstack platform for full-stack apps on Cloudflare's global network.
- `.claude/skills/cloudflare/references/pipelines/api.md`: **Key points:** - `send()` accepts single object or array - Always returns `Promise<void>` (no confirmation data) - Throws on network/validation errors (wrap in try/catch) - Use `ctx.waitUntil()` for fire-and-forget pattern
- `.claude/skills/cloudflare/references/pipelines/configuration.md`: Get stream ID: `npx wrangler pipelines streams list`
- `.claude/skills/cloudflare/references/pipelines/gotchas.md`: **Most common issue.** Events accepted (HTTP 200) but never appear in sink.
- `.claude/skills/cloudflare/references/pipelines/patterns.md`: **Why:** Structured streams drop invalid events silently. Client validation gives immediate feedback.
- `.claude/skills/cloudflare/references/pipelines/README.md`: ETL streaming platform for ingesting, transforming, and loading data into R2 with SQL transformations.
- `.claude/skills/cloudflare/references/pulumi/api.md`: Export resource identifiers:
- `.claude/skills/cloudflare/references/pulumi/configuration.md`: Serve static assets from Workers:
- `.claude/skills/cloudflare/references/pulumi/gotchas.md`: **Problem:** Worker fails with "Cannot use import statement outside a module" **Cause:** Pulumi doesn't bundle Worker code - uploads exactly what you provide **Solution:** Build Worker BEFORE Pulumi deploy
- `.claude/skills/cloudflare/references/pulumi/patterns.md`: **Use:** Canary releases, A/B testing, blue-green. Most apps use `WorkerScript` (auto-versioning).
- `.claude/skills/cloudflare/references/pulumi/README.md`: Expert guidance for Cloudflare Pulumi Provider (@pulumi/cloudflare).
- `.claude/skills/cloudflare/references/queues/api.md`: **CRITICAL WARNINGS:**
- `.claude/skills/cloudflare/references/queues/configuration.md`: **wrangler.jsonc:**
- `.claude/skills/cloudflare/references/queues/gotchas.md`: **Problem:** Throwing uncaught error in queue handler retries the entire batch, not just the failed message **Cause:** Uncaught exceptions propagate to the runtime, triggering batch-level retry **Solution:** Always wrap individual message processing in try/catch and call `msg.retry()` explicitly
- `.claude/skills/cloudflare/references/queues/patterns.md`: High priority: `max_batch_size: 5, max_batch_timeout: 1`. Low priority: `max_batch_size: 100, max_batch_timeout: 30`.
- `.claude/skills/cloudflare/references/queues/README.md`: Flexible message queuing for async task processing with guaranteed at-least-once delivery and configurable batching.
- `.claude/skills/cloudflare/references/r2-data-catalog/api.md`: R2 Data Catalog exposes standard [Apache Iceberg REST Catalog API](https://github.com/apache/iceberg/blob/main/open-api/rest-catalog-open-api.yaml).
- `.claude/skills/cloudflare/references/r2-data-catalog/configuration.md`: How to enable R2 Data Catalog and configure authentication.
- `.claude/skills/cloudflare/references/r2-data-catalog/gotchas.md`: Common problems → causes → solutions.
- `.claude/skills/cloudflare/references/r2-data-catalog/patterns.md`: Practical patterns for R2 Data Catalog with PyIceberg.
- `.claude/skills/cloudflare/references/r2-data-catalog/README.md`: Expert guidance for Cloudflare R2 Data Catalog - Apache Iceberg catalog built into R2 buckets.
- `.claude/skills/cloudflare/references/r2-sql/api.md`: SQL syntax, functions, operators, and data types for R2 SQL queries.
- `.claude/skills/cloudflare/references/r2-sql/configuration.md`: Setup and configuration for R2 SQL queries.
- `.claude/skills/cloudflare/references/r2-sql/gotchas.md`: Limitations, troubleshooting, and common pitfalls for R2 SQL.
- `.claude/skills/cloudflare/references/r2-sql/patterns.md`: Common patterns, use cases, and integration examples for R2 SQL.
- `.claude/skills/cloudflare/references/r2-sql/README.md`: Expert guidance for Cloudflare R2 SQL - serverless distributed query engine for Apache Iceberg tables.
- `.claude/skills/cloudflare/references/r2/api.md`
- `.claude/skills/cloudflare/references/r2/configuration.md`: **wrangler.jsonc:**
- `.claude/skills/cloudflare/references/r2/gotchas.md`: **Reason:** `include` with metadata may return fewer objects per page to fit metadata.
- `.claude/skills/cloudflare/references/r2/patterns.md`: Enable r2.dev in dashboard for simple public access: `https://pub-${hashId}.r2.dev/${key}` Or add custom domain via dashboard: `https://files.example.com/${key}`
- `.claude/skills/cloudflare/references/r2/README.md`: S3-compatible object storage with zero egress fees, optimized for large file storage and delivery.
- `.claude/skills/cloudflare/references/realtime-sfu/api.md`: **Sessions:** PeerConnection to Cloudflare edge **Tracks:** Media/data channels (audio/video/datachannel) **No rooms:** Build presence via track sharing
- `.claude/skills/cloudflare/references/realtime-sfu/configuration.md`: **Backend (Workers):** Built-in fetch API, no additional packages required
- `.claude/skills/cloudflare/references/realtime-sfu/gotchas.md`: **Cause:** First STUN delayed during consensus forming (normal behavior) **Solution:** Subsequent connections are faster. CF detects DTLS ClientHello early to compensate.
- `.claude/skills/cloudflare/references/realtime-sfu/patterns.md`: Anycast: Last-mile <50ms (95%), no region select, NACK shield, distributed consensus
- `.claude/skills/cloudflare/references/realtime-sfu/README.md`: Expert guidance for building real-time audio/video/data applications using Cloudflare Realtime SFU (Selective Forwarding Unit).
- `.claude/skills/cloudflare/references/realtimekit/api.md`: Complete API reference for Meeting object, REST endpoints, and SDK methods.
- `.claude/skills/cloudflare/references/realtimekit/configuration.md`: Configuration guide for RealtimeKit setup, client SDKs, and wrangler integration.
- `.claude/skills/cloudflare/references/realtimekit/gotchas.md`: **Cause:** Auth token invalid/expired, API credentials lack permissions, or network blocks WebRTC **Solution:** Verify token validity, check API token has **Realtime / Realtime Admin** permissions, enable TURN service for restrictive networks
- `.claude/skills/cloudflare/references/realtimekit/patterns.md`: RealtimeKit provides 133+ pre-built Stencil.js Web Components with framework wrappers:
- `.claude/skills/cloudflare/references/realtimekit/README.md`: Expert guidance for building real-time video and audio applications using **Cloudflare RealtimeKit** - a comprehensive SDK suite for adding customizable live video and voice to web or mobile applications.
- `.claude/skills/cloudflare/references/sandbox/api.md`: Each session maintains own shell state, env vars, cwd, process namespace.
- `.claude/skills/cloudflare/references/sandbox/configuration.md`: **Sleep Config**: - `sleepAfter`: Duration string (e.g., '5m', '10m', '1h') - default: '10m' - `keepAlive: false`: Auto-sleep (default, cost-optimized) - `keepAlive: true`: Never sleep (higher cost, requires explicit `destroy()`) - Sleeping sandboxes wake automatically (cold start)
- `.claude/skills/cloudflare/references/sandbox/gotchas.md`: **Cause:** `keepAlive: true` without calling `destroy()` **Solution:** Always call `destroy()` when done with keepAlive containers
- `.claude/skills/cloudflare/references/sandbox/patterns.md`: **Dockerfile**:
- `.claude/skills/cloudflare/references/sandbox/README.md`: Secure isolated code execution in containers on Cloudflare's edge. Run untrusted code, manage files, expose services, integrate with AI agents.
- `.claude/skills/cloudflare/references/secrets-store/api.md`: **CRITICAL**: Async `.get()` required - secrets NOT directly available.
- `.claude/skills/cloudflare/references/secrets-store/configuration.md`: **wrangler.jsonc**:
- `.claude/skills/cloudflare/references/secrets-store/gotchas.md`: **Cause:** Assuming `.get()` returns null on failure instead of throwing **Solution:** Always wrap `.get()` calls in try/catch blocks to handle errors gracefully
- `.claude/skills/cloudflare/references/secrets-store/patterns.md`: Zero-downtime rotation with versioned naming (`api_key_v1`, `api_key_v2`):
- `.claude/skills/cloudflare/references/secrets-store/README.md`: Account-level encrypted secret management for Workers and AI Gateway.
- `.claude/skills/cloudflare/references/smart-placement/api.md`: Query Worker placement status via Cloudflare API:
- `.claude/skills/cloudflare/references/smart-placement/configuration.md`: **Note:** Smart Placement vs Explicit Placement are separate features. Smart Placement (`mode: "smart"`) uses automatic analysis. For manual placement control, see explicit placement options (`region`, `host`, `hostname` fields - not covered in this reference).
- `.claude/skills/cloudflare/references/smart-placement/gotchas.md`: **Cause:** Not enough traffic for Smart Placement to analyze **Solution:** - Ensure Worker receives consistent global traffic - Wait longer (analysis takes up to 15 minutes) - Send test traffic from multiple global locations - Check Worker has fetch event handler
- `.claude/skills/cloudflare/references/smart-placement/patterns.md`: **Frontend:** Runs at edge for fast user response **Backend:** Smart Placement runs close to database
- `.claude/skills/cloudflare/references/smart-placement/README.md`: Automatic workload placement optimization to minimize latency by running Workers closer to backend infrastructure rather than end users.
- `.claude/skills/cloudflare/references/snippets/api.md`: Access Cloudflare-specific metadata about the request:
- `.claude/skills/cloudflare/references/snippets/configuration.md`: **Best for**: Quick tests, single snippets, visual rule building
- `.claude/skills/cloudflare/references/snippets/gotchas.md`: Runtime error or syntax error. Wrap code in try/catch:
- `.claude/skills/cloudflare/references/snippets/patterns.md`: **Rule:** `true` (all requests)
- `.claude/skills/cloudflare/references/snippets/README.md`: Expert guidance for **Cloudflare Snippets ONLY** - a lightweight JavaScript-based edge logic platform for modifying HTTP requests and responses. Snippets run as part of the Ruleset Engine and are included at no additional cost on paid plans (Pro, Business, Enterprise).
- `.claude/skills/cloudflare/references/spectrum/api.md`: **Metrics:** - `bytesIngress` - Bytes received from clients - `bytesEgress` - Bytes sent to clients - `count` - Number of connections - `duration` - Connection duration (seconds)
- `.claude/skills/cloudflare/references/spectrum/configuration.md`: Use when origin is a single server with static IP.
- `.claude/skills/cloudflare/references/spectrum/gotchas.md`: **Problem:** Connections fail or timeout **Cause:** Origin firewall blocking Cloudflare IPs, origin service not running, incorrect DNS **Solution:** 1. Verify origin firewall allows Cloudflare IP ranges 2. Check origin service running on correct port 3. Ensure DNS record is CNAME (not A/AAAA) 4....
- `.claude/skills/cloudflare/references/spectrum/patterns.md`: **Terraform:**
- `.claude/skills/cloudflare/references/spectrum/README.md`: Cloudflare Spectrum provides security and acceleration for ANY TCP or UDP-based application. It's a global Layer 4 (L4) reverse proxy running on Cloudflare's edge nodes that routes MQTT, email, file transfer, version control, games, and more through Cloudflare to mask origins and protect from DDo...
- `.claude/skills/cloudflare/references/static-assets/api.md`: The `ASSETS` binding provides access to static assets via the `Fetcher` interface.
- `.claude/skills/cloudflare/references/static-assets/configuration.md`: Minimal configuration requires only `assets.directory`:
- `.claude/skills/cloudflare/references/static-assets/gotchas.md`: Instead of `run_worker_first = true`, use array patterns:
- `.claude/skills/cloudflare/references/static-assets/patterns.md`: **1. Forward request to assets:**
- `.claude/skills/cloudflare/references/static-assets/README.md`: Expert guidance for deploying and configuring static assets with Cloudflare Workers. This skill covers configuration patterns, routing architectures, asset binding usage, and best practices for SPAs, SSG sites, and full-stack applications.
- `.claude/skills/cloudflare/references/stream/api-live.md`: Live input creation, status checking, simulcast, and WebRTC streaming.
- `.claude/skills/cloudflare/references/stream/api.md`: Upload, playback, live streaming, and management APIs.
- `.claude/skills/cloudflare/references/stream/configuration.md`: Setup, environment variables, and wrangler configuration.
- `.claude/skills/cloudflare/references/stream/gotchas.md`: **Cause:** Uploaded file is not a valid video format **Solution:** Ensure file is in supported format (MP4, MKV, MOV, AVI, FLV, MPEG-2 TS/PS, MXF, LXF, GXF, 3GP, WebM, MPG, QuickTime)
- `.claude/skills/cloudflare/references/stream/patterns.md`: Common workflows, full-stack flows, and best practices.
- `.claude/skills/cloudflare/references/stream/README.md`: Serverless live and on-demand video streaming platform with one API.
- `.claude/skills/cloudflare/references/tail-workers/api.md`: **Parameters:** - `events`: Array of `TraceItem` objects (one per producer invocation) - `env`: Bindings (KV, D1, R2, env vars, etc.) - `ctx`: Context with `waitUntil()` for async work
- `.claude/skills/cloudflare/references/tail-workers/configuration.md`: Create a Worker with a `tail()` handler:
- `.claude/skills/cloudflare/references/tail-workers/gotchas.md`: **Problem:** Async work doesn't complete or tail Worker times out **Cause:** Handlers exit immediately; awaiting blocks processing **Solution:**
- `.claude/skills/cloudflare/references/tail-workers/patterns.md`: While most tail Worker implementations are custom, these libraries may help:
- `.claude/skills/cloudflare/references/tail-workers/README.md`: Specialized Workers that consume execution events from producer Workers for logging, debugging, analytics, and observability.
- `.claude/skills/cloudflare/references/terraform/api.md`: Query existing Cloudflare resources to reference in your configurations.
- `.claude/skills/cloudflare/references/terraform/configuration.md`: Complete resource configurations for Cloudflare infrastructure.
- `.claude/skills/cloudflare/references/terraform/gotchas.md`: Common issues, security considerations, and best practices.
- `.claude/skills/cloudflare/references/terraform/patterns.md`: Architecture patterns, multi-environment setups, and real-world use cases.
- `.claude/skills/cloudflare/references/terraform/README.md`: **Expert guidance for Cloudflare Terraform Provider - infrastructure as code for Cloudflare resources.**
- `.claude/skills/cloudflare/references/tunnel/api.md`: **Base URL**: `https://api.cloudflare.com/client/v4`
- `.claude/skills/cloudflare/references/tunnel/configuration.md`: Tunnels use one of two config sources:
- `.claude/skills/cloudflare/references/tunnel/gotchas.md`: **Cause:** Tunnel not running or not connected **Solution:**
- `.claude/skills/cloudflare/references/tunnel/networking.md`: Cloudflared requires outbound access on:
- `.claude/skills/cloudflare/references/tunnel/patterns.md`: Run same config on multiple machines. Cloudflare automatically load balances. Long-lived connections (WebSocket, SSH) may drop during updates.
- `.claude/skills/cloudflare/references/tunnel/README.md`: Secure outbound-only connections between infrastructure and Cloudflare's global network.
- `.claude/skills/cloudflare/references/turn/api.md`: Complete API documentation for Cloudflare TURN service credentials and key management.
- `.claude/skills/cloudflare/references/turn/configuration.md`: Setup and configuration for Cloudflare TURN service in Workers and applications.
- `.claude/skills/cloudflare/references/turn/gotchas.md`: Common mistakes, security best practices, and troubleshooting for Cloudflare TURN.
- `.claude/skills/cloudflare/references/turn/patterns.md`: Production-ready patterns for implementing Cloudflare TURN in WebRTC applications.
- `.claude/skills/cloudflare/references/turn/README.md`: Expert guidance for implementing Cloudflare TURN Service in WebRTC applications.
- `.claude/skills/cloudflare/references/turnstile/api.md`: The Turnstile JavaScript API is available at `window.turnstile` after loading the script.
- `.claude/skills/cloudflare/references/turnstile/configuration.md`: Automatically renders widgets with `class="cf-turnstile"` on page load.
- `.claude/skills/cloudflare/references/turnstile/gotchas.md`: **Problem:** Client-only validation is easily bypassed.
- `.claude/skills/cloudflare/references/turnstile/patterns.md`
- `.claude/skills/cloudflare/references/turnstile/README.md`: Expert guidance for implementing Cloudflare Turnstile - a smart CAPTCHA alternative that protects websites from bots without showing traditional CAPTCHA puzzles.
- `.claude/skills/cloudflare/references/vectorize/api.md`: **returnMetadata:** `"none"` (fastest) → `"indexed"` (recommended) → `"all"` (topK max 20)
- `.claude/skills/cloudflare/references/vectorize/configuration.md`: **⚠️ Dimensions and metric are immutable** - cannot change after creation.
- `.claude/skills/cloudflare/references/vectorize/gotchas.md`: Insert/upsert/delete return immediately but vectors aren't queryable for 5-10 seconds.
- `.claude/skills/cloudflare/references/vectorize/patterns.md`
- `.claude/skills/cloudflare/references/vectorize/README.md`: Globally distributed vector database for AI applications. Store and query vector embeddings for semantic search, recommendations, RAG, and classification.
- `.claude/skills/cloudflare/references/waf/api.md`: Skip rules bypass subsequent rule evaluation. Two skip types:
- `.claude/skills/cloudflare/references/waf/configuration.md`: **API Token**: Create at https://dash.cloudflare.com/profile/api-tokens - Permission: `Zone.WAF Edit` or `Zone.Firewall Services Edit` - Zone Resources: Include specific zones or all zones
- `.claude/skills/cloudflare/references/waf/gotchas.md`: **Problem:** Rules execute in unexpected order **Cause:** Misunderstanding phase execution **Solution:**
- `.claude/skills/cloudflare/references/waf/patterns.md`: Combine all three phases for comprehensive protection:
- `.claude/skills/cloudflare/references/waf/README.md`: **Expertise**: Cloudflare Web Application Firewall (WAF) configuration, custom rules, managed rulesets, rate limiting, attack detection, and API integration
- `.claude/skills/cloudflare/references/web-analytics/configuration.md`: Dashboard → Web Analytics → Add site → Select hostname → Done
- `.claude/skills/cloudflare/references/web-analytics/gotchas.md`: **Symptom:** Only initial pageload counted **Fix:** Add `spa: true`:
- `.claude/skills/cloudflare/references/web-analytics/integration.md`: **Web Analytics is dashboard-only** - no programmatic API. This covers beacon integration.
- `.claude/skills/cloudflare/references/web-analytics/patterns.md`: Dashboard → Core Web Vitals → Click metric → Debug View shows top 5 problematic elements.
- `.claude/skills/cloudflare/references/web-analytics/README.md`: Privacy-first web analytics providing Core Web Vitals, traffic metrics, and user insights without compromising visitor privacy.
- `.claude/skills/cloudflare/references/workerd/api.md`: **Generate from wrangler.toml (Recommended):**
- `.claude/skills/cloudflare/references/workerd/configuration.md`: **Worker**: Run JS/Wasm code
- `.claude/skills/cloudflare/references/workerd/gotchas.md`: **Cause:** Compatibility date not set **Solution:** ❌ Wrong:
- `.claude/skills/cloudflare/references/workerd/patterns.md`: **Recommended:** Use Wrangler
- `.claude/skills/cloudflare/references/workerd/README.md`: V8-based JS/Wasm runtime powering Cloudflare Workers. Use as app server, dev tool, or HTTP proxy.
- `.claude/skills/cloudflare/references/workers-ai/api.md`: **Streaming:**
- `.claude/skills/cloudflare/references/workers-ai/configuration.md`: Create API token at: dash.cloudflare.com/profile/api-tokens (Workers AI - Read permission)
- `.claude/skills/cloudflare/references/workers-ai/gotchas.md`: Add binding to wrangler.jsonc:
- `.claude/skills/cloudflare/references/workers-ai/patterns.md`
- `.claude/skills/cloudflare/references/workers-ai/README.md`: Expert guidance for Cloudflare Workers AI - serverless GPU-powered AI inference at the edge.
- `.claude/skills/cloudflare/references/workers-for-platforms/api.md`: **Pagination:** SDK supports async iteration. Manual: add `?per_page=100&page=1` query params.
- `.claude/skills/cloudflare/references/workers-for-platforms/configuration.md`: Workers in a namespace run in **untrusted mode** by default for security: - No access to `request.cf` object - Isolated cache per Worker (no shared cache) - `caches.default` disabled
- `.claude/skills/cloudflare/references/workers-for-platforms/gotchas.md`: **Cause:** Attempting to get Worker that doesn't exist in namespace **Solution:** Catch error and return 404:
- `.claude/skills/cloudflare/references/workers-for-platforms/patterns.md`: **Complete isolation:** Create unique resources per customer - KV namespace per customer - D1 database per customer - R2 bucket per customer
- `.claude/skills/cloudflare/references/workers-for-platforms/README.md`: Multi-tenant platform with isolated customer code execution at scale.
- `.claude/skills/cloudflare/references/workers-playground/api.md`
- `.claude/skills/cloudflare/references/workers-playground/configuration.md`: Navigate to [workers.cloudflare.com/playground](https://workers.cloudflare.com/playground)
- `.claude/skills/cloudflare/references/workers-playground/gotchas.md`: **Limit:** 10ms (free), 50ms (paid)
- `.claude/skills/cloudflare/references/workers-playground/patterns.md`: **Note:** In-memory state (Maps, variables) resets on Worker cold start. Use Durable Objects or KV for persistence.
- `.claude/skills/cloudflare/references/workers-playground/README.md`: Cloudflare Workers Playground is a browser-based sandbox for instantly experimenting with, testing, and deploying Cloudflare Workers without authentication or setup. This skill provides patterns, APIs, and best practices specifically for Workers Playground development.
- `.claude/skills/cloudflare/references/workers-vpc/api.md`: Complete API reference for the Cloudflare Workers TCP Sockets API (`cloudflare:sockets`).
- `.claude/skills/cloudflare/references/workers-vpc/configuration.md`: Setup and configuration for TCP Sockets in Cloudflare Workers.
- `.claude/skills/cloudflare/references/workers-vpc/gotchas.md`: Common pitfalls, limitations, and solutions for TCP Sockets in Cloudflare Workers.
- `.claude/skills/cloudflare/references/workers-vpc/patterns.md`: Real-world patterns and examples for TCP Sockets in Cloudflare Workers.
- `.claude/skills/cloudflare/references/workers-vpc/README.md`: Connect Cloudflare Workers to private networks and internal infrastructure using TCP Sockets.
- `.claude/skills/cloudflare/references/workers/api.md`: **Never** `await` background operations - use `ctx.waitUntil()`.
- `.claude/skills/cloudflare/references/workers/configuration.md`: **Inheritable**: `name`, `main`, `compatibility_date`, `routes`, `workers_dev` **Non-inheritable**: All bindings (`vars`, `kv_namespaces`, `r2_buckets`, etc.) **Top-level only**: `migrations`, `keep_vars`, `send_metrics`
- `.claude/skills/cloudflare/references/workers/frameworks.md`: Workers-native web framework with excellent TypeScript support and middleware ecosystem.
- `.claude/skills/cloudflare/references/workers/gotchas.md`: **Cause:** Worker exceeded CPU time limit (10ms standard, 30ms unbound) **Solution:** Use `ctx.waitUntil()` for background work, offload heavy compute to Durable Objects, or consider Workers AI for ML workloads
- `.claude/skills/cloudflare/references/workers/patterns.md`: **Production**: Use Hono, itty-router, or Worktop (see [frameworks.md](./frameworks.md))
- `.claude/skills/cloudflare/references/workers/README.md`: Expert guidance for building, deploying, and optimizing Cloudflare Workers applications.
- `.claude/skills/cloudflare/references/workflows/api.md`: Params and step returns must be `Rpc.Serializable<T>`:
- `.claude/skills/cloudflare/references/workflows/configuration.md`: Each class extends `WorkflowEntrypoint` with its own `Params` type.
- `.claude/skills/cloudflare/references/workflows/gotchas.md`: **Cause:** Step execution exceeding 10 minute default timeout or configured timeout **Solution:** Set custom timeout with `step.do('long operation', {timeout: '30 minutes'}, async () => {...})` or increase CPU limit in wrangler.jsonc (max 5min CPU time)
- `.claude/skills/cloudflare/references/workflows/patterns.md`: See: [configuration.md](./configuration.md), [api.md](./api.md), [gotchas.md](./gotchas.md)
- `.claude/skills/cloudflare/references/workflows/README.md`: Durable multi-step applications with automatic retries, state persistence, and long-running execution.
- `.claude/skills/cloudflare/references/wrangler/api.md`: Node.js APIs for testing and development.
- `.claude/skills/cloudflare/references/wrangler/configuration.md`: Configuration reference for wrangler.jsonc (recommended).
- `.claude/skills/cloudflare/references/wrangler/gotchas.md`: **Cause:** Confusion between binding name (code) and resource ID **Solution:** Bindings use `binding` (code name) and `id`/`database_id`/`bucket_name` (resource ID). Preview bindings need separate IDs: `preview_id`, `preview_database_id`
- `.claude/skills/cloudflare/references/wrangler/patterns.md`: Common workflows and best practices.
- `.claude/skills/cloudflare/references/wrangler/README.md`: Official CLI for Cloudflare Workers - develop, manage, and deploy Workers from the command line.
- `.claude/skills/cloudflare/references/zaraz/api.md`: Client-side JavaScript API for tracking events, setting properties, and managing consent.
- `.claude/skills/cloudflare/references/zaraz/configuration.md`: Fires on `pushState`, `replaceState`, hash changes. **No manual tracking needed.**
- `.claude/skills/cloudflare/references/zaraz/gotchas.md`: **Check:** 1. Tool enabled in dashboard (green dot) 2. Trigger conditions met 3. Consent granted for tool's purpose 4. Tool credentials correct (GA4: `G-XXXXXXXXXX`, FB: numeric only)
- `.claude/skills/cloudflare/references/zaraz/IMPLEMENTATION_SUMMARY.md`: All tasks loaded 366 lines regardless of need.
- `.claude/skills/cloudflare/references/zaraz/patterns.md`: **History Change Trigger (Recommended):** Configure in dashboard - no code needed, Zaraz auto-detects route changes.
- `.claude/skills/cloudflare/references/zaraz/README.md`: Expert guidance for Cloudflare Zaraz - server-side tag manager for loading third-party tools at the edge.

## MANDATORY PREPARATION

Add strategic color to features that are too monochromatic or lack visual interest. Makes interfaces more engaging and expressive.

- `.claude/skills/colorize/SKILL.md`

## Create Auth Skill

Scaffold and implement authentication in TypeScript/JavaScript apps using Better Auth. Detect frameworks, configure database adapters, set up route handlers, add OAuth providers, and create auth UI pages. Use when users want to add login, sign-up, or authentication to a new or existing project wi...

- `.claude/skills/create-auth-skill/SKILL.md`

## MANDATORY PREPARATION

Evaluate design effectiveness from a UX perspective. Assesses visual hierarchy, information architecture, emotional resonance, and overall design quality with actionable feedback.

- `.claude/skills/critique/SKILL.md`

## MANDATORY PREPARATION

Add moments of joy, personality, and unexpected touches that make interfaces memorable and enjoyable to use. Elevates functional to delightful.

- `.claude/skills/delight/SKILL.md`

## MANDATORY PREPARATION

Strip designs to their essence by removing unnecessary complexity. Great design is simple, powerful, and clean.

- `.claude/skills/distill/SKILL.md`

## Diátaxis Documentation Expert

Diátaxis Documentation Expert. An expert technical writer specializing in creating high-quality software documentation, guided by the principles and structure of the Diátaxis technical documentation authoring framework.

- `.claude/skills/documentation-writer/SKILL.md`

## Durable Objects

Create and review Cloudflare Durable Objects. Use when building stateful coordination (chat rooms, multiplayer games, booking systems), implementing RPC methods, SQLite storage, alarms, WebSockets, or reviewing DO code for best practices. Covers Workers integration, wrangler config, and testing w...

- `.claude/skills/durable-objects/SKILL.md`
- `.claude/skills/durable-objects/references/rules.md`: Create one DO per logical unit needing coordination: chat room, game session, document, user, tenant.
- `.claude/skills/durable-objects/references/testing.md`: Use `@cloudflare/vitest-pool-workers` to test DOs inside the Workers runtime.
- `.claude/skills/durable-objects/references/workers.md`: High-level guidance for Workers that invoke Durable Objects.

## Quick Start

Configure email verification, implement password reset flows, set password policies, and customise hashing algorithms for Better Auth email/password authentication. Use when users need to set up login, sign-in, sign-up, credential authentication, or password security with Better Auth.

- `.claude/skills/email-and-password-best-practices/SKILL.md`

## Discover

Extract and consolidate reusable components, design tokens, and patterns into your design system. Identifies opportunities for systematic reuse and enriches your component library.

- `.claude/skills/extract/SKILL.md`

## Find Skills

Helps users discover and install agent skills when they ask questions like "how do I do X", "find a skill for X", "is there a skill that can...", or express interest in extending capabilities. This skill should be used when the user is looking for functionality that might exist as an installable...

- `.claude/skills/find-skills/SKILL.md`

## Context Gathering Protocol

Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications. Generates creative, polished code that avoids generic AI aesthetics.

- `.claude/skills/frontend-design/SKILL.md`
- `.claude/skills/frontend-design/reference/color-and-contrast.md`: **Stop using HSL.** Use OKLCH (or LCH) instead. It's perceptually uniform, meaning equal steps in lightness *look* equal—unlike HSL where 50% lightness in yellow looks bright while 50% in blue looks dark.
- `.claude/skills/frontend-design/reference/interaction-design.md`: Every interactive element needs these states designed:
- `.claude/skills/frontend-design/reference/motion-design.md`: Timing matters more than easing. These durations feel right for most UI:
- `.claude/skills/frontend-design/reference/responsive-design.md`: Start with base styles for mobile, use `min-width` queries to layer complexity. Desktop-first (`max-width`) means mobile loads unnecessary styles first.
- `.claude/skills/frontend-design/reference/spatial-design.md`: 8pt systems are too coarse—you'll frequently need 12px (between 8 and 16). Use 4pt for granularity: 4, 8, 12, 16, 24, 32, 48, 64, 96px.
- `.claude/skills/frontend-design/reference/typography.md`: Your line-height should be the base unit for ALL vertical spacing. If body text has `line-height: 1.5` on `16px` type (= 24px), spacing values should be multiples of 24px. This creates subconscious harmony—text and space share a mathematical foundation.
- `.claude/skills/frontend-design/reference/ux-writing.md`: **Never use "OK", "Submit", or "Yes/No".** These are lazy and ambiguous. Use specific verb + object patterns:

## Git Commit with Conventional Commits

Execute git commit with conventional commit message analysis, intelligent staging, and message generation. Use when user asks to commit changes, create a git commit, or mentions "/commit". Supports: (1) Auto-detecting type and scope from changes, (2) Generating conventional commit messages from d...

- `.claude/skills/git-commit/SKILL.md`

## Assess Hardening Needs

Improve interface resilience through better error handling, i18n support, text overflow handling, and edge case management. Makes interfaces robust and production-ready.

- `.claude/skills/harden/SKILL.md`

## MANDATORY PREPARATION

Normalize design to match your design system and ensure consistency

- `.claude/skills/normalize/SKILL.md`

## MANDATORY PREPARATION

Design or improve onboarding flows, empty states, and first-time user experiences. Helps users get started successfully and understand value quickly.

- `.claude/skills/onboard/SKILL.md`

## Assess Performance Issues

Improve interface performance across loading speed, rendering, animations, images, and bundle size. Makes experiences faster and smoother.

- `.claude/skills/optimize/SKILL.md`

## Setup

Configure multi-tenant organizations, manage members and invitations, define custom roles and permissions, set up teams, and implement RBAC using Better Auth's organization plugin. Use when users need org setup, team management, member roles, access control, or the Better Auth organization plugin.

- `.claude/skills/organization-best-practices/SKILL.md`

## MANDATORY PREPARATION

Push interfaces past conventional limits with technically ambitious implementations. Whether that's a shader, a 60fps virtual table, spring physics on a dialog, or scroll-driven reveals — make users ask "how did they do that?

- `.claude/skills/overdrive/SKILL.md`

## MANDATORY PREPARATION

Final quality pass before shipping. Fixes alignment, spacing, consistency, and detail issues that separate good from great.

- `.claude/skills/polish/SKILL.md`

## Pricing Strategy

When the user wants help with pricing decisions, packaging, or monetization strategy. Also use when the user mentions 'pricing,' 'pricing tiers,' 'freemium,' 'free trial,' 'packaging,' 'price increase,' 'value metric,' 'Van Westendorp,' 'willingness to pay,' 'monetization,' 'how much should I cha...

- `.claude/skills/pricing-strategy/SKILL.md`
- `.claude/skills/pricing-strategy/references/research-methods.md`: The Van Westendorp survey identifies the acceptable price range for your product.
- `.claude/skills/pricing-strategy/references/tier-structure.md`: **2 tiers:** Simple, clear choice - Works for: Clear SMB vs. Enterprise split - Risk: May leave money on table

## MANDATORY PREPARATION

Tone down overly bold or visually aggressive designs. Reduces intensity while maintaining design quality and impact.

- `.claude/skills/quieter/SKILL.md`

## SEO optimization

Optimize for search engine visibility and ranking. Use when asked to "improve SEO", "optimize for search", "fix meta tags", "add structured data", "sitemap optimization", or "search engine optimization".

- `.claude/skills/seo/SKILL.md`

## shadcn/ui

Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI. Provides project context, component docs, and usage examples. Applies when working with shadcn/ui, component registries, presets, --preset codes, or any project with a components.json file. A...

- `.claude/skills/shadcn/SKILL.md`
- `.claude/skills/shadcn/cli.md`: Configuration is read from `components.json`.
- `.claude/skills/shadcn/customization.md`: Components reference semantic CSS variable tokens. Change the variables to change every component.
- `.claude/skills/shadcn/mcp.md`: The CLI includes an MCP server that lets AI assistants search, browse, view, and install components from registries.
- `.claude/skills/shadcn/rules/base-vs-radix.md`: API differences between `base` and `radix`. Check the `base` field from `npx shadcn@latest info`.
- `.claude/skills/shadcn/rules/composition.md`: Never render items directly inside the content container.
- `.claude/skills/shadcn/rules/forms.md`: Always use `FieldGroup` + `Field` — never raw `div` with `space-y-*`:
- `.claude/skills/shadcn/rules/icons.md`: **Always use the project's configured `iconLibrary` for imports.** Check the `iconLibrary` field from project context: `lucide` → `lucide-react`, `tabler` → `@tabler/icons-react`, etc. Never assume `lucide-react`.
- `.claude/skills/shadcn/rules/styling.md`: See [customization.md](../customization.md) for theming, CSS variables, and adding custom colors.

## Tailwind CSS Development Patterns

Provides comprehensive Tailwind CSS utility-first styling patterns including responsive design, layout utilities, flexbox, grid, spacing, typography, colors, and modern CSS best practices. Use when styling React/Vue/Svelte components, building responsive layouts, implementing design systems, or o...

- `.claude/skills/tailwind-css-patterns/SKILL.md`
- `.claude/skills/tailwind-css-patterns/references/accessibility.md`
- `.claude/skills/tailwind-css-patterns/references/animations.md`: Usage:
- `.claude/skills/tailwind-css-patterns/references/component-patterns.md`
- `.claude/skills/tailwind-css-patterns/references/configuration.md`: Use the `@theme` directive for CSS-based configuration:
- `.claude/skills/tailwind-css-patterns/references/layout-patterns.md`: Basic flex container:
- `.claude/skills/tailwind-css-patterns/references/performance.md`: Configure content sources for optimal purging:
- `.claude/skills/tailwind-css-patterns/references/reference.md`: Tailwind CSS is a utility-first CSS framework that generates styles by scanning HTML, JavaScript, and template files for class names. It provides a comprehensive design system through CSS utility classes, enabling rapid UI development without writing custom CSS. The framework operates at build-ti...
- `.claude/skills/tailwind-css-patterns/references/responsive-design.md`: Enable dark mode in tailwind.config.js:

## Step 1: Explore the Codebase

One-time setup that gathers design context for your project and saves it to your AI config file. Run once to establish persistent design guidelines.

- `.claude/skills/teach-impeccable/SKILL.md`

## Setup

Configure TOTP authenticator apps, send OTP codes via email/SMS, manage backup codes, handle trusted devices, and implement 2FA sign-in flows using Better Auth's twoFactor plugin. Use when users need MFA, multi-factor authentication, authenticator setup, or login security with Better Auth.

- `.claude/skills/two-factor-authentication-best-practices/SKILL.md`

## TypeScript Advanced Types

Master TypeScript's advanced type system including generics, conditional types, mapped types, template literals, and utility types for building type-safe applications. Use when implementing complex type logic, creating reusable type utilities, or ensuring compile-time type safety in TypeScript pr...

- `.claude/skills/typescript-advanced-types/SKILL.md`

## MANDATORY PREPARATION

Improve typography by fixing font choices, hierarchy, sizing, weight consistency, and readability. Makes text feel intentional and polished.

- `.claude/skills/typeset/SKILL.md`

## React Composition Patterns

Composition patterns for building flexible, maintainable React components. Avoid boolean prop proliferation by using compound components, lifting state, and composing internals. These patterns make codebases easier for both humans and AI agents to work with as they scale.

- `.claude/skills/vercel-composition-patterns/SKILL.md`
- `.claude/skills/vercel-composition-patterns/AGENTS.md`: **Version 1.0.0** Engineering January 2026
- `.claude/skills/vercel-composition-patterns/README.md`: A structured repository for React composition patterns that scale. These patterns help avoid boolean prop proliferation by using compound components, lifting state, and composing internals.
- `.claude/skills/vercel-composition-patterns/rules/_sections.md`: This file defines all sections, their ordering, impact levels, and descriptions. The section ID (in parentheses) is the filename prefix used to group rules.
- `.claude/skills/vercel-composition-patterns/rules/_template.md`: Brief explanation of the rule and why it matters.
- `.claude/skills/vercel-composition-patterns/rules/architecture-avoid-boolean-props.md`: Don't add boolean props like `isThread`, `isEditing`, `isDMThread` to customize component behavior. Each boolean doubles possible states and creates unmaintainable conditional logic. Use composition instead.
- `.claude/skills/vercel-composition-patterns/rules/architecture-compound-components.md`: Structure complex components as compound components with a shared context. Each subcomponent accesses shared state via context, not props. Consumers compose the pieces they need.
- `.claude/skills/vercel-composition-patterns/rules/patterns-children-over-render-props.md`: Use `children` for composition instead of `renderX` props. Children are more readable, compose naturally, and don't require understanding callback signatures.
- `.claude/skills/vercel-composition-patterns/rules/patterns-explicit-variants.md`: Instead of one component with many boolean props, create explicit variant components. Each variant composes the pieces it needs. The code documents itself.
- `.claude/skills/vercel-composition-patterns/rules/react19-no-forwardref.md`: In React 19, `ref` is now a regular prop (no `forwardRef` wrapper needed), and `use()` replaces `useContext()`.
- `.claude/skills/vercel-composition-patterns/rules/state-context-interface.md`: Define a **generic interface** for your component context with three parts: can implement—enabling the same UI components to work with completely different state implementations.
- `.claude/skills/vercel-composition-patterns/rules/state-decouple-implementation.md`: The provider component should be the only place that knows how state is managed. UI components consume the context interface—they don't know if state comes from useState, Zustand, or a server sync.
- `.claude/skills/vercel-composition-patterns/rules/state-lift-state.md`: Move state management into dedicated provider components. This allows sibling components outside the main UI to access and modify state without prop drilling or awkward refs.

## Vercel React Best Practices

React and Next.js performance optimization guidelines from Vercel Engineering. This skill should be used when writing, reviewing, or refactoring React/Next.js code to ensure optimal performance patterns. Triggers on tasks involving React components, Next.js pages, data fetching, bundle optimizati...

- `.claude/skills/vercel-react-best-practices/SKILL.md`
- `.claude/skills/vercel-react-best-practices/AGENTS.md`: **Version 1.0.0** Vercel Engineering January 2026
- `.claude/skills/vercel-react-best-practices/README.md`: A structured repository for creating and maintaining React Best Practices optimized for agents and LLMs.
- `.claude/skills/vercel-react-best-practices/rules/_sections.md`: This file defines all sections, their ordering, impact levels, and descriptions. The section ID (in parentheses) is the filename prefix used to group rules.
- `.claude/skills/vercel-react-best-practices/rules/_template.md`: **Impact: MEDIUM (optional impact description)**
- `.claude/skills/vercel-react-best-practices/rules/advanced-effect-event-deps.md`: Effect Event functions do not have a stable identity. Their identity intentionally changes on every render. Do not include the function returned by `useEffectEvent` in a `useEffect` dependency array. Keep the actual reactive values as dependencies and call the Effect Event from inside the effect...
- `.claude/skills/vercel-react-best-practices/rules/advanced-event-handler-refs.md`: Store callbacks in refs when used in effects that shouldn't re-subscribe on callback changes.
- `.claude/skills/vercel-react-best-practices/rules/advanced-init-once.md`: Do not put app-wide initialization that must run once per app load inside `useEffect([])` of a component. Components can remount and effects will re-run. Use a module-level guard or top-level init in the entry module instead.
- `.claude/skills/vercel-react-best-practices/rules/advanced-use-latest.md`: Access latest values in callbacks without adding them to dependency arrays. Prevents effect re-runs while avoiding stale closures.
- `.claude/skills/vercel-react-best-practices/rules/async-api-routes.md`: In API routes and Server Actions, start independent operations immediately, even if you don't await them yet.
- `.claude/skills/vercel-react-best-practices/rules/async-cheap-condition-before-await.md`: When a branch uses `await` for a flag or remote value and also requires a **cheap synchronous** condition (local props, request metadata, already-loaded state), evaluate the cheap condition **first**. Otherwise you pay for the async call even when the compound condition can never be true.
- `.claude/skills/vercel-react-best-practices/rules/async-defer-await.md`: Move `await` operations into the branches where they're actually used to avoid blocking code paths that don't need them.
- `.claude/skills/vercel-react-best-practices/rules/async-dependencies.md`: For operations with partial dependencies, use `better-all` to maximize parallelism. It automatically starts each task at the earliest possible moment.
- `.claude/skills/vercel-react-best-practices/rules/async-parallel.md`: When async operations have no interdependencies, execute them concurrently using `Promise.all()`.
- `.claude/skills/vercel-react-best-practices/rules/async-suspense-boundaries.md`: Instead of awaiting data in async components before returning JSX, use Suspense boundaries to show the wrapper UI faster while data loads.
- `.claude/skills/vercel-react-best-practices/rules/bundle-barrel-imports.md`: Import directly from source files instead of barrel files to avoid loading thousands of unused modules. **Barrel files** are entry points that re-export multiple modules (e.g., `index.js` that does `export * from './module'`).
- `.claude/skills/vercel-react-best-practices/rules/bundle-conditional.md`: Load large data or modules only when a feature is activated.
- `.claude/skills/vercel-react-best-practices/rules/bundle-defer-third-party.md`: Analytics, logging, and error tracking don't block user interaction. Load them after hydration.
- `.claude/skills/vercel-react-best-practices/rules/bundle-dynamic-imports.md`: Use `next/dynamic` to lazy-load large components not needed on initial render.
- `.claude/skills/vercel-react-best-practices/rules/bundle-preload.md`: Preload heavy bundles before they're needed to reduce perceived latency.
- `.claude/skills/vercel-react-best-practices/rules/client-event-listeners.md`: Use `useSWRSubscription()` to share global event listeners across component instances.
- `.claude/skills/vercel-react-best-practices/rules/client-localstorage-schema.md`: Add version prefix to keys and store only needed fields. Prevents schema conflicts and accidental storage of sensitive data.
- `.claude/skills/vercel-react-best-practices/rules/client-passive-event-listeners.md`: Add `{ passive: true }` to touch and wheel event listeners to enable immediate scrolling. Browsers normally wait for listeners to finish to check if `preventDefault()` is called, causing scroll delay.
- `.claude/skills/vercel-react-best-practices/rules/client-swr-dedup.md`: SWR enables request deduplication, caching, and revalidation across component instances.
- `.claude/skills/vercel-react-best-practices/rules/js-batch-dom-css.md`: Avoid interleaving style writes with layout reads. When you read a layout property (like `offsetWidth`, `getBoundingClientRect()`, or `getComputedStyle()`) between style changes, the browser is forced to trigger a synchronous reflow.
- `.claude/skills/vercel-react-best-practices/rules/js-cache-function-results.md`: Use a module-level Map to cache function results when the same function is called repeatedly with the same inputs during render.
- `.claude/skills/vercel-react-best-practices/rules/js-cache-property-access.md`: Cache object property lookups in hot paths.
- `.claude/skills/vercel-react-best-practices/rules/js-cache-storage.md`: **Incorrect (reads storage on every call):**
- `.claude/skills/vercel-react-best-practices/rules/js-combine-iterations.md`: Multiple `.filter()` or `.map()` calls iterate the array multiple times. Combine into one loop.
- `.claude/skills/vercel-react-best-practices/rules/js-early-exit.md`: Return early when result is determined to skip unnecessary processing.
- `.claude/skills/vercel-react-best-practices/rules/js-flatmap-filter.md`: **Impact: LOW-MEDIUM (eliminates intermediate array)**
- `.claude/skills/vercel-react-best-practices/rules/js-hoist-regexp.md`: Don't create RegExp inside render. Hoist to module scope or memoize with `useMemo()`.
- `.claude/skills/vercel-react-best-practices/rules/js-index-maps.md`: Multiple `.find()` calls by the same key should use a Map.
- `.claude/skills/vercel-react-best-practices/rules/js-length-check-first.md`: When comparing arrays with expensive operations (sorting, deep equality, serialization), check lengths first. If lengths differ, the arrays cannot be equal.
- `.claude/skills/vercel-react-best-practices/rules/js-min-max-loop.md`: Finding the smallest or largest element only requires a single pass through the array. Sorting is wasteful and slower.
- `.claude/skills/vercel-react-best-practices/rules/js-request-idle-callback.md`: **Impact: MEDIUM (keeps UI responsive during background tasks)**
- `.claude/skills/vercel-react-best-practices/rules/js-set-map-lookups.md`: Convert arrays to Set/Map for repeated membership checks.
- `.claude/skills/vercel-react-best-practices/rules/js-tosorted-immutable.md`: **Incorrect (mutates original array):**
- `.claude/skills/vercel-react-best-practices/rules/rendering-activity.md`: Use React's `<Activity>` to preserve state/DOM for expensive components that frequently toggle visibility.
- `.claude/skills/vercel-react-best-practices/rules/rendering-animate-svg-wrapper.md`: Many browsers don't have hardware acceleration for CSS3 animations on SVG elements. Wrap SVG in a `<div>` and animate the wrapper instead.
- `.claude/skills/vercel-react-best-practices/rules/rendering-conditional-render.md`: Use explicit ternary operators (`? :`) instead of `&&` for conditional rendering when the condition can be `0`, `NaN`, or other falsy values that render.
- `.claude/skills/vercel-react-best-practices/rules/rendering-content-visibility.md`: Apply `content-visibility: auto` to defer off-screen rendering.
- `.claude/skills/vercel-react-best-practices/rules/rendering-hoist-jsx.md`: Extract static JSX outside components to avoid re-creation.
- `.claude/skills/vercel-react-best-practices/rules/rendering-hydration-no-flicker.md`: When rendering content that depends on client-side storage (localStorage, cookies), avoid both SSR breakage and post-hydration flickering by injecting a synchronous script that updates the DOM before React hydrates.
- `.claude/skills/vercel-react-best-practices/rules/rendering-hydration-suppress-warning.md`: In SSR frameworks (e.g., Next.js), some values are intentionally different on server vs client (random IDs, dates, locale/timezone formatting). For these *expected* mismatches, wrap the dynamic text in an element with `suppressHydrationWarning` to prevent noisy warnings. Do not use this to hide r...
- `.claude/skills/vercel-react-best-practices/rules/rendering-resource-hints.md`: **Impact: HIGH (reduces load time for critical resources)**
- `.claude/skills/vercel-react-best-practices/rules/rendering-script-defer-async.md`: **Impact: HIGH (eliminates render-blocking)**
- `.claude/skills/vercel-react-best-practices/rules/rendering-svg-precision.md`: Reduce SVG coordinate precision to decrease file size. The optimal precision depends on the viewBox size, but in general reducing precision should be considered.
- `.claude/skills/vercel-react-best-practices/rules/rendering-usetransition-loading.md`: Use `useTransition` instead of manual `useState` for loading states. This provides built-in `isPending` state and automatically manages transitions.
- `.claude/skills/vercel-react-best-practices/rules/rerender-defer-reads.md`: Don't subscribe to dynamic state (searchParams, localStorage) if you only read it inside callbacks.
- `.claude/skills/vercel-react-best-practices/rules/rerender-dependencies.md`: Specify primitive dependencies instead of objects to minimize effect re-runs.
- `.claude/skills/vercel-react-best-practices/rules/rerender-derived-state-no-effect.md`: If a value can be computed from current props/state, do not store it in state or update it in an effect. Derive it during render to avoid extra renders and state drift. Do not set state in effects solely in response to prop changes; prefer derived values or keyed resets instead.
- `.claude/skills/vercel-react-best-practices/rules/rerender-derived-state.md`: Subscribe to derived boolean state instead of continuous values to reduce re-render frequency.
- `.claude/skills/vercel-react-best-practices/rules/rerender-functional-setstate.md`: When updating state based on the current state value, use the functional update form of setState instead of directly referencing the state variable. This prevents stale closures, eliminates unnecessary dependencies, and creates stable callback references.
- `.claude/skills/vercel-react-best-practices/rules/rerender-lazy-state-init.md`: Pass a function to `useState` for expensive initial values. Without the function form, the initializer runs on every render even though the value is only used once.
- `.claude/skills/vercel-react-best-practices/rules/rerender-memo-with-default-value.md`: When memoized component has a default value for some non-primitive optional parameter, such as an array, function, or object, calling the component without that parameter results in broken memoization. This is because new value instances are created on every rerender, and they do not pass strict...
- `.claude/skills/vercel-react-best-practices/rules/rerender-memo.md`: Extract expensive work into memoized components to enable early returns before computation.
- `.claude/skills/vercel-react-best-practices/rules/rerender-move-effect-to-event.md`: If a side effect is triggered by a specific user action (submit, click, drag), run it in that event handler. Do not model the action as state + effect; it makes effects re-run on unrelated changes and can duplicate the action.
- `.claude/skills/vercel-react-best-practices/rules/rerender-no-inline-components.md`: **Impact: HIGH (prevents remount on every render)**
- `.claude/skills/vercel-react-best-practices/rules/rerender-simple-expression-in-memo.md`: When an expression is simple (few logical or arithmetical operators) and has a primitive result type (boolean, number, string), do not wrap it in `useMemo`. Calling `useMemo` and comparing hook dependencies may consume more resources than the expression itself.
- `.claude/skills/vercel-react-best-practices/rules/rerender-split-combined-hooks.md`: When a hook contains multiple independent tasks with different dependencies, split them into separate hooks. A combined hook reruns all tasks when any dependency changes, even if some tasks don't use the changed value.
- `.claude/skills/vercel-react-best-practices/rules/rerender-transitions.md`: Mark frequent, non-urgent state updates as transitions to maintain UI responsiveness.
- `.claude/skills/vercel-react-best-practices/rules/rerender-use-deferred-value.md`: When user input triggers expensive computations or renders, use `useDeferredValue` to keep the input responsive. The deferred value lags behind, allowing React to prioritize the input update and render the expensive result when idle.
- `.claude/skills/vercel-react-best-practices/rules/rerender-use-ref-transient-values.md`: When a value changes frequently and you don't want a re-render on every update (e.g., mouse trackers, intervals, transient flags), store it in `useRef` instead of `useState`. Keep component state for UI; use refs for temporary DOM-adjacent values. Updating a ref does not trigger a re-render.
- `.claude/skills/vercel-react-best-practices/rules/server-after-nonblocking.md`: Use Next.js's `after()` to schedule work that should execute after a response is sent. This prevents logging, analytics, and other side effects from blocking the response.
- `.claude/skills/vercel-react-best-practices/rules/server-auth-actions.md`: **Impact: CRITICAL (prevents unauthorized access to server mutations)**
- `.claude/skills/vercel-react-best-practices/rules/server-cache-lru.md`: **Implementation:**
- `.claude/skills/vercel-react-best-practices/rules/server-cache-react.md`: Use `React.cache()` for server-side request deduplication. Authentication and database queries benefit most.
- `.claude/skills/vercel-react-best-practices/rules/server-dedup-props.md`: **Impact: LOW (reduces network payload by avoiding duplicate serialization)**
- `.claude/skills/vercel-react-best-practices/rules/server-hoist-static-io.md`: **Impact: HIGH (avoids repeated file/network I/O per request)**
- `.claude/skills/vercel-react-best-practices/rules/server-no-shared-module-state.md`: For React Server Components and client components rendered during SSR, avoid using mutable module-level variables to share request-scoped data. Server renders can run concurrently in the same process. If one render writes to shared module state and another render reads it, you can get race condit...
- `.claude/skills/vercel-react-best-practices/rules/server-parallel-fetching.md`: React Server Components execute sequentially within a tree. Restructure with composition to parallelize data fetching.
- `.claude/skills/vercel-react-best-practices/rules/server-parallel-nested-fetching.md`: When fetching nested data in parallel, chain dependent fetches within each item's promise so a slow item doesn't block the rest.
- `.claude/skills/vercel-react-best-practices/rules/server-serialization.md`: The React Server/Client boundary serializes all object properties into strings and embeds them in the HTML response and subsequent RSC requests. This serialized data directly impacts page weight and load time, so **size matters a lot**. Only pass fields that the client actually uses.

## Vite

Vite build tool configuration, plugin API, SSR, and Vite 8 Rolldown migration. Use when working with Vite projects, vite.config.ts, Vite plugins, or building libraries/SSR apps with Vite.

- `.claude/skills/vite/SKILL.md`
- `.claude/skills/vite/GENERATION.md`
- `.claude/skills/vite/references/build-and-ssr.md`: Vite library mode, multi-page apps, JavaScript API, and SSR guidance
- `.claude/skills/vite/references/core-config.md`: Vite configuration patterns using vite.config.ts
- `.claude/skills/vite/references/core-features.md`: Vite-specific import patterns and runtime features
- `.claude/skills/vite/references/core-plugin-api.md`: Vite plugin authoring with Vite-specific hooks
- `.claude/skills/vite/references/environment-api.md`: Vite 6+ Environment API for multiple runtime environments
- `.claude/skills/vite/references/rolldown-migration.md`: Vite 8 Rolldown bundler and Oxc transformer migration

## Core

Vitest fast unit testing framework powered by Vite with Jest-compatible API. Use when writing tests, mocking, configuring coverage, or working with test filtering and fixtures.

- `.claude/skills/vitest/SKILL.md`
- `.claude/skills/vitest/GENERATION.md`
- `.claude/skills/vitest/references/advanced-environments.md`: Configure environments like jsdom, happy-dom for browser APIs
- `.claude/skills/vitest/references/advanced-projects.md`: Multi-project configuration for monorepos and different test types
- `.claude/skills/vitest/references/advanced-type-testing.md`: Test TypeScript types with expectTypeOf and assertType
- `.claude/skills/vitest/references/advanced-vi.md`: vi helper for mocking, timers, utilities
- `.claude/skills/vitest/references/core-cli.md`: Command line interface commands and options
- `.claude/skills/vitest/references/core-config.md`: Configure Vitest with vite.config.ts or vitest.config.ts
- `.claude/skills/vitest/references/core-describe.md`: describe/suite for grouping tests into logical blocks
- `.claude/skills/vitest/references/core-expect.md`: Assertions with matchers, asymmetric matchers, and custom matchers
- `.claude/skills/vitest/references/core-hooks.md`: beforeEach, afterEach, beforeAll, afterAll, and around hooks
- `.claude/skills/vitest/references/core-test-api.md`: test/it function for defining tests with modifiers
- `.claude/skills/vitest/references/features-concurrency.md`: Concurrent tests, parallel execution, and sharding
- `.claude/skills/vitest/references/features-context.md`: Test context, custom fixtures with test.extend
- `.claude/skills/vitest/references/features-coverage.md`: Code coverage with V8 or Istanbul providers
- `.claude/skills/vitest/references/features-filtering.md`: Filter tests by name, file patterns, and tags
- `.claude/skills/vitest/references/features-mocking.md`: Mock functions, modules, timers, and dates with vi utilities
- `.claude/skills/vitest/references/features-snapshots.md`: Snapshot testing with file, inline, and file snapshots

## Web Performance Audit

Analyzes web performance using Chrome DevTools MCP. Measures Core Web Vitals (LCP, INP, CLS) and supplementary metrics (FCP, TBT, Speed Index), identifies render-blocking resources, network dependency chains, layout shifts, caching issues, and accessibility gaps. Use when asked to audit, profile,...

- `.claude/skills/web-perf/SKILL.md`

## Retrieval Sources

Reviews and authors Cloudflare Workers code against production best practices. Load when writing new Workers, reviewing Worker code, configuring wrangler.jsonc, or checking for common Workers anti-patterns (streaming, floating promises, global state, secrets, bindings, observability). Biases towa...

- `.claude/skills/workers-best-practices/SKILL.md`
- `.claude/skills/workers-best-practices/references/review.md`: How to review Workers code for type correctness, API usage, config validity, and best practices. This is self-contained — do not assume access to other skills.
- `.claude/skills/workers-best-practices/references/rules.md`: Each rule has an imperative summary, what to check, the correct pattern, and an anti-pattern where applicable. Code examples are plain TypeScript — no MDX components.

## Wrangler CLI

Cloudflare Workers CLI for deploying, developing, and managing Workers, KV, R2, D1, Vectorize, Hyperdrive, Workers AI, Containers, Queues, Workflows, Pipelines, and Secrets Store. Load before running wrangler commands to ensure correct syntax and best practices. Biases towards retrieval from Clou...

- `.claude/skills/wrangler/SKILL.md`

<!-- autoskills:end -->
