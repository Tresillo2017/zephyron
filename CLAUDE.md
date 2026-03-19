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
Clean with expressive touches. Dark, Spotify-adjacent foundation with moments of energy — waveform visualizations, subtle glow on interactive elements, smooth transitions. References: Mixcloud (DJ-focused, tracklist-centric) + SoundCloud (waveform-forward, social discovery). NOT corporate/sterile, NOT playful/childish, NOT cluttered/busy.

### Design Principles

1. **Music First, Chrome Second** — UI recedes when music plays. Content is the star.
2. **Dense but Breathable** — Show tracklist richness with intentional spacing and hierarchy.
3. **Expressive Restraint** — Dark canvas with earned moments of energy (waveform animation, accent pulse).
4. **Progressive Disclosure** — Essential info immediately, technical depth on interaction.
5. **Community as a Feature** — Corrections and votes feel like natural listening extensions.

### Design Tokens
- Dark mode only: `#0a0a0a` surface, `#141414` raised, `#1a1a1a` overlay
- Accent: `#1db954` (green), text: white/`#a7a7a7`/`#6a6a6a`
- Font: Inter, pill-shaped buttons/badges, `rounded-lg` cards
- WCAG AA accessibility target

### Tech Stack
React 19, Vite 7, Tailwind CSS 4 (`@theme`), Zustand 5, Cloudflare Workers + D1 + R2, Better Auth, custom UI primitives (no external component library).
