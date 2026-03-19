import { json, errorResponse } from '../lib/router'
import { paginatedQuery } from '../lib/db'
import { streamAudio } from '../services/audio-stream'
import type { DjSet, Detection } from '../types'

// GET /api/sets — List all sets (paginated)
export async function listSets(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20')))
  const genre = url.searchParams.get('genre')
  const artist = url.searchParams.get('artist')
  const sort = url.searchParams.get('sort') || 'newest'

  const conditions: string[] = []
  const params: unknown[] = []

  if (genre) {
    conditions.push('genre = ?')
    params.push(genre)
  }
  if (artist) {
    conditions.push('artist LIKE ?')
    params.push(`%${artist}%`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  let orderClause: string
  switch (sort) {
    case 'popular':
      orderClause = 'ORDER BY play_count DESC'
      break
    case 'oldest':
      orderClause = 'ORDER BY created_at ASC'
      break
    case 'title':
      orderClause = 'ORDER BY title ASC'
      break
    default:
      orderClause = 'ORDER BY created_at DESC'
  }

  const result = await paginatedQuery<DjSet>(
    env.DB,
    `SELECT * FROM sets ${whereClause} ${orderClause} LIMIT ? OFFSET ?`,
    `SELECT COUNT(*) as total FROM sets ${whereClause}`,
    params,
    page,
    pageSize
  )

  return json(result)
}

// GET /api/sets/:id — Get set details with detections
export async function getSet(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const [setResult, detectionsResult, artistResult] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM sets WHERE id = ?').bind(id),
    env.DB.prepare(
      'SELECT * FROM detections WHERE set_id = ? ORDER BY start_time_seconds ASC'
    ).bind(id),
    env.DB.prepare(
      'SELECT a.id, a.name, a.slug, a.image_url, a.bio_summary, a.tags, a.lastfm_url, a.listeners FROM artists a JOIN sets s ON s.artist_id = a.id WHERE s.id = ?'
    ).bind(id),
  ])

  const set = setResult.results[0] as DjSet | undefined
  if (!set) {
    return errorResponse('Set not found', 404)
  }

  const artist = artistResult.results[0] as Record<string, unknown> | undefined

  return json({
    data: {
      ...set,
      detections: detectionsResult.results as unknown as Detection[],
      artist_info: artist ? {
        id: artist.id,
        name: artist.name,
        slug: artist.slug,
        image_url: artist.image_url,
        bio_summary: artist.bio_summary,
        tags: artist.tags,
        lastfm_url: artist.lastfm_url,
        listeners: artist.listeners,
      } : null,
    },
    ok: true,
  })
}

// GET /api/sets/:id/stream — Stream audio
export async function streamSet(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const set = await env.DB.prepare('SELECT r2_key FROM sets WHERE id = ?')
    .bind(id)
    .first<{ r2_key: string }>()

  if (!set) {
    console.error(`[streamSet] Set not found in DB: ${id}`)
    return new Response('Set not found', { status: 404 })
  }

  if (!set.r2_key || set.r2_key.includes('pending')) {
    console.error(`[streamSet] Set has no audio: ${id}, r2_key=${set.r2_key}`)
    return new Response('No audio uploaded for this set', { status: 404 })
  }

  try {
    return await streamAudio(request, set.r2_key, env, ctx)
  } catch (err) {
    console.error(`[streamSet] Stream error for ${id}:`, err)
    return new Response('Stream error', { status: 500 })
  }
}

// GET /api/sets/:id/stream/debug — Debug info about stream availability
export async function debugStream(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const set = await env.DB.prepare('SELECT id, r2_key, file_size_bytes, audio_format FROM sets WHERE id = ?')
    .bind(id)
    .first<{ id: string; r2_key: string; file_size_bytes: number | null; audio_format: string }>()

  if (!set) {
    return json({ error: 'Set not found in DB', ok: false })
  }

  let r2Exists = false
  let r2Size = 0
  let r2ContentType = ''
  try {
    const head = await env.AUDIO_BUCKET.head(set.r2_key)
    if (head) {
      r2Exists = true
      r2Size = head.size
      r2ContentType = head.httpMetadata?.contentType || 'not set'
    }
  } catch (err) {
    console.error('[debugStream] R2 head error:', err)
  }

  return json({
    data: {
      set_id: set.id,
      r2_key: set.r2_key,
      db_file_size: set.file_size_bytes,
      audio_format: set.audio_format,
      r2_exists: r2Exists,
      r2_size: r2Size,
      r2_content_type: r2ContentType,
      stream_url: `/api/sets/${id}/stream`,
    },
    ok: true,
  })
}

// POST /api/sets/:id/play — Increment play count
export async function incrementPlayCount(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  await env.DB.prepare(
    'UPDATE sets SET play_count = play_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  )
    .bind(id)
    .run()

  return json({ ok: true })
}

// GET /api/sets/genres — Get available genres
export async function listGenres(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const result = await env.DB.prepare(
    'SELECT DISTINCT genre, COUNT(*) as count FROM sets WHERE genre IS NOT NULL GROUP BY genre ORDER BY count DESC'
  ).all()

  return json({
    data: result.results,
    ok: true,
  })
}

// GET /api/sets/:id/cover — Serve cover image from R2
export async function getSetCover(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const set = await env.DB.prepare(
    'SELECT cover_image_r2_key FROM sets WHERE id = ?'
  )
    .bind(id)
    .first<{ cover_image_r2_key: string | null }>()

  if (!set?.cover_image_r2_key) {
    return new Response(null, { status: 404 })
  }

  const object = await env.AUDIO_BUCKET.get(set.cover_image_r2_key)
  if (!object) {
    return new Response(null, { status: 404 })
  }

  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg')
  headers.set('Cache-Control', 'public, max-age=86400')
  headers.set('Access-Control-Allow-Origin', '*')

  return new Response(object.body, { status: 200, headers })
}
