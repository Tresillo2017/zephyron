import { json, errorResponse } from '../lib/router'
import { paginatedQuery } from '../lib/db'
import { streamAudio } from '../services/audio-stream'
import { getBestAudioStream } from '../services/invidious'
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

  const [setResult, detectionsResult, artistResult, eventResult] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM sets WHERE id = ?').bind(id),
    env.DB.prepare(
      'SELECT * FROM detections WHERE set_id = ? ORDER BY start_time_seconds ASC'
    ).bind(id),
    env.DB.prepare(
      'SELECT a.id, a.name, a.slug, a.image_url, a.bio_summary, a.tags, a.lastfm_url, a.listeners FROM artists a JOIN sets s ON s.artist_id = a.id WHERE s.id = ?'
    ).bind(id),
    env.DB.prepare(
      'SELECT e.id, e.name, e.slug, e.series, e.description, e.website, e.location, e.start_date, e.end_date, e.cover_image_r2_key, e.logo_r2_key, e.tags, e.created_at FROM events e JOIN sets s ON s.event_id = e.id WHERE s.id = ?'
    ).bind(id),
  ])

  const set = setResult.results[0] as DjSet | undefined
  if (!set) {
    return errorResponse('Set not found', 404)
  }

  const artist = artistResult.results[0] as Record<string, unknown> | undefined
  const eventRow = eventResult.results[0] as Record<string, unknown> | undefined

  // Parse event tags from JSON string
  let eventTags: string[] = []
  if (eventRow?.tags) {
    try { eventTags = JSON.parse(String(eventRow.tags)) } catch {}
  }

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
      event_info: eventRow ? {
        id: eventRow.id,
        name: eventRow.name,
        slug: eventRow.slug,
        series: eventRow.series,
        description: eventRow.description,
        website: eventRow.website,
        location: eventRow.location,
        start_date: eventRow.start_date,
        end_date: eventRow.end_date,
        cover_image_r2_key: eventRow.cover_image_r2_key,
        logo_r2_key: eventRow.logo_r2_key,
        tags: eventTags,
        created_at: eventRow.created_at,
      } : null,
    },
    ok: true,
  })
}

// GET /api/sets/:id/stream — Stream audio (R2 or proxied via Invidious)
// For Invidious sets: resolves the audio URL via Invidious API and proxies
// the bytes through the Worker to avoid CORS issues with googlevideo.com.
// Supports Range requests for seeking.
export async function streamSet(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const set = await env.DB.prepare(
    'SELECT r2_key, stream_type, youtube_video_id FROM sets WHERE id = ?'
  )
    .bind(id)
    .first<{ r2_key: string; stream_type: string | null; youtube_video_id: string | null }>()

  if (!set) {
    console.error(`[streamSet] Set not found in DB: ${id}`)
    return new Response('Set not found', { status: 404 })
  }

  // Legacy R2 sets: stream from R2 bucket
  if (set.stream_type === 'r2' && set.r2_key && set.r2_key !== '' && !set.r2_key.includes('pending')) {
    try {
      return await streamAudio(request, set.r2_key, env, ctx)
    } catch (err) {
      console.error(`[streamSet] R2 stream error for ${id}:`, err)
      return new Response('Stream error', { status: 500 })
    }
  }

  // Invidious sets: proxy audio through the Invidious instance
  // getBestAudioStream uses local=true so the URL points to the Invidious proxy
  // (not googlevideo.com which blocks non-browser IPs).
  const videoId = set.youtube_video_id
  if (!videoId) {
    return new Response('No audio source available', { status: 404 })
  }

  try {
    // Resolve the best audio stream URL (proxied through Invidious)
    const audioStream = await getBestAudioStream(videoId, env)

    console.log(`[streamSet] Proxying audio from: ${new URL(audioStream.url).hostname}`)

    // Forward the client's Range header for seeking support
    const proxyHeaders = new Headers()
    const rangeHeader = request.headers.get('Range')
    if (rangeHeader) {
      proxyHeaders.set('Range', rangeHeader)
    }

    // Fetch from Invidious proxy (which fetches from YouTube internally)
    const upstream = await fetch(audioStream.url, {
      headers: proxyHeaders,
      redirect: 'follow',
    })

    if (!upstream.ok && upstream.status !== 206) {
      console.error(`[streamSet] Upstream fetch failed: ${upstream.status} ${upstream.statusText}`)
      return new Response('Audio stream unavailable', { status: 502 })
    }

    // Build response headers
    const headers = new Headers()
    headers.set('Content-Type', upstream.headers.get('Content-Type') || audioStream.type || 'audio/webm')
    headers.set('Accept-Ranges', 'bytes')
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges')

    const contentLength = upstream.headers.get('Content-Length')
    const contentRange = upstream.headers.get('Content-Range')
    if (contentLength) headers.set('Content-Length', contentLength)
    if (contentRange) headers.set('Content-Range', contentRange)

    headers.set('Cache-Control', 'public, max-age=3600')

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    })
  } catch (err) {
    console.error(`[streamSet] Invidious proxy error for ${id} (video=${videoId}):`, err)
    return new Response('Stream error', { status: 502 })
  }
}

// GET /api/sets/:id/stream-url — Returns the Worker proxy URL for audio streaming.
// The frontend uses this to know where to point <audio>.src.
// For both R2 and Invidious sets, we always return the /stream endpoint
// (which handles proxying internally) to avoid CORS issues.
export async function getStreamUrl(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const set = await env.DB.prepare(
    'SELECT youtube_video_id, stream_type, r2_key FROM sets WHERE id = ?'
  )
    .bind(id)
    .first<{ youtube_video_id: string | null; stream_type: string | null; r2_key: string }>()

  if (!set) {
    return errorResponse('Set not found', 404)
  }

  // Always return the Worker proxy endpoint — it handles both R2 and Invidious internally
  const source = (set.stream_type === 'r2' && set.r2_key && set.r2_key !== '') ? 'r2' : 'invidious'
  const contentType = source === 'r2' ? 'audio/mpeg' : 'audio/webm'

  return json({
    data: {
      url: `/api/sets/${id}/stream`,
      type: contentType,
      source,
    },
    ok: true,
  })
}

// GET /api/sets/:id/storyboard — Get storyboard data for thumbnail scrubber
export async function getStoryboard(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const set = await env.DB.prepare(
    'SELECT storyboard_data, youtube_video_id FROM sets WHERE id = ?'
  )
    .bind(id)
    .first<{ storyboard_data: string | null; youtube_video_id: string | null }>()

  if (!set) {
    return errorResponse('Set not found', 404)
  }

  // Return cached storyboard data from DB
  if (set.storyboard_data) {
    try {
      const storyboard = JSON.parse(set.storyboard_data)
      return json({ data: storyboard, ok: true })
    } catch {
      // Corrupted JSON — fall through to re-fetch
    }
  }

  // No cached data — try to fetch from Invidious
  if (!set.youtube_video_id) {
    return json({ data: null, ok: true })
  }

  try {
    const { fetchVideoData: fetchVideo, getStoryboardData: getStoryboard } = await import('../services/invidious')
    const videoData = await fetchVideo(set.youtube_video_id, env)
    const storyboard = getStoryboard(videoData.storyboards)

    // Cache it in DB for next time
    if (storyboard) {
      await env.DB.prepare(
        'UPDATE sets SET storyboard_data = ? WHERE id = ?'
      ).bind(JSON.stringify(storyboard), id).run()
    }

    return json({ data: storyboard, ok: true })
  } catch (err) {
    console.error(`[storyboard] Failed to fetch for ${id}:`, err)
    return json({ data: null, ok: true })
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

  const set = await env.DB.prepare(
    'SELECT id, r2_key, file_size_bytes, audio_format, stream_type, youtube_video_id FROM sets WHERE id = ?'
  )
    .bind(id)
    .first<{ id: string; r2_key: string; file_size_bytes: number | null; audio_format: string; stream_type: string | null; youtube_video_id: string | null }>()

  if (!set) {
    return json({ error: 'Set not found in DB', ok: false })
  }

  let r2Exists = false
  let r2Size = 0
  let r2ContentType = ''

  // Only check R2 for legacy sets
  if (set.stream_type === 'r2' && set.r2_key) {
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
  }

  return json({
    data: {
      set_id: set.id,
      stream_type: set.stream_type || 'r2',
      youtube_video_id: set.youtube_video_id,
      r2_key: set.r2_key,
      db_file_size: set.file_size_bytes,
      audio_format: set.audio_format,
      r2_exists: r2Exists,
      r2_size: r2Size,
      r2_content_type: r2ContentType,
      stream_url: set.stream_type === 'invidious'
        ? `/api/sets/${id}/stream-url`
        : `/api/sets/${id}/stream`,
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

// GET /api/sets/:id/video — Serve video preview from R2 (supports Range requests)
export async function getSetVideo(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const set = await env.DB.prepare(
    'SELECT video_preview_r2_key FROM sets WHERE id = ?'
  )
    .bind(id)
    .first<{ video_preview_r2_key: string | null }>()

  if (!set?.video_preview_r2_key) {
    return new Response(null, { status: 404 })
  }

  // Support Range requests for video streaming
  const range = request.headers.get('Range')
  const options: R2GetOptions = range ? { range: parseRange(range) } : {}

  const object = await env.AUDIO_BUCKET.get(set.video_preview_r2_key, options)
  if (!object) {
    return new Response(null, { status: 404 })
  }

  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType || 'video/mp4')
  headers.set('Cache-Control', 'public, max-age=604800') // 7 days
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Access-Control-Allow-Origin', '*')

  if (range && object.size !== undefined) {
    const r2Range = (object as any).range as { offset: number; length: number } | undefined
    if (r2Range) {
      const start = r2Range.offset
      const end = start + r2Range.length - 1
      headers.set('Content-Range', `bytes ${start}-${end}/${object.size}`)
      headers.set('Content-Length', String(r2Range.length))
      return new Response(object.body, { status: 206, headers })
    }
  }

  if (object.size !== undefined) {
    headers.set('Content-Length', String(object.size))
  }

  return new Response(object.body, { status: 200, headers })
}

/** Parse HTTP Range header into R2-compatible range object */
function parseRange(rangeHeader: string): { offset: number; length?: number } | undefined {
  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
  if (!match) return undefined
  const start = parseInt(match[1])
  const end = match[2] ? parseInt(match[2]) : undefined
  return end !== undefined
    ? { offset: start, length: end - start + 1 }
    : { offset: start }
}
