# Unified Data Import Pipeline — Design Spec

**Date:** 2026-05-07
**Status:** Draft
**Project:** `zephyron-crawler` (standalone repo, extends existing 1001TL crawler spec)

---

## Overview

A self-hosted Docker Compose service that imports DJ sets, artists, events, and tracklists from multiple sources (1001Tracklists, Mixcloud, Resident Advisor, YouTube) into Zephyron via its admin API. Extends the existing [1001Tracklists crawler spec](./2026-05-04-1001tracklists-crawler-design.md) with a pluggable source adapter system and an LLM pipeline for data sanitization, entity matching, merge conflict resolution, and tracklist enrichment. Runs 24/7 on a homelab.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ docker-compose                                              │
│                                                             │
│  ┌────────────┐   ┌─────────┐   ┌──────────┐  ┌─────────┐ │
│  │  crawler   │──▶│  redis  │◀──│ admin UI │  │   llm   │ │
│  │ (Node.js)  │   │(BullMQ) │   │(React)   │  │  proxy  │ │
│  │            │   └─────────┘   └──────────┘  └─────────┘ │
│  │ adapters:  │                                     ▲       │
│  │ - 1001TL   │─────────────────────────────────────┘       │
│  │ - Mixcloud │  LLM calls (sanitize, match, merge, enrich) │
│  │ - RA       │                                             │
│  │ - YouTube  │──▶ Zephyron Admin API                       │
│  └────────────┘                                             │
└─────────────────────────────────────────────────────────────┘
```

### Services

| Service | Tech | Purpose |
|---|---|---|
| **crawler** | Node.js + TypeScript + BullMQ | Queue workers, source adapters, LLM pipeline, Zephyron API client |
| **redis** | Redis 7 | BullMQ job queues, visited dedup set, rate limiter token bucket, review queue |
| **admin UI** | React + Vite | Dashboard, source controls, LLM monitor, review queue |
| **llm-proxy** | Express | Provider-agnostic LLM interface, structured output, provider routing |

---

## Source Adapters

Each source implements a shared TypeScript interface:

```typescript
interface SourceAdapter {
  id: 'tracklists_1001' | 'mixcloud' | 'ra' | 'youtube'
  crawlArtists(): AsyncGenerator<RawArtist>
  crawlEvents(): AsyncGenerator<RawEvent>
  crawlSets(): AsyncGenerator<RawSet>
  resolveStreamUrl(set: RawSet): Promise<string | null>
}
```

Adapters output raw, unvalidated `Raw*` data. Normalization happens downstream in the LLM pipeline — adapters never sanitize.

| Adapter | Primary data | Implementation notes |
|---|---|---|
| `tracklists_1001` | Sets, tracklists, artists, events | See [existing spec](./2026-05-04-1001tracklists-crawler-design.md) — challenge solver, HTML parsing |
| `mixcloud` | Sets + stream URLs, artist profiles | Mixcloud public API (no scraping needed), OAuth not required for public data |
| `ra` | Events, artist bios, lineups | HTML scraping, rate-limit sensitive, GraphQL API partially available |
| `youtube` | Sets via channel/playlist | yt-dlp for metadata extraction, no audio download |

---

## Queue Design (BullMQ)

| Queue | Job data | Concurrency |
|---|---|---|
| `coordinator` | `{ mode: 'bulk' \| 'sync', sources: SourceId[] }` | 1 |
| `artist` | `{ url: string, source: SourceId }` | 3 |
| `event` | `{ url: string, source: SourceId }` | 3 |
| `set` | `{ url: string, source: SourceId, artistId?: string, eventId?: string }` | 5 |
| `llm` | `{ stage: LLMStage, entity: Raw*, existingRecord?: Record }` | 2 |
| `review` | `{ entity: MergedEntity, confidence: number, reason: string }` | — (admin-drained) |

All queues use exponential backoff (3 attempts, starting at 5s).

---

## LLM Pipeline

The `llm-proxy` service exposes a provider-agnostic interface. Provider is selected via `LLM_PROVIDER` env var.

```typescript
interface LLMProvider {
  complete(prompt: string, schema: ZodSchema): Promise<unknown>
}
// Implementations: AnthropicProvider | BedrockProvider | OllamaProvider | OpenAIProvider
```

### Pipeline Stages

Four stages run sequentially on each scraped entity before the Zephyron API call:

| Stage | Input | LLM task | Output |
|---|---|---|---|
| **Sanitize** | Raw scraped fields | Fix encoding, normalize casing, strip junk suffixes ("- Official", "HD", "Full Set"), normalize unicode | Clean `Raw*` object |
| **Entity match** | Clean entity + Zephyron search results | Decide if it's the same existing record | `{ matchId: string \| null, confidence: number }` |
| **Merge** | Existing record + new source data | Field-by-field: pick best value, flag disagreements | Merged record patch |
| **Enrich** | Set + partial tracklist | Infer missing track artist/title/label from surrounding context | Enriched tracklist |

All stage outputs use **structured JSON output** validated by Zod before use. If a stage's Zod parse fails, the job retries once then falls back to the raw input (sanitize) or skips the stage (match/merge/enrich).

### Confidence Threshold

Entities with entity-match confidence < 0.8 are not auto-merged. Instead they are enqueued in the `review` queue and surfaced in the Admin UI Review Queue page for manual approval.

### Stage Toggles

Each stage is independently toggleable in the admin UI Settings page. Disabled stages are bypassed entirely.

---

## Data Flow

### Bulk crawl

1. `POST /api/crawl/start?mode=bulk&sources=all` → coordinator job
2. Coordinator paginates each enabled source's index pages → enqueues `artist`, `event`, `set` jobs
3. Per entity job:
   - Adapter scrapes + parses → `Raw*` object
   - LLM pipeline: sanitize → match → merge → enrich
   - If confidence ≥ 0.8: `POST /api/admin/*` to Zephyron (create or patch)
   - If confidence < 0.8: enqueue to `review` queue
   - URL written to Redis visited set with `SETNX`

### Sync crawl (every 6 hours via node-cron)

- Coordinator visits only "new/recent" endpoints on each source
- Skips URLs already in visited set

### Stream URL resolution

- After a set is created/matched in Zephyron, `resolveStreamUrl()` is called on all enabled adapters
- First non-null URL is patched onto the set record
- Mixcloud and YouTube URLs take priority over SoundCloud/Hearthis

---

## Admin UI Pages

| Page | Purpose |
|---|---|
| **Dashboard** | Live crawl stats per source, progress bars, Start/Stop/Retry controls, rate limit display |
| **Sources** | Per-adapter toggle, schedule config, last run timestamp, success/fail counts |
| **LLM Monitor** | Per-stage stats (calls, avg latency, token usage), provider health, low-confidence rate |
| **Review Queue** | Flagged entities (confidence < 0.8) — admin approves or rejects merge suggestions |
| **Recent Imports** | Paginated log of imported entities with source attribution and LLM confidence score |
| **Settings** | API keys (Zephyron, LLM providers), rate limits per source, LLM provider selection, stage toggles |

---

## File Structure

```
zephyron-crawler/
├── src/
│   ├── adapters/
│   │   ├── index.ts              # SourceAdapter interface + registry
│   │   ├── tracklists-1001.ts    # Existing 1001TL adapter
│   │   ├── mixcloud.ts           # Mixcloud public API adapter
│   │   ├── ra.ts                 # Resident Advisor scraper
│   │   └── youtube.ts            # yt-dlp metadata adapter
│   ├── workers/
│   │   ├── coordinator.ts        # Seeds frontier, enqueues child jobs per source
│   │   ├── artist.ts             # BullMQ processor
│   │   ├── event.ts              # BullMQ processor
│   │   ├── set.ts                # BullMQ processor
│   │   └── llm.ts                # LLM pipeline processor
│   ├── queues/
│   │   └── index.ts              # BullMQ Queue + QueueEvents definitions
│   ├── llm/
│   │   ├── index.ts              # LLMProvider interface + factory
│   │   ├── providers/
│   │   │   ├── anthropic.ts
│   │   │   ├── bedrock.ts
│   │   │   ├── ollama.ts
│   │   │   └── openai.ts
│   │   └── stages/
│   │       ├── sanitize.ts
│   │       ├── match.ts
│   │       ├── merge.ts
│   │       └── enrich.ts
│   ├── services/
│   │   ├── frontier.ts           # Redis-backed URL queue helpers
│   │   ├── rate-limiter.ts       # Token bucket via Redis
│   │   └── zephyron-api.ts       # Typed client for Zephyron admin API
│   ├── parsers/
│   │   ├── tracklists-1001/      # Existing parsers
│   │   ├── ra/                   # RA-specific parsers
│   │   └── youtube/              # yt-dlp output parsers
│   ├── api/
│   │   └── routes.ts             # REST endpoints for admin UI
│   ├── cron.ts
│   └── server.ts
├── admin/                        # React + Vite admin UI
│   └── src/
│       └── pages/
│           ├── Dashboard.tsx
│           ├── Sources.tsx
│           ├── LLMMonitor.tsx
│           ├── ReviewQueue.tsx
│           ├── RecentImports.tsx
│           └── Settings.tsx
├── tests/
│   ├── fixtures/
│   ├── adapters/
│   ├── llm/
│   └── zephyron-api.test.ts
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Rate Limiting

- Token bucket per source in Redis — each adapter has its own `MAX_RPS` ceiling
- Default values: 1001TL `CRAWL_DELAY_MS=2000`, Mixcloud `CRAWL_DELAY_MS=500`, RA `CRAWL_DELAY_MS=3000`, YouTube `CRAWL_DELAY_MS=1000`
- Configurable per-source in admin UI Settings without restart

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Adapter scrape fails | BullMQ retries with exponential backoff (3×) |
| LLM stage fails / Zod parse error | Sanitize: retry once then use raw; Match/Merge/Enrich: skip stage |
| LLM confidence < 0.8 | Enqueue to review queue, skip auto-import |
| Zephyron 409 Conflict | Skip silently |
| Zephyron 4xx | Log + mark job failed |
| Zephyron 5xx | BullMQ retry with backoff |
| Redis unavailable | Crawler exits, Docker Compose `restart: unless-stopped` recovers |

---

## Docker Compose

```yaml
services:
  redis:
    image: redis:7-alpine
    volumes: [redis-data:/data]
    restart: unless-stopped

  crawler:
    build: .
    depends_on: [redis, llm-proxy]
    env_file: .env
    ports:
      - "3001:3001"
    volumes:
      - .env:/app/.env
    restart: unless-stopped

  llm-proxy:
    build:
      context: ./llm-proxy
    env_file: .env
    ports:
      - "3002:3002"
    restart: unless-stopped

  admin:
    build:
      context: ./admin
    ports:
      - "3000:80"
    restart: unless-stopped

volumes:
  redis-data:
```

---

## Environment Variables (.env.example)

```env
# Zephyron
ZEPHYRON_API_URL=https://your-zephyron.com
ZEPHYRON_API_KEY=your_api_key_here

# Redis
REDIS_URL=redis://redis:6379

# LLM
LLM_PROVIDER=anthropic            # anthropic | bedrock | ollama | openai
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3

# Rate limits (ms between requests per source)
CRAWL_DELAY_1001TL=2000
CRAWL_DELAY_MIXCLOUD=500
CRAWL_DELAY_RA=3000
CRAWL_DELAY_YOUTUBE=1000

# General
PORT=3001
LLM_PROXY_PORT=3002
LLM_CONFIDENCE_THRESHOLD=0.8
```

---

## Testing

- **Adapter unit tests** — Vitest, HTML/API response fixtures per source
- **LLM stage tests** — mock provider, assert Zod schema validation and fallback behaviour
- **`frontier.ts` + `rate-limiter.ts`** — unit tests with `ioredis-mock`
- **`zephyron-api.ts`** — integration tests against local Zephyron dev instance
- **End-to-end** — `tsx src/server.ts` with a single-source bulk crawl against a test Zephyron instance

---

## Out of Scope

- Audio download or waveform generation (Zephyron handles this)
- User/listener data from any source
- Admin UI authentication (homelab — add nginx basic auth if exposed to internet)
- Automatic YouTube audio search (only resolves URLs already present in source metadata)
- Paying/authenticated API tiers for any source
