import { json, errorResponse } from '../lib/router'
import { generateId } from '../lib/id'

// ═══════════════════════════════════════════
// PUBLIC
// ═══════════════════════════════════════════

// GET /api/events — List all events with set counts
export async function listEvents(
  request: Request, env: Env, _ctx: ExecutionContext, _params: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim()
  const series = url.searchParams.get('series')

  const year = url.searchParams.get('year')

  let query = `SELECT e.*, (SELECT COUNT(*) FROM sets s WHERE s.event_id = e.id) as set_count, (SELECT COALESCE(SUM(duration_seconds), 0) FROM sets s WHERE s.event_id = e.id) as total_duration FROM events e`
  const conditions: string[] = []
  const params: unknown[] = []

  if (q) { conditions.push('(e.name LIKE ? OR e.series LIKE ? OR e.location LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`) }
  if (series) { conditions.push('e.series = ?'); params.push(series) }
  if (year) { conditions.push('e.year = ?'); params.push(parseInt(year)) }

  if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`
  query += ' ORDER BY e.year DESC NULLS LAST, e.start_date DESC'

  const result = await env.DB.prepare(query).bind(...params).all()
  return json({ data: result.results, ok: true })
}

// GET /api/events/:id — Get event detail + its sets + aggregates
export async function getEvent(
  _request: Request, env: Env, _ctx: ExecutionContext, params: Record<string, string>
): Promise<Response> {
  const { id } = params
  const event = await env.DB.prepare('SELECT * FROM events WHERE id = ? OR slug = ?').bind(id, id).first()
  if (!event) return errorResponse('Event not found', 404)

  const eventId = (event as any).id
  const eventSeries = (event as any).series as string | null

  // Batch: sets, aggregates, genre breakdown, artist lineup, sibling editions
  const [setsResult, aggregateResult, genresResult, artistsResult, editionsResult] = await env.DB.batch([
    env.DB.prepare(
      'SELECT * FROM sets WHERE event_id = ? ORDER BY created_at DESC'
    ).bind(eventId),
    env.DB.prepare(
      `SELECT
        COUNT(*) as set_count,
        COALESCE(SUM(play_count), 0) as total_plays,
        COALESCE(SUM(duration_seconds), 0) as total_duration,
        COUNT(DISTINCT artist) as artist_count
       FROM sets WHERE event_id = ?`
    ).bind(eventId),
    env.DB.prepare(
      `SELECT genre, COUNT(*) as count
       FROM sets WHERE event_id = ? AND genre IS NOT NULL AND genre != ''
       GROUP BY genre ORDER BY count DESC`
    ).bind(eventId),
    env.DB.prepare(
      `SELECT DISTINCT a.id, a.name, a.slug, a.image_url
       FROM artists a
       JOIN sets s ON s.artist_id = a.id
       WHERE s.event_id = ?
       ORDER BY a.name ASC`
    ).bind(eventId),
    // Sibling editions: same series, different event
    eventSeries
      ? env.DB.prepare(
          'SELECT id, slug, year, name FROM events WHERE series = ? AND id != ? ORDER BY year DESC'
        ).bind(eventSeries, eventId)
      : env.DB.prepare('SELECT NULL AS id WHERE 0'),
  ])

  const agg = aggregateResult.results[0] as Record<string, unknown> | undefined

  return json({
    data: {
      ...event,
      tags: tryParse((event as any).tags),
      sets: setsResult.results,
      // Aggregates
      stats: {
        set_count: Number(agg?.set_count) || 0,
        total_plays: Number(agg?.total_plays) || 0,
        total_duration: Number(agg?.total_duration) || 0,
        artist_count: Number(agg?.artist_count) || 0,
      },
      // Genre breakdown
      genres: genresResult.results as { genre: string; count: number }[],
      // Artist lineup
      artists: artistsResult.results as { id: string; name: string; slug: string | null; image_url: string | null }[],
      // Sibling editions (same series, different year)
      editions: (editionsResult.results as Record<string, unknown>[] || [])
        .filter((e) => e.id != null)
        .map((e) => ({ id: e.id, slug: e.slug, year: e.year, name: e.name })),
    },
    ok: true,
  })
}

// GET /api/events/:id/cover — Serve event cover image
export async function getEventCover(
  _request: Request, env: Env, _ctx: ExecutionContext, params: Record<string, string>
): Promise<Response> {
  const { id } = params
  const event = await env.DB.prepare('SELECT cover_image_r2_key FROM events WHERE id = ? OR slug = ?').bind(id, id).first<{ cover_image_r2_key: string | null }>()
  if (!event?.cover_image_r2_key) return new Response(null, { status: 404 })

  const object = await env.AUDIO_BUCKET.get(event.cover_image_r2_key)
  if (!object) return new Response(null, { status: 404 })

  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg')
  headers.set('Cache-Control', 'public, max-age=86400')
  headers.set('Access-Control-Allow-Origin', '*')
  return new Response(object.body, { status: 200, headers })
}

// ═══════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════

const EVENT_SOCIAL_FIELDS = ['facebook_url', 'instagram_url', 'youtube_url', 'x_url'] as const

// POST /api/admin/events — Create event
export async function createEvent(
  request: Request, env: Env, ctx: ExecutionContext, _params: Record<string, string>
): Promise<Response> {
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return errorResponse('Invalid JSON', 400) }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return errorResponse('name is required', 400)

  const id = generateId()
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const source1001Id = typeof body.source_1001_id === 'string' ? body.source_1001_id.trim() || null : null

  // Year: explicit override > extracted from start_date > extracted from name
  let year: number | null = null
  if (typeof body.year === 'number') {
    year = body.year
  } else if (typeof body.start_date === 'string') {
    const m = (body.start_date as string).match(/^(\d{4})/)
    if (m) year = parseInt(m[1])
  }
  if (!year) {
    const m = name.match(/\b(20\d{2})\b/)
    if (m) year = parseInt(m[1])
  }

  const socials: Record<string, string | null> = {}
  for (const field of EVENT_SOCIAL_FIELDS) {
    socials[field] = typeof body[field] === 'string' ? (body[field] as string).trim() || null : null
  }

  await env.DB.prepare(
    `INSERT INTO events (id, name, slug, series, description, website, location, start_date, end_date, tags, year, source_1001_id, facebook_url, instagram_url, youtube_url, x_url, aftermovie_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, name, slug,
    typeof body.series === 'string' ? body.series.trim() || null : null,
    typeof body.description === 'string' ? body.description.trim() || null : null,
    typeof body.website === 'string' ? body.website.trim() || null : null,
    typeof body.location === 'string' ? body.location.trim() || null : null,
    body.start_date || null, body.end_date || null,
    Array.isArray(body.tags) ? JSON.stringify(body.tags) : null,
    year,
    source1001Id,
    socials.facebook_url, socials.instagram_url, socials.youtube_url, socials.x_url,
    typeof body.aftermovie_url === 'string' ? body.aftermovie_url.trim() || null : null
  ).run()

  // Auto-fetch and cache cover image to R2 if provided
  if (typeof body.cover_image_url === 'string' && body.cover_image_url) {
    const coverUrl = body.cover_image_url
    ctx.waitUntil((async () => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)
        const res = await fetch(coverUrl, { signal: controller.signal })
        clearTimeout(timeout)
        if (res.ok) {
          const buf = await res.arrayBuffer()
          if (buf.byteLength > 0 && buf.byteLength < 10 * 1024 * 1024) {
            const ct = res.headers.get('content-type') || 'image/jpeg'
            const r2Key = `events/${id}/cover.jpg`
            await env.AUDIO_BUCKET.put(r2Key, buf, { httpMetadata: { contentType: ct } })
            await env.DB.prepare('UPDATE events SET cover_image_r2_key = ? WHERE id = ?').bind(r2Key, id).run()
          }
        }
      } catch { /* non-critical */ }
    })())
  }

  return json({ data: { id, slug }, ok: true }, 201)
}

// PUT /api/admin/events/:id — Update event
export async function updateEvent(
  request: Request, env: Env, _ctx: ExecutionContext, params: Record<string, string>
): Promise<Response> {
  const { id } = params
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return errorResponse('Invalid JSON', 400) }

  const allowed: Record<string, string> = {
    name: 'name', series: 'series', description: 'description',
    website: 'website', location: 'location', start_date: 'start_date', end_date: 'end_date',
    year: 'year',
    source_1001_id: 'source_1001_id',
    facebook_url: 'facebook_url', instagram_url: 'instagram_url',
    youtube_url: 'youtube_url', x_url: 'x_url',
    aftermovie_url: 'aftermovie_url',
  }
  const updates: string[] = []
  const values: unknown[] = []

  for (const [key, col] of Object.entries(allowed)) {
    if (key in body) { updates.push(`${col} = ?`); values.push(body[key] || null) }
  }
  if ('tags' in body) { updates.push('tags = ?'); values.push(Array.isArray(body.tags) ? JSON.stringify(body.tags) : null) }

  if (updates.length === 0) return errorResponse('No fields to update', 400)
  values.push(id)

  await env.DB.prepare(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()
  return json({ ok: true })
}

// DELETE /api/admin/events/:id — Delete event
export async function deleteEvent(
  _request: Request, env: Env, _ctx: ExecutionContext, params: Record<string, string>
): Promise<Response> {
  const { id } = params
  await env.DB.prepare('UPDATE sets SET event_id = NULL WHERE event_id = ?').bind(id).run()
  await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run()
  return json({ ok: true })
}

// PUT /api/admin/events/:id/cover — Upload cover image (wide, used as background)
export async function uploadEventCover(
  request: Request, env: Env, _ctx: ExecutionContext, params: Record<string, string>
): Promise<Response> {
  const { id } = params
  if (!request.body) return errorResponse('Body required', 400)

  const contentType = request.headers.get('Content-Type') || 'image/jpeg'
  const r2Key = `events/${id}/cover.jpg`
  const bodyBuffer = await request.arrayBuffer()
  await env.AUDIO_BUCKET.put(r2Key, bodyBuffer, { httpMetadata: { contentType } })

  await env.DB.prepare('UPDATE events SET cover_image_r2_key = ? WHERE id = ?').bind(r2Key, id).run()
  return json({ data: { r2_key: r2Key }, ok: true })
}

// PUT /api/admin/events/:id/logo — Upload logo image (square, displayed in banner)
export async function uploadEventLogo(
  request: Request, env: Env, _ctx: ExecutionContext, params: Record<string, string>
): Promise<Response> {
  const { id } = params
  if (!request.body) return errorResponse('Body required', 400)

  const contentType = request.headers.get('Content-Type') || 'image/png'
  const r2Key = `events/${id}/logo.png`
  const bodyBuffer = await request.arrayBuffer()
  await env.AUDIO_BUCKET.put(r2Key, bodyBuffer, { httpMetadata: { contentType } })

  await env.DB.prepare('UPDATE events SET logo_r2_key = ? WHERE id = ?').bind(r2Key, id).run()
  return json({ data: { r2_key: r2Key }, ok: true })
}

// GET /api/events/:id/logo — Serve event logo image
export async function getEventLogo(
  _request: Request, env: Env, _ctx: ExecutionContext, params: Record<string, string>
): Promise<Response> {
  const { id } = params
  const event = await env.DB.prepare('SELECT logo_r2_key FROM events WHERE id = ? OR slug = ?').bind(id, id).first<{ logo_r2_key: string | null }>()
  if (!event?.logo_r2_key) return new Response(null, { status: 404 })

  const object = await env.AUDIO_BUCKET.get(event.logo_r2_key)
  if (!object) return new Response(null, { status: 404 })

  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType || 'image/png')
  headers.set('Cache-Control', 'public, max-age=86400')
  headers.set('Access-Control-Allow-Origin', '*')
  return new Response(object.body, { status: 200, headers })
}

// POST /api/admin/events/:id/link-set — Link a set to this event
export async function linkSetToEvent(
  request: Request, env: Env, _ctx: ExecutionContext, params: Record<string, string>
): Promise<Response> {
  const { id } = params
  let body: { set_id: string }
  try { body = await request.json() } catch { return errorResponse('Invalid JSON', 400) }

  await env.DB.prepare('UPDATE sets SET event_id = ? WHERE id = ?').bind(id, body.set_id).run()

  // If event has no cover, use the set's thumbnail
  const event = await env.DB.prepare('SELECT cover_image_r2_key FROM events WHERE id = ?').bind(id).first<{ cover_image_r2_key: string | null }>()
  if (!event?.cover_image_r2_key) {
    const set = await env.DB.prepare('SELECT cover_image_r2_key FROM sets WHERE id = ?').bind(body.set_id).first<{ cover_image_r2_key: string | null }>()
    if (set?.cover_image_r2_key) {
      await env.DB.prepare('UPDATE events SET cover_image_r2_key = ? WHERE id = ?').bind(set.cover_image_r2_key, id).run()
    }
  }

  return json({ ok: true })
}

// POST /api/admin/events/:id/unlink-set — Unlink a set from this event
export async function unlinkSetFromEvent(
  request: Request, env: Env, _ctx: ExecutionContext, _params: Record<string, string>
): Promise<Response> {
  let body: { set_id: string }
  try { body = await request.json() } catch { return errorResponse('Invalid JSON', 400) }

  await env.DB.prepare('UPDATE sets SET event_id = NULL WHERE id = ?').bind(body.set_id).run()
  return json({ ok: true })
}

function tryParse(val: unknown): unknown {
  if (typeof val !== 'string') return val
  try { return JSON.parse(val) } catch { return val }
}
