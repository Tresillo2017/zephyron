# Zephyron

A curated DJ set streaming platform with AI-powered tracklist detection and community-driven corrections. Think "Spotify for DJ sets."

**Invite-only beta** — [zephyron.app](https://zephyron.app)

## Features

- **Audio Streaming** -- Stream DJ sets from R2 storage with waveform visualization and live listener counts
- **AI Tracklist Detection** -- Automatic track identification from YouTube descriptions/comments, parsed by LLM, enriched via Last.fm
- **Community Annotations** -- Users can correct, vote on, and improve AI-detected tracklists
- **Self-Improving ML** -- Community feedback loops back into detection prompts, improving accuracy over time
- **Artist Pages** -- Enriched artist profiles with bios, tags, similar artists, and discographies
- **Playlists & History** -- Personal playlists and listening history tracking

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, Tailwind CSS 4, Zustand 5 |
| Backend | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite at the edge) |
| Storage | Cloudflare R2 (audio files, covers) |
| AI/ML | Workers AI, Vectorize (semantic search) |
| Auth | Better Auth (email/password, 2FA, invite codes) |
| Queues | Cloudflare Queues (ML detection pipeline, feedback) |
| Realtime | Durable Objects (live listener counts) |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (package manager & runtime)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (Cloudflare CLI)
- A Cloudflare account with Workers, D1, R2, and Workers AI enabled

### Setup

```bash
# Clone the repository
git clone https://github.com/tresillo2017/zephyron.git
cd zephyron

# Install dependencies
bun install

# Copy environment variables
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your API keys

# Generate Cloudflare types
bun run cf-typegen

# Run database migrations
wrangler d1 migrations apply zephyron-db --local

# Start development server
bun run dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Vite dev server with Cloudflare Workers |
| `bun run build` | Type-check and build for production |
| `bun run lint` | Run ESLint |
| `bun run deploy` | Build and deploy to Cloudflare Workers |
| `bun run cf-typegen` | Regenerate Cloudflare binding types |
| `bun run changeset` | Create a new changeset for versioning |

## Project Structure

```
zephyron/
├── src/                    # React frontend
│   ├── components/         # UI components (layout, player, admin, etc.)
│   ├── pages/              # Route pages
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Auth client, utilities
│   └── stores/             # Zustand state stores
├── worker/                 # Cloudflare Worker backend
│   ├── index.ts            # Main entry, route definitions
│   ├── lib/                # Auth, router, utilities
│   ├── services/           # Business logic (sets, search, ML, etc.)
│   ├── durable-objects/    # Durable Objects (live listeners)
│   └── queues/             # Queue consumers (ML detection, feedback)
├── migrations/             # D1 SQL migrations
├── public/                 # Static assets (fonts)
└── wrangler.jsonc          # Cloudflare deployment config
```

## Versioning

This project uses [Changesets](https://github.com/changesets/changesets) for versioning. When making a user-facing change:

```bash
bun run changeset          # Create a changeset describing the change
bun run changeset:version  # Apply changesets and bump version
```

## License

[MIT](LICENSE)
