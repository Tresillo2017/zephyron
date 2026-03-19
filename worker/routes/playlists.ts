import { json, errorResponse } from '../lib/router'
import { getAnonymousId } from '../lib/db'
import { generateId } from '../lib/id'
import type { Playlist } from '../types'

// GET /api/playlists — Get user's playlists
export async function listPlaylists(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const anonymousId = getAnonymousId(request)
  if (!anonymousId) {
    return json({ data: [], ok: true })
  }

  const result = await env.DB.prepare(
    `SELECT p.*,
       (SELECT COUNT(*) FROM playlist_items pi WHERE pi.playlist_id = p.id) as item_count
     FROM playlists p
     WHERE p.anonymous_id = ?
     ORDER BY p.updated_at DESC`
  )
    .bind(anonymousId)
    .all()

  return json({ data: result.results, ok: true })
}

// POST /api/playlists — Create playlist
export async function createPlaylist(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const anonymousId = getAnonymousId(request)
  if (!anonymousId) {
    return errorResponse('Anonymous ID required', 400)
  }

  let body: { title: string; description?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  if (!body.title?.trim()) {
    return errorResponse('Title is required', 400)
  }

  const id = generateId()
  await env.DB.prepare(
    'INSERT INTO playlists (id, anonymous_id, title, description) VALUES (?, ?, ?, ?)'
  )
    .bind(id, anonymousId, body.title.trim(), body.description?.trim() || null)
    .run()

  return json({ data: { id, title: body.title.trim() }, ok: true }, 201)
}

// GET /api/playlists/:id — Get playlist with sets
export async function getPlaylist(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const [playlistResult, itemsResult] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM playlists WHERE id = ?').bind(id),
    env.DB.prepare(
      `SELECT pi.*, s.title, s.artist, s.genre, s.duration_seconds, s.cover_image_r2_key, s.play_count
       FROM playlist_items pi
       JOIN sets s ON pi.set_id = s.id
       WHERE pi.playlist_id = ?
       ORDER BY pi.position ASC`
    ).bind(id),
  ])

  const playlist = playlistResult.results[0] as Playlist | undefined
  if (!playlist) {
    return errorResponse('Playlist not found', 404)
  }

  return json({
    data: {
      ...playlist,
      items: itemsResult.results,
    },
    ok: true,
  })
}

// PUT /api/playlists/:id — Update playlist
export async function updatePlaylist(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params
  const anonymousId = getAnonymousId(request)

  let body: { title?: string; description?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  // Verify ownership
  const playlist = await env.DB.prepare(
    'SELECT id FROM playlists WHERE id = ? AND anonymous_id = ?'
  )
    .bind(id, anonymousId)
    .first()

  if (!playlist) {
    return errorResponse('Playlist not found or unauthorized', 404)
  }

  const updates: string[] = []
  const updateParams: unknown[] = []

  if (body.title !== undefined) {
    updates.push('title = ?')
    updateParams.push(body.title.trim())
  }
  if (body.description !== undefined) {
    updates.push('description = ?')
    updateParams.push(body.description.trim() || null)
  }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP')
    await env.DB.prepare(
      `UPDATE playlists SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...updateParams, id)
      .run()
  }

  return json({ ok: true })
}

// DELETE /api/playlists/:id — Delete playlist
export async function deletePlaylist(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params
  const anonymousId = getAnonymousId(request)

  const playlist = await env.DB.prepare(
    'SELECT id FROM playlists WHERE id = ? AND anonymous_id = ?'
  )
    .bind(id, anonymousId)
    .first()

  if (!playlist) {
    return errorResponse('Playlist not found or unauthorized', 404)
  }

  await env.DB.prepare('DELETE FROM playlists WHERE id = ?').bind(id).run()
  return json({ ok: true })
}

// POST /api/playlists/:id/items — Add set to playlist
export async function addPlaylistItem(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params
  const anonymousId = getAnonymousId(request)

  let body: { set_id: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  if (!body.set_id) {
    return errorResponse('set_id is required', 400)
  }

  // Verify ownership
  const playlist = await env.DB.prepare(
    'SELECT id FROM playlists WHERE id = ? AND anonymous_id = ?'
  )
    .bind(id, anonymousId)
    .first()

  if (!playlist) {
    return errorResponse('Playlist not found or unauthorized', 404)
  }

  // Get next position
  const lastItem = await env.DB.prepare(
    'SELECT MAX(position) as max_pos FROM playlist_items WHERE playlist_id = ?'
  )
    .bind(id)
    .first<{ max_pos: number | null }>()

  const position = (lastItem?.max_pos ?? -1) + 1
  const itemId = generateId()

  try {
    await env.DB.prepare(
      'INSERT INTO playlist_items (id, playlist_id, set_id, position) VALUES (?, ?, ?, ?)'
    )
      .bind(itemId, id, body.set_id, position)
      .run()
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('UNIQUE')) {
      return errorResponse('Set already in playlist', 409)
    }
    throw err
  }

  // Update playlist timestamp
  await env.DB.prepare(
    'UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  )
    .bind(id)
    .run()

  return json({ data: { id: itemId }, ok: true }, 201)
}

// DELETE /api/playlists/:id/items/:setId — Remove set from playlist
export async function removePlaylistItem(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id, setId } = params
  const anonymousId = getAnonymousId(request)

  // Verify ownership
  const playlist = await env.DB.prepare(
    'SELECT id FROM playlists WHERE id = ? AND anonymous_id = ?'
  )
    .bind(id, anonymousId)
    .first()

  if (!playlist) {
    return errorResponse('Playlist not found or unauthorized', 404)
  }

  await env.DB.prepare(
    'DELETE FROM playlist_items WHERE playlist_id = ? AND set_id = ?'
  )
    .bind(id, setId)
    .run()

  return json({ ok: true })
}
