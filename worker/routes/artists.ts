// Artist routes
import { json, errorResponse } from '../lib/router'
import { lookupArtist } from '../services/lastfm'

// GET /api/artists — List all artists with set counts (supports ?q= search)
export async function listArtists(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim()

  let query = `SELECT a.*,
       (SELECT COUNT(*) FROM sets s WHERE s.artist_id = a.id) as set_count
     FROM artists a`
  const params: unknown[] = []

  if (q) {
    query += ` WHERE a.name LIKE ?`
    params.push(`%${q}%`)
  }

  query += ` ORDER BY a.listeners DESC LIMIT 50`

  const result = await env.DB.prepare(query).bind(...params).all()

  return json({ data: result.results, ok: true })
}

// GET /api/artists/:id — Get artist details + their sets
export async function getArtist(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  // Look up by id or slug
  const artist = await env.DB.prepare(
    'SELECT * FROM artists WHERE id = ? OR slug = ?'
  ).bind(id, id).first()

  if (!artist) {
    return errorResponse('Artist not found', 404)
  }

  const artistId = (artist as any).id

  // Get their sets
  const sets = await env.DB.prepare(
    `SELECT * FROM sets WHERE artist_id = ? OR artist = ? ORDER BY created_at DESC`
  ).bind(artistId, (artist as any).name).all()

  return json({
    data: {
      ...artist,
      tags: tryParse((artist as any).tags),
      similar_artists: tryParse((artist as any).similar_artists),
      sets: sets.results,
    },
    ok: true,
  })
}

// POST /api/admin/artists/:id/sync — Re-sync artist from Last.fm
export async function syncArtist(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params
  const lastfmKey = env.LASTFM_API_KEY

  if (!lastfmKey) {
    return errorResponse('LASTFM_API_KEY not configured', 500)
  }

  const artist = await env.DB.prepare('SELECT name FROM artists WHERE id = ?')
    .bind(id)
    .first<{ name: string }>()

  if (!artist) {
    return errorResponse('Artist not found', 404)
  }

  const lfm = await lookupArtist(artist.name, lastfmKey)
  if (!lfm) {
    return errorResponse('Could not find artist on Last.fm', 404)
  }

  // Only update image_url if Last.fm has a real image — preserve manually set images
  const currentArtist = await env.DB.prepare('SELECT image_url FROM artists WHERE id = ?')
    .bind(id)
    .first<{ image_url: string | null }>()

  const imageUrl = lfm.imageUrl || currentArtist?.image_url || null

  await env.DB.prepare(
    `UPDATE artists SET
       lastfm_url = ?, lastfm_mbid = ?, image_url = ?,
       bio_summary = ?, bio_full = ?,
       tags = ?, similar_artists = ?,
       listeners = ?, playcount = ?,
       last_synced_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
    .bind(
      lfm.url, lfm.mbid, imageUrl,
      lfm.bioSummary, lfm.bioFull,
      JSON.stringify(lfm.tags), JSON.stringify(lfm.similarArtists),
      lfm.listeners, lfm.playcount,
      id
    )
    .run()

  return json({ ok: true, image_updated: !!lfm.imageUrl })
}

// PUT /api/admin/artists/:id — Update artist info manually
export async function updateArtist(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  const allowedFields: Record<string, string> = {
    name: 'name',
    image_url: 'image_url',
    bio_summary: 'bio_summary',
    bio_full: 'bio_full',
    tags: 'tags',
  }

  const updates: string[] = []
  const values: unknown[] = []

  for (const [bodyKey, dbCol] of Object.entries(allowedFields)) {
    if (bodyKey in body) {
      updates.push(`${dbCol} = ?`)
      const val = body[bodyKey]
      // Tags can be an array — serialize to JSON
      values.push(Array.isArray(val) ? JSON.stringify(val) : (val || null))
    }
  }

  if (updates.length === 0) {
    return errorResponse('No valid fields to update', 400)
  }

  values.push(id)
  await env.DB.prepare(
    `UPDATE artists SET ${updates.join(', ')} WHERE id = ?`
  )
    .bind(...values)
    .run()

  return json({ ok: true })
}

// DELETE /api/admin/artists/:id — Delete an artist
export async function deleteArtist(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  // Unlink sets from this artist
  await env.DB.prepare('UPDATE sets SET artist_id = NULL WHERE artist_id = ?')
    .bind(id)
    .run()

  await env.DB.prepare('DELETE FROM artists WHERE id = ?').bind(id).run()

  return json({ ok: true })
}

// GET /api/artists/:id/background — Serve artist background image from R2
export async function getArtistBackground(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  // Try by id or slug
  const artist = await env.DB.prepare(
    'SELECT id, background_url FROM artists WHERE id = ? OR slug = ?'
  ).bind(id, id).first<{ id: string; background_url: string | null }>()

  if (!artist?.background_url) {
    return new Response(null, { status: 404 })
  }

  // The background is stored in R2 at artists/{id}/background.jpg
  const r2Key = `artists/${artist.id}/background.jpg`
  const object = await env.AUDIO_BUCKET.get(r2Key)

  if (!object) {
    return new Response(null, { status: 404 })
  }

  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg')
  headers.set('Cache-Control', 'public, max-age=86400')
  headers.set('Access-Control-Allow-Origin', '*')

  return new Response(object.body, { status: 200, headers })
}

function tryParse(val: unknown): unknown {
  if (typeof val !== 'string') return val
  try { return JSON.parse(val) } catch { return val }
}
