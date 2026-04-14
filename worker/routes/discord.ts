// Discord Bot Integration Routes
import { json, errorResponse } from '../lib/router'
import type { DjSet, Env } from '../types'

// POST /api/webhooks/discord — Notify Discord bot of events
// This endpoint is called internally when events occur
export async function notifyDiscordBot(
  env: Env,
  eventType: 'set.uploaded' | 'set.featured' | 'platform.status' | 'platform.changelog',
  payload: unknown
): Promise<void> {
  const discordBotUrl = env.DISCORD_BOT_WEBHOOK_URL
  const webhookSecret = env.DISCORD_WEBHOOK_SECRET

  if (!discordBotUrl || !webhookSecret) {
    console.warn('Discord bot webhook not configured')
    return
  }

  try {
    // Generate HMAC-SHA256 signature
    const bodyStr = JSON.stringify({ type: eventType, payload })
    const encoder = new TextEncoder()
    const data = encoder.encode(bodyStr)
    const keyData = encoder.encode(webhookSecret)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data)
    const signatureHex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const response = await fetch(discordBotUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-zephyron-signature': signatureHex,
      },
      body: bodyStr,
    })

    if (!response.ok) {
      console.error('Failed to notify Discord bot:', response.status, await response.text())
    } else {
      console.log(`Discord bot notified: ${eventType}`)
    }
  } catch (error) {
    console.error('Error notifying Discord bot:', error)
  }
}

// GET /api/sets/trending — Get trending sets for Discord bot
export async function getTrendingSets(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url)
  const period = url.searchParams.get('period') || 'week'
  const limit = Math.min(20, Math.max(1, parseInt(url.searchParams.get('limit') || '10')))

  // Calculate date range based on period
  let daysAgo: number
  switch (period) {
    case 'today':
      daysAgo = 1
      break
    case 'week':
      daysAgo = 7
      break
    case 'month':
      daysAgo = 30
      break
    default:
      daysAgo = 7
  }

  // Get trending sets (most played in the time period)
  const result = await env.DB.prepare(
    `SELECT s.*,
       a.id as artist_id, a.name as artist, a.slug as artist_slug, a.image_url as artist_avatar_url
     FROM sets s
     LEFT JOIN artists a ON s.artist_id = a.id
     WHERE s.created_at >= datetime('now', '-' || ? || ' days')
     ORDER BY s.play_count DESC, s.created_at DESC
     LIMIT ?`
  )
    .bind(daysAgo, limit)
    .all<DjSet & { artist_id: string; artist: string; artist_avatar_url: string | null }>()

  const sets = result.results.map((set) => ({
    id: set.id,
    title: set.title,
    description: set.description,
    artwork_url: set.cover_image_r2_key
      ? `https://audio.zephyron.app/audio/${set.cover_image_r2_key}`
      : 'https://zephyron.app/og-image.png',
    duration: set.duration_seconds || 0,
    genre: set.genre || 'Unknown',
    plays: set.play_count || 0,
    rating: 0, // Not implemented yet
    created_at: set.created_at,
    artist: {
      id: set.artist_id,
      name: set.artist || 'Unknown Artist',
      avatar_url: set.artist_avatar_url,
    },
  }))

  return json({ sets })
}

// GET /api/sets/random — Get random set
export async function getRandomSet(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url)
  const genre = url.searchParams.get('genre')

  let query = 'SELECT s.*, a.id as artist_id, a.name as artist FROM sets s LEFT JOIN artists a ON s.artist_id = a.id'
  const params: unknown[] = []

  if (genre) {
    query += ' WHERE s.genre = ?'
    params.push(genre)
  }

  query += ' ORDER BY RANDOM() LIMIT 1'

  const result = await env.DB.prepare(query).bind(...params).first<DjSet & { artist_id: string; artist: string }>()

  if (!result) {
    return errorResponse('No sets found', 404)
  }

  const set = {
    id: result.id,
    title: result.title,
    description: result.description,
    artwork_url: result.cover_image_r2_key
      ? `https://audio.zephyron.app/audio/${result.cover_image_r2_key}`
      : 'https://zephyron.app/og-image.png',
    duration: result.duration_seconds || 0,
    genre: result.genre || 'Unknown',
    plays: result.play_count || 0,
    rating: 0,
    created_at: result.created_at,
    artist: {
      id: result.artist_id,
      name: result.artist || 'Unknown Artist',
    },
  }

  return json({ set })
}

// POST /api/discord/test — Test Discord webhook integration (admin only)
export async function testDiscordWebhook(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  // Get a random set to send as test
  const result = await env.DB.prepare(
    `SELECT s.*, a.id as artist_id, a.name as artist, a.image_url as artist_avatar_url
     FROM sets s
     LEFT JOIN artists a ON s.artist_id = a.id
     ORDER BY RANDOM()
     LIMIT 1`
  ).first<DjSet & { artist_id: string; artist: string; artist_avatar_url: string | null }>()

  if (!result) {
    return errorResponse('No sets available for test', 404)
  }

  const testSet = {
    id: result.id,
    title: result.title,
    description: result.description,
    artwork_url: result.cover_image_r2_key
      ? `https://audio.zephyron.app/audio/${result.cover_image_r2_key}`
      : 'https://zephyron.app/og-image.png',
    duration: result.duration_seconds || 0,
    genre: result.genre || 'Unknown',
    plays: result.play_count || 0,
    rating: 0,
    created_at: result.created_at,
  }

  const testArtist = {
    id: result.artist_id,
    name: result.artist || 'Unknown Artist',
    avatar_url: result.artist_avatar_url,
  }

  await notifyDiscordBot(env, 'set.uploaded', { set: testSet, artist: testArtist })

  return json({
    success: true,
    message: 'Test webhook sent to Discord bot',
    set: testSet,
  })
}
