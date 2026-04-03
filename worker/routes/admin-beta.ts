import { json, errorResponse } from '../lib/router'
import { generateId } from '../lib/id'
import { nanoid } from 'nanoid'
import { extractVideoId } from '../services/youtube'
import { fetchVideoData, getBestThumbnail, getStoryboardData, getBestVideoStream } from '../services/invidious'
import { inferGenreFromKeywords } from '../services/metadata-extractor'
import { fetch1001Tracklist, fetch1001Page, parse1001TracklistHtml, extract1001TracklistId, is1001TracklistUrl, type Track1001 } from '../services/tracklists-1001'
import { findOrCreateSong } from '../services/songs'

// ═══════════════════════════════════════════
// INVITE CODES
// ═══════════════════════════════════════════

// POST /api/admin/invite-codes — Generate a new invite code
export async function generateInviteCode(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  let body: { max_uses?: number; expires_in_days?: number; note?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const code = nanoid(8).toUpperCase()
  const id = generateId()
  const maxUses = body.max_uses ?? 1
  const expiresAt = body.expires_in_days
    ? new Date(Date.now() + body.expires_in_days * 86400000).toISOString()
    : null

  await env.DB.prepare(
    'INSERT INTO invite_codes (id, code, max_uses, expires_at, note) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(id, code, maxUses, expiresAt, body.note || null)
    .run()

  return json({ data: { id, code, max_uses: maxUses, expires_at: expiresAt }, ok: true }, 201)
}

// GET /api/admin/invite-codes — List all invite codes
export async function listInviteCodes(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const result = await env.DB.prepare(
    'SELECT * FROM invite_codes ORDER BY created_at DESC'
  ).all()

  return json({ data: result.results, ok: true })
}

// DELETE /api/admin/invite-codes/:id — Revoke an invite code
export async function revokeInviteCode(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params
  await env.DB.prepare('DELETE FROM invite_codes WHERE id = ?').bind(id).run()
  return json({ ok: true })
}

// ═══════════════════════════════════════════
// DJ SET CREATION (Invidious-based)
// ═══════════════════════════════════════════

// POST /api/admin/sets/from-youtube — Fetch metadata from YouTube URL via Invidious
export async function createSetFromYoutube(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  let body: { url: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  if (!body.url?.trim()) {
    return errorResponse('URL is required', 400)
  }

  try {
    // 1. Extract video ID from URL
    const videoId = extractVideoId(body.url)
    if (!videoId) {
      return errorResponse('Could not extract video ID from URL', 400)
    }

    // 2. Fetch video data via Invidious API
    const videoData = await fetchVideoData(videoId, env)

    // 3. Get best thumbnail
    const thumbnailUrl = getBestThumbnail(videoData.videoThumbnails)

    // 4. Get storyboard data
    const storyboard = getStoryboardData(videoData.storyboards)

    // 5. Format publish date from Unix epoch
    const publishedDate = videoData.published
      ? new Date(videoData.published * 1000).toISOString()
      : ''

    // 6. Infer genre from keywords (no AI — pure regex)
    const genre = inferGenreFromKeywords(videoData.keywords)

    // 7. Detect tracklist presence from description
    const hasTracklist = videoData.description ? /\d{1,2}:\d{2}/.test(videoData.description) : false

    return json({
      data: {
        title: videoData.title,
        artist: videoData.author,
        description: '',
        genre,
        subgenre: '',
        venue: '',
        event: '',
        recorded_date: publishedDate.split('T')[0] || '',
        duration_seconds: videoData.lengthSeconds || 0,
        thumbnail_url: thumbnailUrl || '',
        source_url: body.url,
        has_tracklist: hasTracklist,
        youtube_video_id: videoId,
        youtube_channel_id: videoData.authorId,
        youtube_channel_name: videoData.author,
        youtube_published_at: publishedDate,
        youtube_view_count: videoData.viewCount,
        youtube_like_count: videoData.likeCount,
        keywords: videoData.keywords,
        storyboard_data: storyboard ? JSON.stringify(storyboard) : null,
        music_tracks: videoData.musicTracks,
        data_source: 'invidious',
        raw_title: videoData.title,
        raw_channel: videoData.author,
        raw_keywords: videoData.keywords,
      },
      ok: true,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch video data from Invidious'
    return errorResponse(message, 500)
  }
}

// POST /api/admin/sets — Create a new DJ set record (Invidious-based, no audio upload)
export async function createSet(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  let body: {
    id?: string
    title: string
    artist: string
    description?: string
    genre?: string
    subgenre?: string
    venue?: string
    event?: string
    recorded_date?: string
    duration_seconds: number
    source_url?: string
    thumbnail_url?: string
    // Stream source type: 'youtube' | 'soundcloud' | 'hearthis' | undefined (no source)
    stream_type?: 'youtube' | 'soundcloud' | 'hearthis'
    // Invidious-specific fields
    youtube_video_id?: string
    youtube_channel_id?: string
    youtube_channel_name?: string
    youtube_published_at?: string
    youtube_view_count?: number
    youtube_like_count?: number
    storyboard_data?: string
    keywords?: string[]
    youtube_music_tracks?: string
    // 1001Tracklists fields
    tracklist_1001_url?: string
    // Pre-linked artist/event IDs (from autocomplete)
    artist_id?: string
    event_id?: string
    // Multiple artists (optional, in addition to artist_id)
    artist_ids?: string[]
  }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  if (!body.title?.trim() || !body.artist?.trim() || !body.duration_seconds) {
    return errorResponse('title, artist, and duration_seconds are required', 400)
  }

  const id = body.id || generateId()

  // Extract 1001tracklists ID from URL if provided
  const tracklist1001Id = body.tracklist_1001_url
    ? extract1001TracklistId(body.tracklist_1001_url)
    : null

  // Derive the actual stream_type:
  // - explicit 'youtube' or a youtube_video_id present → 'invidious' (existing infra)
  // - explicit 'soundcloud' or 'hearthis' → store as-is
  // - otherwise → NULL (no source, set is not streamable)
  let resolvedStreamType: string | null = null
  if (body.stream_type === 'youtube' || body.youtube_video_id) {
    resolvedStreamType = 'invidious'
  } else if (body.stream_type === 'soundcloud') {
    resolvedStreamType = 'soundcloud'
  } else if (body.stream_type === 'hearthis') {
    resolvedStreamType = 'hearthis'
  }

  // For Invidious sets: no r2_key needed (stream from YouTube)
  await env.DB.prepare(
    `INSERT OR REPLACE INTO sets (
      id, title, artist, description, genre, subgenre, venue, event,
      recorded_date, duration_seconds, r2_key, audio_format, source_url,
      stream_type, youtube_video_id, youtube_channel_id, youtube_channel_name,
      youtube_published_at, youtube_view_count, youtube_like_count,
      storyboard_data, keywords, youtube_music_tracks,
      tracklist_1001_url, tracklist_1001_id,
      artist_id, event_id,
      detection_status, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, '', 'opus', ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?,
      'pending',
      COALESCE((SELECT created_at FROM sets WHERE id = ?), CURRENT_TIMESTAMP),
      CURRENT_TIMESTAMP
    )`
  )
    .bind(
      id,
      body.title.trim(),
      body.artist.trim(),
      body.description?.trim() || null,
      body.genre || null,
      body.subgenre || null,
      body.venue?.trim() || null,
      body.event?.trim() || null,
      body.recorded_date || null,
      body.duration_seconds,
      body.source_url || null,
      resolvedStreamType,
      body.youtube_video_id || null,
      body.youtube_channel_id || null,
      body.youtube_channel_name || null,
      body.youtube_published_at || null,
      body.youtube_view_count || null,
      body.youtube_like_count || null,
      body.storyboard_data || null,
      body.keywords ? JSON.stringify(body.keywords) : null,
      body.youtube_music_tracks || null,
      body.tracklist_1001_url || null,
      tracklist1001Id || null,
      body.artist_id || null,
      body.event_id || null,
      id
    )
    .run()

  // Insert into set_artists junction table if artist_ids provided
  if (body.artist_ids && body.artist_ids.length > 0) {
    const artistInserts = body.artist_ids.map((artistId, idx) =>
      env.DB.prepare(
        'INSERT OR REPLACE INTO set_artists (set_id, artist_id, position) VALUES (?, ?, ?)'
      ).bind(id, artistId, idx)
    )
    // Also include primary artist_id at position 0 if not already in the list
    if (body.artist_id && !body.artist_ids.includes(body.artist_id)) {
      artistInserts.unshift(
        env.DB.prepare(
          'INSERT OR REPLACE INTO set_artists (set_id, artist_id, position) VALUES (?, ?, ?)'
        ).bind(id, body.artist_id, -1)
      )
    }
    await env.DB.batch(artistInserts)
  } else if (body.artist_id) {
    // Single artist shorthand
    await env.DB.prepare(
      'INSERT OR REPLACE INTO set_artists (set_id, artist_id, position) VALUES (?, ?, 0)'
    )
      .bind(id, body.artist_id)
      .run()
  }

  // If a thumbnail URL was provided, fetch it and store in R2
  // Prefer YouTube's CDN directly (more reliable than Invidious proxy)
  if (body.thumbnail_url || body.youtube_video_id) {
    try {
      const videoId = body.youtube_video_id
      // Try YouTube CDN first (most reliable), then fall back to the provided URL
      const thumbUrls = videoId
        ? [
            `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
            `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            ...(body.thumbnail_url ? [body.thumbnail_url] : []),
          ]
        : [body.thumbnail_url!]

      for (const thumbUrl of thumbUrls) {
        try {
          const imageResp = await fetch(thumbUrl)
          if (!imageResp.ok || !imageResp.body) continue

          const contentLength = parseInt(imageResp.headers.get('Content-Length') || '0')
          // Skip YouTube's placeholder "no thumbnail" image (tiny gray image)
          if (contentLength > 0 && contentLength < 2000) continue

          const imageContentType = imageResp.headers.get('Content-Type') || 'image/jpeg'
          const thumbKey = `sets/${id}/cover.webp`
          await env.AUDIO_BUCKET.put(thumbKey, imageResp.body, {
            httpMetadata: { contentType: imageContentType },
          })
          await env.DB.prepare(
            'UPDATE sets SET cover_image_r2_key = ? WHERE id = ?'
          )
            .bind(thumbKey, id)
            .run()
          console.log(`[createSet] Thumbnail stored: ${thumbKey} from ${thumbUrl}`)
          break
        } catch (err) {
          console.error(`[createSet] Thumbnail fetch failed for ${thumbUrl}:`, err)
          continue
        }
      }
    } catch (err) {
      console.error('[createSet] Thumbnail storage failed (non-blocking):', err)
    }
  }

  return json({ data: { id }, ok: true }, 201)
}

// DELETE /api/admin/sets/:id — Delete a set and its R2 files
export async function deleteSet(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  // Get the set's R2 keys before deleting
  const set = await env.DB.prepare(
    'SELECT r2_key, r2_waveform_key, cover_image_r2_key, stream_type FROM sets WHERE id = ?'
  )
    .bind(id)
    .first<{ r2_key: string; r2_waveform_key: string | null; cover_image_r2_key: string | null; stream_type: string | null }>()

  if (!set) {
    return errorResponse('Set not found', 404)
  }

  // Delete from D1 (cascades to detections, annotations, playlist_items, listen_history, detection_jobs)
  await env.DB.batch([
    env.DB.prepare('DELETE FROM detections WHERE set_id = ?').bind(id),
    env.DB.prepare('DELETE FROM annotations WHERE set_id = ?').bind(id),
    env.DB.prepare('DELETE FROM playlist_items WHERE set_id = ?').bind(id),
    env.DB.prepare('DELETE FROM listen_history WHERE set_id = ?').bind(id),
    env.DB.prepare('DELETE FROM detection_jobs WHERE set_id = ?').bind(id),
    env.DB.prepare('DELETE FROM ml_feedback WHERE set_id = ?').bind(id),
    env.DB.prepare('DELETE FROM sets WHERE id = ?').bind(id),
  ])

  // Delete R2 files (best-effort, don't fail if they don't exist)
  const r2Deletes: string[] = []
  // Only delete audio file if it's a legacy R2 set
  if (set.stream_type === 'r2' && set.r2_key) r2Deletes.push(set.r2_key)
  if (set.r2_waveform_key) r2Deletes.push(set.r2_waveform_key)
  if (set.cover_image_r2_key) r2Deletes.push(set.cover_image_r2_key)

  if (r2Deletes.length > 0) {
    try {
      await env.AUDIO_BUCKET.delete(r2Deletes)
    } catch {
      console.error('Failed to delete some R2 objects (non-blocking)')
    }
  }

  return json({ ok: true })
}

// PUT /api/admin/sets/:id — Update set metadata
export async function updateSet(
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

  // Only allow updating specific fields
  const allowedFields: Record<string, string> = {
    title: 'title',
    artist: 'artist',
    description: 'description',
    genre: 'genre',
    subgenre: 'subgenre',
    venue: 'venue',
    event: 'event',
    recorded_date: 'recorded_date',
    duration_seconds: 'duration_seconds',
    tracklist_1001_url: 'tracklist_1001_url',
    artist_id: 'artist_id',
    event_id: 'event_id',
    stream_type: 'stream_type',
    source_url: 'source_url',
    youtube_video_id: 'youtube_video_id',
  }

  const updates: string[] = []
  const values: unknown[] = []

  for (const [bodyKey, dbCol] of Object.entries(allowedFields)) {
    if (bodyKey in body) {
      updates.push(`${dbCol} = ?`)
      values.push(body[bodyKey] || null)
    }
  }

  // Handle artist_ids separately — it goes to the junction table, not the sets table
  const artistIds = Array.isArray(body.artist_ids) ? body.artist_ids as string[] : null

  if (updates.length === 0 && !artistIds) {
    return errorResponse('No valid fields to update', 400)
  }

  const stmts: D1PreparedStatement[] = []

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)
    stmts.push(
      env.DB.prepare(
        `UPDATE sets SET ${updates.join(', ')} WHERE id = ?`
      ).bind(...values)
    )
  }

  // Sync set_artists junction table if artist_ids provided
  if (artistIds) {
    stmts.push(
      env.DB.prepare('DELETE FROM set_artists WHERE set_id = ?').bind(id)
    )
    for (let i = 0; i < artistIds.length; i++) {
      stmts.push(
        env.DB.prepare(
          'INSERT INTO set_artists (set_id, artist_id, position) VALUES (?, ?, ?)'
        ).bind(id, artistIds[i], i + 1)
      )
    }
  }

  await env.DB.batch(stmts)

  return json({ ok: true })
}

// POST /api/admin/sets/batch — Perform batch operations on multiple sets
export async function batchUpdateSets(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  let body: {
    ids: string[]
    action: 'delete' | 'update' | 'detect' | 'redetect'
    updates?: Record<string, unknown>
  }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
    return errorResponse('ids array is required', 400)
  }
  if (!body.action) {
    return errorResponse('action is required', 400)
  }
  if (body.ids.length > 50) {
    return errorResponse('Maximum 50 sets per batch operation', 400)
  }

  const { ids, action } = body

  switch (action) {
    case 'delete': {
      // Get R2 keys before deleting
      const placeholders = ids.map(() => '?').join(',')
      const setsResult = await env.DB.prepare(
        `SELECT id, r2_key, r2_waveform_key, cover_image_r2_key, stream_type FROM sets WHERE id IN (${placeholders})`
      ).bind(...ids).all<{ id: string; r2_key: string; r2_waveform_key: string | null; cover_image_r2_key: string | null; stream_type: string | null }>()

      const stmts: D1PreparedStatement[] = []
      for (const id of ids) {
        stmts.push(
          env.DB.prepare('DELETE FROM detections WHERE set_id = ?').bind(id),
          env.DB.prepare('DELETE FROM annotations WHERE set_id = ?').bind(id),
          env.DB.prepare('DELETE FROM playlist_items WHERE set_id = ?').bind(id),
          env.DB.prepare('DELETE FROM listen_history WHERE set_id = ?').bind(id),
          env.DB.prepare('DELETE FROM detection_jobs WHERE set_id = ?').bind(id),
          env.DB.prepare('DELETE FROM ml_feedback WHERE set_id = ?').bind(id),
          env.DB.prepare('DELETE FROM set_artists WHERE set_id = ?').bind(id),
          env.DB.prepare('DELETE FROM sets WHERE id = ?').bind(id),
        )
      }
      // D1 batch limit is 500
      for (let i = 0; i < stmts.length; i += 100) {
        await env.DB.batch(stmts.slice(i, i + 100))
      }

      // Delete R2 files (best-effort)
      const r2Deletes: string[] = []
      for (const s of (setsResult.results || [])) {
        if (s.stream_type === 'r2' && s.r2_key) r2Deletes.push(s.r2_key)
        if (s.r2_waveform_key) r2Deletes.push(s.r2_waveform_key)
        if (s.cover_image_r2_key) r2Deletes.push(s.cover_image_r2_key)
      }
      if (r2Deletes.length > 0) {
        try { await env.AUDIO_BUCKET.delete(r2Deletes) } catch { /* non-blocking */ }
      }

      return json({ ok: true, data: { deleted: ids.length } })
    }

    case 'update': {
      if (!body.updates || Object.keys(body.updates).length === 0) {
        return errorResponse('updates object is required for update action', 400)
      }

      const allowedFields: Record<string, string> = {
        genre: 'genre',
        subgenre: 'subgenre',
        event: 'event',
        event_id: 'event_id',
        venue: 'venue',
        detection_status: 'detection_status',
        stream_type: 'stream_type',
      }

      const setClauses: string[] = []
      const updateValues: unknown[] = []
      for (const [key, dbCol] of Object.entries(allowedFields)) {
        if (key in body.updates) {
          setClauses.push(`${dbCol} = ?`)
          updateValues.push(body.updates[key] || null)
        }
      }
      if (setClauses.length === 0) {
        return errorResponse('No valid fields to update', 400)
      }
      setClauses.push('updated_at = CURRENT_TIMESTAMP')

      const stmts: D1PreparedStatement[] = ids.map((id) =>
        env.DB.prepare(`UPDATE sets SET ${setClauses.join(', ')} WHERE id = ?`)
          .bind(...updateValues, id)
      )
      for (let i = 0; i < stmts.length; i += 100) {
        await env.DB.batch(stmts.slice(i, i + 100))
      }

      return json({ ok: true, data: { updated: ids.length } })
    }

    case 'detect':
    case 'redetect': {
      // Queue detection jobs for each set
      let queued = 0
      for (const id of ids) {
        try {
          await env.ML_QUEUE.send({ setId: id, redetect: action === 'redetect' })
          queued++
        } catch {
          console.error(`Failed to queue detection for set ${id}`)
        }
      }
      return json({ ok: true, data: { queued } })
    }

    default:
      return errorResponse(`Unknown action: ${action}`, 400)
  }
}

// ═══════════════════════════════════════════
// ANNOTATION MODERATION
// ═══════════════════════════════════════════

// GET /api/admin/annotations/pending — List pending annotations for review
export async function listPendingAnnotations(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const result = await env.DB.prepare(
    `SELECT a.*,
       s.title as set_title, s.artist as set_artist,
       d.track_title as original_track_title, d.track_artist as original_track_artist,
       d.confidence as original_confidence
     FROM annotations a
     JOIN sets s ON a.set_id = s.id
     LEFT JOIN detections d ON a.detection_id = d.id
     WHERE a.status = 'pending'
     ORDER BY a.created_at DESC
     LIMIT 100`
  ).all()

  return json({ data: result.results, ok: true })
}

// POST /api/admin/annotations/:id/moderate — Approve or reject an annotation
export async function moderateAnnotation(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  let body: { action: 'approve' | 'reject'; note?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  if (body.action !== 'approve' && body.action !== 'reject') {
    return errorResponse('action must be "approve" or "reject"', 400)
  }

  // Get the annotation
  const annotation = await env.DB.prepare(
    'SELECT * FROM annotations WHERE id = ?'
  )
    .bind(id)
    .first<{
      id: string
      set_id: string
      detection_id: string | null
      user_id: string | null
      anonymous_id: string | null
      track_title: string
      track_artist: string | null
      start_time_seconds: number
      annotation_type: string
      status: string
    }>()

  if (!annotation) {
    return errorResponse('Annotation not found', 404)
  }

  if (annotation.status !== 'pending') {
    return errorResponse('Annotation already moderated', 409)
  }

  const newStatus = body.action === 'approve' ? 'approved' : 'rejected'

  // Update annotation status
  await env.DB.prepare(
    'UPDATE annotations SET status = ? WHERE id = ?'
  )
    .bind(newStatus, id)
    .run()

  if (body.action === 'approve') {
    // Send to feedback queue for ML processing
    try {
      await env.FEEDBACK_QUEUE.send({
        type: 'annotation_created',
        annotation_id: annotation.id,
        set_id: annotation.set_id,
        detection_id: annotation.detection_id,
        annotation_type: annotation.annotation_type,
        track_title: annotation.track_title,
        track_artist: annotation.track_artist,
        start_time_seconds: annotation.start_time_seconds,
      })
    } catch {
      console.error('Failed to send approved annotation to feedback queue')
    }

    // Award reputation to annotator
    if (annotation.user_id) {
      await env.DB.prepare(
        'UPDATE user SET reputation = reputation + 10, total_annotations = total_annotations + 1 WHERE id = ?'
      )
        .bind(annotation.user_id)
        .run()
    }
  } else {
    // Deduct reputation for rejected annotation
    if (annotation.user_id) {
      await env.DB.prepare(
        'UPDATE user SET reputation = MAX(0, reputation - 5) WHERE id = ?'
      )
        .bind(annotation.user_id)
        .run()
    }
  }

  return json({ ok: true, action: newStatus })
}

// ═══════════════════════════════════════════
// 1001TRACKLISTS INTEGRATION
// ═══════════════════════════════════════════

// POST /api/admin/sets/:id/fetch-1001tracklists — Fetch tracklist from 1001tracklists.com via Browser Rendering
export async function fetch1001Tracklists(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const set = await env.DB.prepare(
    'SELECT tracklist_1001_url FROM sets WHERE id = ?'
  ).bind(id).first<{ tracklist_1001_url: string | null }>()

  if (!set) {
    return errorResponse('Set not found', 404)
  }

  if (!set.tracklist_1001_url) {
    return errorResponse('No 1001tracklists URL configured for this set', 400)
  }

  if (!is1001TracklistUrl(set.tracklist_1001_url)) {
    return errorResponse('Invalid 1001tracklists URL', 400)
  }

  const result = await fetch1001Tracklist(set.tracklist_1001_url)

  return json({
    data: {
      tracks: result.tracks,
      tracklist_id: result.tracklist_id,
      source: result.source,
      count: result.tracks.length,
      fallback_required: result.fallback_required || false,
    },
    error: result.error || null,
    ok: result.tracks.length > 0 || !result.error,
  })
}

// POST /api/admin/sets/:id/parse-1001tracklists-html — Parse tracklist from manually pasted HTML
export async function parse1001TracklistsHtml(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  let body: { html: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  if (!body.html?.trim()) {
    return errorResponse('HTML content is required', 400)
  }

  // Try to get the tracklist_1001_id from the set if it exists (optional — for enrichment)
  let tracklistId: string | undefined
  if (id && id !== '_preview') {
    const set = await env.DB.prepare(
      'SELECT tracklist_1001_id FROM sets WHERE id = ?'
    ).bind(id).first<{ tracklist_1001_id: string | null }>()
    tracklistId = set?.tracklist_1001_id || undefined
  }

  const result = parse1001TracklistHtml(body.html, tracklistId)

  return json({
    data: {
      tracks: result.tracks,
      tracklist_id: result.tracklist_id,
      source: result.source,
      count: result.tracks.length,
    },
    ok: true,
  })
}

// POST /api/admin/sets/:id/import-1001tracklists — Import parsed tracks as detections + songs
export async function import1001Tracklists(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const set = await env.DB.prepare(
    'SELECT id, duration_seconds FROM sets WHERE id = ?'
  ).bind(id).first<{ id: string; duration_seconds: number }>()

  if (!set) {
    return errorResponse('Set not found', 404)
  }

  let body: { tracks: Track1001[] }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  if (!body.tracks?.length) {
    return errorResponse('No tracks provided', 400)
  }

  const lastfmKey = env.LASTFM_API_KEY && env.LASTFM_API_KEY.length > 5 ? env.LASTFM_API_KEY : undefined

  // Clear existing detections for this set
  await env.DB.prepare('DELETE FROM detections WHERE set_id = ?').bind(id).run()

  // Phase 1: Create song records (requires sequential DB lookups for dedup)
  const coverArtQueue: Array<{ songId: string; imageUrl?: string | null }> = []
  const enrichQueue: Array<{ songId: string; artist: string; title: string }> = []
  const detectionRows: Array<{
    id: string; songId: string; title: string; artist: string | null
    startSeconds: number; endSeconds: number
  }> = []

  let lastCueSeconds = 0 // Track the last known cue time for sub-positions

  for (let idx = 0; idx < body.tracks.length; idx++) {
    const track = body.tracks[idx]
    if (!track.title && !track.artist) continue

    const songId = await findOrCreateSong({
      title: track.title || 'ID',
      artist: track.artist || 'ID',
      label: track.label,
      cover_art_url: track.artwork_url,
      spotify_url: track.spotify_url,
      apple_music_url: track.apple_music_url,
      soundcloud_url: track.soundcloud_url,
      beatport_url: track.beatport_url,
      youtube_url: track.youtube_url,
      deezer_url: track.deezer_url,
      bandcamp_url: track.bandcamp_url,
      traxsource_url: track.traxsource_url,
      source: '1001tracklists',
      external_id: track.track_content_id,
    }, env)

    // Queue enrichment + cover art for background processing
    if (track.artwork_url) {
      coverArtQueue.push({ songId, imageUrl: track.artwork_url })
    }
    if (lastfmKey && track.artist && track.title) {
      enrichQueue.push({ songId, artist: track.artist, title: track.title })
    }

    // Resolve start time: use track's own cue, or inherit from the parent/previous track
    const startSeconds = (track.start_seconds != null && track.start_seconds > 0)
      ? track.start_seconds
      : lastCueSeconds

    // Update last known cue for non-continuation tracks with a real timestamp
    if (!track.is_continuation && track.start_seconds != null && track.start_seconds > 0) {
      lastCueSeconds = track.start_seconds
    }

    // Calculate end time from next non-continuation track with a real cue
    let endTime = set.duration_seconds
    for (let j = idx + 1; j < body.tracks.length; j++) {
      if (!body.tracks[j].is_continuation && body.tracks[j].start_seconds != null && body.tracks[j].start_seconds! > 0) {
        endTime = body.tracks[j].start_seconds!
        break
      }
    }

    detectionRows.push({
      id: generateId(),
      songId,
      title: track.title || 'ID',
      artist: track.artist || null,
      startSeconds,
      endSeconds: endTime,
    })
  }

  // Phase 2: Batch-insert all detections in a single D1 call
  if (detectionRows.length > 0) {
    const stmts = detectionRows.map((row) =>
      env.DB.prepare(
        `INSERT INTO detections (id, set_id, track_title, track_artist, start_time_seconds, end_time_seconds, confidence, detection_method, song_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(row.id, id, row.title, row.artist, row.startSeconds, row.endSeconds, 0.98, '1001tracklists', row.songId)
    )

    // D1 batch limit is 500 statements — split if needed
    for (let i = 0; i < stmts.length; i += 100) {
      await env.DB.batch(stmts.slice(i, i + 100))
    }
  }

  // Phase 3: Mark complete
  await env.DB.prepare(
    "UPDATE sets SET detection_status = 'complete', detection_version = detection_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(id).run()

  const imported = detectionRows.length
  console.log(`[1001tl] Imported ${imported} tracks for set ${id}`)

  // Phase 4: Queue cover art + Last.fm enrichment via Cloudflare Queue
  // This runs asynchronously in the background with natural rate limiting
  const queueMessages: Array<{ type: string; song_id: string; image_url?: string; artist?: string; title?: string }> = []

  for (const item of enrichQueue) {
    queueMessages.push({ type: 'enrich_lastfm', song_id: item.songId, artist: item.artist, title: item.title })
  }
  for (const item of coverArtQueue) {
    queueMessages.push({ type: 'cache_cover_art', song_id: item.songId, image_url: item.imageUrl || undefined })
  }

  if (queueMessages.length > 0) {
    // sendBatch supports up to 100 messages at a time
    for (let i = 0; i < queueMessages.length; i += 100) {
      const batch = queueMessages.slice(i, i + 100).map((msg) => ({ body: msg }))
      try {
        await env.COVER_ART_QUEUE.sendBatch(batch)
      } catch (err) {
        console.warn(`[1001tl] Failed to queue batch ${i}-${i + batch.length}:`, err)
      }
    }
    console.log(`[1001tl] Queued ${queueMessages.length} background tasks for set ${id}`)
  }

  return json({
    data: { imported, set_id: id },
    ok: true,
  })
}

// GET /api/sets/:id/video-stream-url — Get YouTube video stream URL (lazy-refresh if expired)
export async function getVideoStreamUrl(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const set = await env.DB.prepare(
    'SELECT youtube_video_id, youtube_video_stream_url, youtube_video_stream_expires FROM sets WHERE id = ?'
  ).bind(id).first<{
    youtube_video_id: string | null
    youtube_video_stream_url: string | null
    youtube_video_stream_expires: number | null
  }>()

  if (!set) {
    return errorResponse('Set not found', 404)
  }

  if (!set.youtube_video_id) {
    return json({ data: null, ok: true })
  }

  const now = Math.floor(Date.now() / 1000)

  // Return cached URL if not expired
  if (set.youtube_video_stream_url && set.youtube_video_stream_expires && set.youtube_video_stream_expires > now) {
    return json({
      data: {
        url: set.youtube_video_stream_url,
        expires_at: set.youtube_video_stream_expires,
        source: 'cached',
      },
      ok: true,
    })
  }

  // Re-resolve the video stream URL
  try {
    const videoStream = await getBestVideoStream(set.youtube_video_id, env)
    const expiresAt = now + (6 * 3600)

    // Cache it
    await env.DB.prepare(
      `UPDATE sets SET youtube_video_stream_url = ?, youtube_video_stream_expires = ?,
       updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(videoStream.url, expiresAt, id).run()

    return json({
      data: {
        url: videoStream.url,
        quality: videoStream.qualityLabel,
        resolution: videoStream.resolution,
        expires_at: expiresAt,
        source: 'fresh',
      },
      ok: true,
    })
  } catch (err) {
    return errorResponse(
      `Failed to resolve video stream: ${err instanceof Error ? err.message : String(err)}`,
      500
    )
  }
}

// POST /api/admin/events/:id/fetch-1001tl-sets — Fetch event source page from 1001TL via challenge solver
export async function fetchEventSets(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const event = await env.DB.prepare(
    'SELECT id, source_1001_id FROM events WHERE id = ?'
  ).bind(id).first<{ id: string; source_1001_id: string | null }>()

  if (!event) {
    return errorResponse('Event not found', 404)
  }

  if (!event.source_1001_id) {
    return errorResponse('No 1001Tracklists source ID configured for this event', 400)
  }

  const url = `https://www.1001tracklists.com/source/${event.source_1001_id}/index.html`
  const result = await fetch1001Page(url)

  return json({
    data: {
      html: result.html,
      fallback_required: result.fallback_required,
    },
    error: result.error || null,
    ok: !result.fallback_required,
  })
}
