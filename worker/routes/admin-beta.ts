// Admin routes for beta management: invite codes, set creation (Invidious-based), annotation moderation
import { json, errorResponse } from '../lib/router'
import { generateId } from '../lib/id'
import { nanoid } from 'nanoid'
import { extractVideoId } from '../services/youtube'
import { fetchVideoData, getBestThumbnail, getStoryboardData } from '../services/invidious'
import { extractSetMetadata } from '../services/metadata-extractor'

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

// POST /api/admin/sets/from-youtube — Fetch metadata from YouTube URL via Invidious + LLM extraction
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

    // 3. Run LLM extraction on the video data
    const extracted = await extractSetMetadata(videoData, env)

    // 4. Get best thumbnail
    const thumbnailUrl = getBestThumbnail(videoData.videoThumbnails)

    // 5. Get storyboard data
    const storyboard = getStoryboardData(videoData.storyboards)

    // 6. Format publish date from Unix epoch
    const publishedDate = videoData.published
      ? new Date(videoData.published * 1000).toISOString()
      : ''

    // 7. Merge: LLM fields take priority over raw Invidious data for structured fields
    return json({
      data: {
        // Core fields
        title: extracted.title || videoData.title,
        artist: extracted.dj_name || videoData.author,
        description: extracted.description || '',
        genre: extracted.genre || '',
        subgenre: extracted.subgenre || '',
        venue: extracted.venue || '',
        event: extracted.event || '',
        recorded_date: extracted.recorded_date || '',
        duration_seconds: videoData.lengthSeconds || 0,
        thumbnail_url: thumbnailUrl || '',
        source_url: body.url,
        has_tracklist: extracted.has_tracklist,
        // YouTube/Invidious metadata
        youtube_video_id: videoId,
        youtube_channel_id: videoData.authorId,
        youtube_channel_name: videoData.author,
        youtube_published_at: publishedDate,
        youtube_view_count: videoData.viewCount,
        youtube_like_count: videoData.likeCount,
        keywords: videoData.keywords,
        storyboard_data: storyboard ? JSON.stringify(storyboard) : null,
        music_tracks: videoData.musicTracks,
        // Meta: how the data was obtained
        llm_extracted: extracted.llm_extracted,
        data_source: 'invidious',
        // Raw data for admin reference
        raw_title: videoData.title,
        raw_channel: videoData.author,
        raw_keywords: videoData.keywords,
        raw_genre: videoData.genre,
        // Debug: LLM raw response (remove in production)
        _debug_llm: extracted._debug_response,
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

  // For Invidious sets: no r2_key needed (stream from YouTube)
  // Legacy r2_key is set to empty string for new sets
  await env.DB.prepare(
    `INSERT OR REPLACE INTO sets (
      id, title, artist, description, genre, subgenre, venue, event,
      recorded_date, duration_seconds, r2_key, audio_format, source_url,
      stream_type, youtube_video_id, youtube_channel_id, youtube_channel_name,
      youtube_published_at, youtube_view_count, youtube_like_count,
      storyboard_data, keywords, youtube_music_tracks,
      detection_status, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, '', 'opus', ?,
      'invidious', ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
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
      body.youtube_video_id || null,
      body.youtube_channel_id || null,
      body.youtube_channel_name || null,
      body.youtube_published_at || null,
      body.youtube_view_count || null,
      body.youtube_like_count || null,
      body.storyboard_data || null,
      body.keywords ? JSON.stringify(body.keywords) : null,
      body.youtube_music_tracks || null,
      id
    )
    .run()

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
  }

  const updates: string[] = []
  const values: unknown[] = []

  for (const [bodyKey, dbCol] of Object.entries(allowedFields)) {
    if (bodyKey in body) {
      updates.push(`${dbCol} = ?`)
      values.push(body[bodyKey] || null)
    }
  }

  if (updates.length === 0) {
    return errorResponse('No valid fields to update', 400)
  }

  updates.push('updated_at = CURRENT_TIMESTAMP')
  values.push(id)

  await env.DB.prepare(
    `UPDATE sets SET ${updates.join(', ')} WHERE id = ?`
  )
    .bind(...values)
    .run()

  return json({ ok: true })
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
