// PUT /api/admin/sets/:id/sync-1001tracklists — refresh an existing set from 1001Tracklists data.
//
// Used by the crawler when a set is already imported (create returned 409). Updates metadata in
// place. Audio is never overwritten: stream fields are only filled while the set has no stream
// source yet, and r2_key / play_count / detection_status / created_at are never touched.

import { json, errorResponse } from '../lib/router'
import { extract1001TracklistId } from '../services/tracklists-1001'

const MAX_COVER_BYTES = 5 * 1024 * 1024

interface SyncBody {
  title?: string
  artist?: string
  description?: string
  genre?: string
  subgenre?: string
  venue?: string
  event?: string
  recorded_date?: string
  duration_seconds?: number
  tracklist_1001_url?: string
  artist_id?: string
  event_id?: string
  artist_ids?: string[]
  thumbnail_url?: string
  source_url?: string
  stream_type?: 'youtube' | 'soundcloud' | 'hearthis'
  youtube_video_id?: string
  tracklist_1001_hash?: string
}

// Metadata columns that the sync may overwrite. Empty strings are ignored for title/artist.
const METADATA_COLUMNS = [
  'title', 'artist', 'description', 'genre', 'subgenre', 'venue', 'event', 'recorded_date',
  'tracklist_1001_url', 'artist_id', 'event_id',
] as const

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** Derive the stored stream_type the same way createSet does. */
function resolveStream(body: SyncBody): { stream_type: string; youtube_video_id: string | null; source_url: string | null } | null {
  if (body.youtube_video_id) {
    return {
      stream_type: 'invidious',
      youtube_video_id: body.youtube_video_id,
      source_url: body.source_url ?? `https://www.youtube.com/watch?v=${body.youtube_video_id}`,
    }
  }
  if (body.stream_type === 'soundcloud' && body.source_url) {
    return { stream_type: 'soundcloud', youtube_video_id: null, source_url: body.source_url }
  }
  if (body.stream_type === 'hearthis' && body.source_url) {
    return { stream_type: 'hearthis', youtube_video_id: null, source_url: body.source_url }
  }
  return null
}

/**
 * Cache a remote cover image to R2 and point the set at it. Best-effort: failures are logged,
 * never thrown, so they cannot fail an import. Only runs when the set has no cover yet.
 */
export async function cacheSetCover(env: Env, setId: string, imageUrl: string): Promise<void> {
  try {
    const existing = await env.DB.prepare('SELECT cover_image_r2_key FROM sets WHERE id = ?')
      .bind(setId).first<{ cover_image_r2_key: string | null }>()
    if (!existing || existing.cover_image_r2_key) return

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(imageUrl, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return

    const buf = await res.arrayBuffer()
    if (buf.byteLength === 0 || buf.byteLength > MAX_COVER_BYTES) return

    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const r2Key = `sets/${setId}/cover.jpg`
    await env.AUDIO_BUCKET.put(r2Key, buf, { httpMetadata: { contentType } })
    await env.DB.prepare('UPDATE sets SET cover_image_r2_key = ? WHERE id = ?').bind(r2Key, setId).run()
  } catch (err) {
    console.error('[1001-sync] cover cache failed:', err)
  }
}

export async function syncSet1001Tracklists(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  let body: SyncBody
  try {
    body = await request.json() as SyncBody
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  const existing = await env.DB.prepare(
    'SELECT id, stream_type, youtube_video_id, source_url FROM sets WHERE id = ?'
  ).bind(id).first<{ id: string; stream_type: string | null; youtube_video_id: string | null; source_url: string | null }>()
  if (!existing) return errorResponse('Set not found', 404)

  const setClauses: string[] = []
  const values: unknown[] = []
  const updatedFields: string[] = []

  const metadata: Record<string, unknown> = {
    title: cleanString(body.title),
    artist: cleanString(body.artist),
    description: cleanString(body.description),
    genre: cleanString(body.genre),
    subgenre: cleanString(body.subgenre),
    venue: cleanString(body.venue),
    event: cleanString(body.event),
    recorded_date: cleanString(body.recorded_date),
    tracklist_1001_url: cleanString(body.tracklist_1001_url),
    artist_id: cleanString(body.artist_id),
    event_id: cleanString(body.event_id),
  }
  // title/artist are required columns; only overwrite when a value was provided
  for (const col of METADATA_COLUMNS) {
    if (body[col as keyof SyncBody] === undefined) continue // field not sent: leave untouched
    const value = metadata[col]
    if (value === null && (col === 'title' || col === 'artist')) continue // never blank required columns
    setClauses.push(`${col} = ?`)
    values.push(value)
    updatedFields.push(col)
  }

  if (typeof body.duration_seconds === 'number' && body.duration_seconds > 0) {
    setClauses.push('duration_seconds = ?')
    values.push(Math.round(body.duration_seconds))
    updatedFields.push('duration_seconds')
  }

  const tracklist1001Id = body.tracklist_1001_url ? extract1001TracklistId(body.tracklist_1001_url) : null
  if (tracklist1001Id) {
    setClauses.push('tracklist_1001_id = ?')
    values.push(tracklist1001Id)
    updatedFields.push('tracklist_1001_id')
  }

  // Stream source: fill only while the set has none. Existing audio/sources are authoritative.
  let streamFilled = false
  const stream = existing.stream_type === null ? resolveStream(body) : null
  if (stream) {
    setClauses.push('stream_type = ?', 'youtube_video_id = ?', 'source_url = ?')
    values.push(stream.stream_type, stream.youtube_video_id, stream.source_url)
    updatedFields.push('stream_type')
    streamFilled = true
  }

  if (body.tracklist_1001_hash) {
    setClauses.push('tracklist_1001_hash = ?', 'tracklist_1001_synced_at = CURRENT_TIMESTAMP')
    values.push(body.tracklist_1001_hash)
    updatedFields.push('tracklist_1001_hash')
  }

  const artistIds = Array.isArray(body.artist_ids) ? body.artist_ids.filter(Boolean) : null
  if (setClauses.length === 0 && !artistIds) {
    return errorResponse('No valid fields to update', 400)
  }

  const statements: D1PreparedStatement[] = []
  if (setClauses.length > 0) {
    setClauses.push('updated_at = CURRENT_TIMESTAMP')
    statements.push(
      env.DB.prepare(`UPDATE sets SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values, id)
    )
  }
  if (artistIds) {
    statements.push(env.DB.prepare('DELETE FROM set_artists WHERE set_id = ?').bind(id))
    artistIds.forEach((artistId, position) => {
      statements.push(
        env.DB.prepare('INSERT INTO set_artists (set_id, artist_id, position) VALUES (?, ?, ?)')
          .bind(id, artistId, position)
      )
    })
    updatedFields.push('artist_ids')
  }
  await env.DB.batch(statements)

  if (body.thumbnail_url) {
    ctx.waitUntil(cacheSetCover(env, id, body.thumbnail_url))
  }

  return json({ ok: true, data: { id, updated_fields: updatedFields, stream_filled: streamFilled } })
}
