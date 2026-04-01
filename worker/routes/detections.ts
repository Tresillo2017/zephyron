import { json, errorResponse } from '../lib/router'
import { getAnonymousId } from '../lib/db'
import { generateId } from '../lib/id'
import type { Annotation } from '../types'

// GET /api/detections/set/:setId — Get all detections for a set (with song data)
export async function getDetections(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { setId } = params

  const result = await env.DB.prepare(
    `SELECT d.*,
       s.id as song__id, s.title as song__title, s.artist as song__artist,
       s.label as song__label, s.album as song__album,
       s.cover_art_url as song__cover_art_url, s.cover_art_r2_key as song__cover_art_r2_key,
       s.spotify_url as song__spotify_url, s.apple_music_url as song__apple_music_url,
       s.soundcloud_url as song__soundcloud_url, s.beatport_url as song__beatport_url,
       s.youtube_url as song__youtube_url, s.deezer_url as song__deezer_url,
       s.bandcamp_url as song__bandcamp_url, s.traxsource_url as song__traxsource_url,
       s.lastfm_url as song__lastfm_url, s.lastfm_album_art as song__lastfm_album_art,
       s.lastfm_album as song__lastfm_album, s.lastfm_tags as song__lastfm_tags,
       s.lastfm_listeners as song__lastfm_listeners
     FROM detections d
     LEFT JOIN songs s ON d.song_id = s.id
     WHERE d.set_id = ?
     ORDER BY d.start_time_seconds ASC`
  )
    .bind(setId)
    .all()

  // Reshape the flat SQL result into nested detection+song objects
  const detections = (result.results || []).map((row: Record<string, unknown>) => {
    const detection: Record<string, unknown> = {}
    let song: Record<string, unknown> | null = null

    for (const [key, value] of Object.entries(row)) {
      if (key.startsWith('song__')) {
        if (!song) song = {}
        song[key.replace('song__', '')] = value
      } else {
        detection[key] = value
      }
    }

    // Only include song if it has an id (i.e., song_id was not null)
    if (song && song.id) {
      detection.song = song
    } else {
      detection.song = null
    }

    return detection
  })

  return json({ data: detections, ok: true })
}

// POST /api/detections/:id/vote — Vote on a detection
export async function voteDetection(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params
  const anonymousId = getAnonymousId(request)
  if (!anonymousId) {
    return errorResponse('Anonymous ID required', 400)
  }

  let body: { vote: 1 | -1 }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  if (body.vote !== 1 && body.vote !== -1) {
    return errorResponse('Vote must be 1 or -1', 400)
  }

  // Check if already voted
  const existing = await env.DB.prepare(
    'SELECT id, vote FROM votes WHERE detection_id = ? AND anonymous_id = ?'
  )
    .bind(id, anonymousId)
    .first<{ id: string; vote: number }>()

  if (existing) {
    if (existing.vote === body.vote) {
      // Remove vote (toggle off)
      await env.DB.batch([
        env.DB.prepare('DELETE FROM votes WHERE id = ?').bind(existing.id),
        env.DB.prepare(
          body.vote === 1
            ? 'UPDATE detections SET upvotes = MAX(0, upvotes - 1) WHERE id = ?'
            : 'UPDATE detections SET downvotes = MAX(0, downvotes - 1) WHERE id = ?'
        ).bind(id),
      ])
      return json({ ok: true, action: 'removed' })
    } else {
      // Change vote
      const voteColumn = body.vote === 1 ? 'upvotes' : 'downvotes'
      const oppositeColumn = body.vote === 1 ? 'downvotes' : 'upvotes'
      await env.DB.batch([
        env.DB.prepare('UPDATE votes SET vote = ? WHERE id = ?').bind(body.vote, existing.id),
        env.DB.prepare(
          `UPDATE detections SET ${voteColumn} = ${voteColumn} + 1, ${oppositeColumn} = MAX(0, ${oppositeColumn} - 1) WHERE id = ?`
        ).bind(id),
      ])
      return json({ ok: true, action: 'changed' })
    }
  }

  // New vote
  const voteId = generateId()
  const voteColumn = body.vote === 1 ? 'upvotes' : 'downvotes'
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO votes (id, detection_id, anonymous_id, vote) VALUES (?, ?, ?, ?)'
    ).bind(voteId, id, anonymousId, body.vote),
    env.DB.prepare(
      `UPDATE detections SET ${voteColumn} = ${voteColumn} + 1 WHERE id = ?`
    ).bind(id),
  ])

  return json({ ok: true, action: 'created' })
}

// POST /api/annotations — Submit annotation
export async function createAnnotation(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const anonymousId = getAnonymousId(request)
  if (!anonymousId) {
    return errorResponse('Anonymous ID required', 400)
  }

  let body: {
    detection_id?: string
    set_id: string
    track_title: string
    track_artist?: string
    start_time_seconds: number
    end_time_seconds?: number
    annotation_type: 'correction' | 'new_track' | 'delete'
  }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  if (!body.set_id || !body.track_title || !body.annotation_type || body.start_time_seconds == null) {
    return errorResponse('set_id, track_title, annotation_type, and start_time_seconds required', 400)
  }

  const id = generateId()
  await env.DB.prepare(
    `INSERT INTO annotations (id, detection_id, set_id, anonymous_id, track_title, track_artist, start_time_seconds, end_time_seconds, annotation_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.detection_id || null,
      body.set_id,
      anonymousId,
      body.track_title,
      body.track_artist || null,
      body.start_time_seconds,
      body.end_time_seconds || null,
      body.annotation_type
    )
    .run()

  // Annotations are now reviewed by admin before feeding into ML pipeline
  // See: POST /api/admin/annotations/:id/moderate

  return json({ data: { id }, ok: true }, 201)
}

// GET /api/annotations/set/:setId — Get annotations for a set
export async function getAnnotations(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { setId } = params

  const result = await env.DB.prepare(
    'SELECT * FROM annotations WHERE set_id = ? ORDER BY start_time_seconds ASC'
  )
    .bind(setId)
    .all()

  return json({ data: result.results as unknown as Annotation[], ok: true })
}
