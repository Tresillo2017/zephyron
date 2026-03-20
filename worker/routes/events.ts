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

  let query = `SELECT e.*, (SELECT COUNT(*) FROM sets s WHERE s.event_id = e.id) as set_count FROM events e`
  const conditions: string[] = []
  const params: unknown[] = []

  if (q) { conditions.push('(e.name LIKE ? OR e.series LIKE ? OR e.location LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`) }
  if (series) { conditions.push('e.series = ?'); params.push(series) }

  if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`
  query += ' ORDER BY e.start_date DESC'

  const result = await env.DB.prepare(query).bind(...params).all()
  return json({ data: result.results, ok: true })
}

// GET /api/events/:id — Get event detail + its sets
export async function getEvent(
  _request: Request, env: Env, _ctx: ExecutionContext, params: Record<string, string>
): Promise<Response> {
  const { id } = params
  const event = await env.DB.prepare('SELECT * FROM events WHERE id = ? OR slug = ?').bind(id, id).first()
  if (!event) return errorResponse('Event not found', 404)

  const eventId = (event as any).id
  const sets = await env.DB.prepare(
    'SELECT * FROM sets WHERE event_id = ? ORDER BY created_at DESC'
  ).bind(eventId).all()

  return json({ data: { ...event, tags: tryParse((event as any).tags), sets: sets.results }, ok: true })
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

// POST /api/admin/events — Create event
export async function createEvent(
  request: Request, env: Env, _ctx: ExecutionContext, _params: Record<string, string>
): Promise<Response> {
  let body: { name: string; series?: string; description?: string; website?: string; location?: string; start_date?: string; end_date?: string; tags?: string[] }
  try { body = await request.json() } catch { return errorResponse('Invalid JSON', 400) }

  if (!body.name?.trim()) return errorResponse('name is required', 400)

  const id = generateId()
  const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  await env.DB.prepare(
    `INSERT INTO events (id, name, slug, series, description, website, location, start_date, end_date, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, body.name.trim(), slug,
    body.series?.trim() || null, body.description?.trim() || null,
    body.website?.trim() || null, body.location?.trim() || null,
    body.start_date || null, body.end_date || null,
    body.tags ? JSON.stringify(body.tags) : null
  ).run()

  return json({ data: { id, slug }, ok: true }, 201)
}

// PUT /api/admin/events/:id — Update event
export async function updateEvent(
  request: Request, env: Env, _ctx: ExecutionContext, params: Record<string, string>
): Promise<Response> {
  const { id } = params
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return errorResponse('Invalid JSON', 400) }

  const allowed: Record<string, string> = { name: 'name', series: 'series', description: 'description', website: 'website', location: 'location', start_date: 'start_date', end_date: 'end_date' }
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

// PUT /api/admin/events/:id/cover — Upload cover image
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
