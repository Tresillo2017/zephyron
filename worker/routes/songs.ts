// Song API routes — public read + admin CRUD
import { json, errorResponse } from '../lib/router'
import type { SongRecord } from '../services/songs'

// ═══════════════════════════════════════════
// Public endpoints
// ═══════════════════════════════════════════

// GET /api/songs/:id — Get song details
export async function getSong(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const song = await env.DB.prepare('SELECT * FROM songs WHERE id = ?')
    .bind(id)
    .first<SongRecord>()

  if (!song) {
    return errorResponse('Song not found', 404)
  }

  return json({ data: song, ok: true })
}

// GET /api/songs/:id/cover — Serve song cover art from R2
export async function getSongCover(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const song = await env.DB.prepare(
    'SELECT cover_art_r2_key, cover_art_url, lastfm_album_art FROM songs WHERE id = ?'
  ).bind(id).first<{
    cover_art_r2_key: string | null
    cover_art_url: string | null
    lastfm_album_art: string | null
  }>()

  if (!song) {
    return errorResponse('Song not found', 404)
  }

  // Try R2 first
  if (song.cover_art_r2_key) {
    const object = await env.AUDIO_BUCKET.get(song.cover_art_r2_key)
    if (object && object.body) {
      return new Response(object.body, {
        headers: {
          'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400',
        },
      })
    }
  }

  // Redirect to external URL
  const externalUrl = song.cover_art_url || song.lastfm_album_art
  if (externalUrl) {
    return Response.redirect(externalUrl, 302)
  }

  return errorResponse('No cover art available', 404)
}

// ═══════════════════════════════════════════
// Admin endpoints
// ═══════════════════════════════════════════

// GET /api/admin/songs — List songs (paginated, searchable)
export async function listSongsAdmin(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim()
  const page = parseInt(url.searchParams.get('page') || '1')
  const pageSize = 50
  const offset = (page - 1) * pageSize

  let countQuery = 'SELECT COUNT(*) as total FROM songs'
  let dataQuery = `SELECT s.*,
    (SELECT COUNT(*) FROM detections d WHERE d.song_id = s.id) as detection_count
    FROM songs s`
  const params: unknown[] = []

  if (q) {
    const where = ' WHERE s.artist LIKE ? OR s.title LIKE ? OR s.label LIKE ?'
    const countWhere = ' WHERE artist LIKE ? OR title LIKE ? OR label LIKE ?'
    dataQuery += where
    countQuery += countWhere
    params.push(`%${q}%`, `%${q}%`, `%${q}%`)
  }

  dataQuery += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?'

  const [countResult, dataResult] = await Promise.all([
    env.DB.prepare(countQuery).bind(...params).first<{ total: number }>(),
    env.DB.prepare(dataQuery).bind(...params, pageSize, offset).all(),
  ])

  return json({
    data: dataResult.results,
    total: countResult?.total || 0,
    page,
    pageSize,
    ok: true,
  })
}

// PUT /api/admin/songs/:id — Update song metadata
export async function updateSongAdmin(
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
    return errorResponse('Invalid JSON', 400)
  }

  const allowedFields = [
    'title', 'artist', 'label', 'album',
    'cover_art_url', 'spotify_url', 'apple_music_url', 'soundcloud_url',
    'beatport_url', 'youtube_url', 'deezer_url', 'bandcamp_url', 'traxsource_url',
  ]

  const updates: string[] = []
  const values: unknown[] = []

  for (const field of allowedFields) {
    if (field in body) {
      updates.push(`${field} = ?`)
      values.push(body[field] ?? null)
    }
  }

  if (updates.length === 0) {
    return errorResponse('No fields to update', 400)
  }

  updates.push('updated_at = CURRENT_TIMESTAMP')
  values.push(id)

  await env.DB.prepare(
    `UPDATE songs SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values).run()

  // Also update detection titles/artists if those changed
  if ('title' in body || 'artist' in body) {
    const song = await env.DB.prepare('SELECT title, artist FROM songs WHERE id = ?').bind(id).first<{ title: string; artist: string }>()
    if (song) {
      await env.DB.prepare(
        'UPDATE detections SET track_title = ?, track_artist = ?, updated_at = CURRENT_TIMESTAMP WHERE song_id = ?'
      ).bind(song.title, song.artist, id).run()
    }
  }

  return json({ ok: true })
}

// DELETE /api/admin/songs/:id — Delete a song (unlinks from detections)
export async function deleteSongAdmin(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  // Unlink detections
  await env.DB.prepare(
    'UPDATE detections SET song_id = NULL WHERE song_id = ?'
  ).bind(id).run()

  // Delete cover art from R2 if exists
  const song = await env.DB.prepare('SELECT cover_art_r2_key FROM songs WHERE id = ?').bind(id).first<{ cover_art_r2_key: string | null }>()
  if (song?.cover_art_r2_key) {
    try { await env.AUDIO_BUCKET.delete(song.cover_art_r2_key) } catch { /* non-blocking */ }
  }

  // Delete song
  await env.DB.prepare('DELETE FROM songs WHERE id = ?').bind(id).run()

  return json({ ok: true })
}

// POST /api/admin/songs/:id/cache-cover — Trigger cover art caching via queue
export async function cacheSongCoverAdmin(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const song = await env.DB.prepare('SELECT cover_art_url, lastfm_album_art FROM songs WHERE id = ?')
    .bind(id).first<{ cover_art_url: string | null; lastfm_album_art: string | null }>()

  if (!song) return errorResponse('Song not found', 404)

  const imageUrl = song.cover_art_url || song.lastfm_album_art
  if (!imageUrl) return errorResponse('No cover art URL to cache', 400)

  await env.COVER_ART_QUEUE.send({ type: 'cache_cover_art', song_id: id, image_url: imageUrl })

  return json({ ok: true, message: 'Cover art caching queued' })
}

// POST /api/admin/songs/:id/enrich — Trigger Last.fm enrichment via queue
export async function enrichSongAdmin(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const song = await env.DB.prepare('SELECT title, artist FROM songs WHERE id = ?')
    .bind(id).first<{ title: string; artist: string }>()

  if (!song) return errorResponse('Song not found', 404)

  await env.COVER_ART_QUEUE.send({ type: 'enrich_lastfm', song_id: id, artist: song.artist, title: song.title })

  return json({ ok: true, message: 'Last.fm enrichment queued' })
}
