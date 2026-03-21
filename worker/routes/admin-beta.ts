// Admin routes for beta management: invite codes, set upload, annotation moderation
import { json, errorResponse } from '../lib/router'
import { generateId } from '../lib/id'
import { nanoid } from 'nanoid'
import { generateWaveform } from '../services/waveform'
import { extractVideoId, fetchVideoData } from '../services/youtube'
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
// DJ SET UPLOAD
// ═══════════════════════════════════════════

// POST /api/admin/sets/from-youtube — Fetch metadata from YouTube URL + LLM extraction
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

    // 2. Fetch video data (YouTube API v3 if key available, oEmbed fallback)
    const apiKey = env.YOUTUBE_API_KEY && env.YOUTUBE_API_KEY.length > 5 ? env.YOUTUBE_API_KEY : undefined
    const videoData = await fetchVideoData(videoId, apiKey, body.url)

    // 3. Run LLM extraction on the video data
    const extracted = await extractSetMetadata(videoData, env)

    // 4. Merge: LLM fields take priority over raw YouTube data for structured fields
    return json({
      data: {
        // Core fields
        title: extracted.title || videoData.title,
        artist: extracted.dj_name || videoData.channelTitle,
        description: extracted.description || '',
        genre: extracted.genre || '',
        subgenre: extracted.subgenre || '',
        venue: extracted.venue || '',
        event: extracted.event || '',
        recorded_date: extracted.recorded_date || '',
        duration_seconds: videoData.durationSeconds || 0,
        thumbnail_url: videoData.thumbnailUrl || '',
        source_url: body.url,
        has_tracklist: extracted.has_tracklist,
        // Meta: how the data was obtained
        llm_extracted: extracted.llm_extracted,
        youtube_source: videoData.source,
        // Raw data for admin reference
        raw_youtube_title: videoData.title,
        raw_youtube_channel: videoData.channelTitle,
        raw_youtube_tags: videoData.tags,
        // Debug: LLM raw response (remove in production)
        _debug_llm: extracted._debug_response,
      },
      ok: true,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch YouTube data'
    return errorResponse(message, 500)
  }
}

// POST /api/admin/sets/upload-url — Generate presigned R2 upload URL
export async function getUploadUrl(
  request: Request,
  _env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  let body: { filename: string; content_type: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  if (!body.filename || !body.content_type) {
    return errorResponse('filename and content_type are required', 400)
  }

  const setId = generateId()
  const ext = body.filename.split('.').pop() || 'mp3'
  const r2Key = `sets/${setId}/audio.${ext}`

  // Create a presigned URL for direct upload to R2
  // For R2, we use a temporary upload endpoint approach
  // The client uploads via a POST to our worker, which streams to R2
  // (True presigned URLs require R2's S3 API which needs additional config)
  return json({
    data: {
      set_id: setId,
      r2_key: r2Key,
      upload_endpoint: `/api/admin/sets/${setId}/upload`,
      audio_format: ext,
    },
    ok: true,
  })
}

// PUT /api/admin/sets/:id/upload — Upload audio file to R2 with progress streaming
export async function uploadSetAudio(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  if (!request.body) {
    return errorResponse('Request body is required', 400)
  }

  const contentType = request.headers.get('Content-Type') || 'audio/mpeg'
  const contentLength = parseInt(request.headers.get('Content-Length') || '0')
  const ext = contentType.includes('flac') ? 'flac' : contentType.includes('wav') ? 'wav' : 'mp3'
  const r2Key = `sets/${id}/audio.${ext}`
  const actualContentType = contentType.includes('flac') ? 'audio/flac' : contentType.includes('wav') ? 'audio/wav' : 'audio/mpeg'

  console.log(`[upload] Starting multipart upload to ${r2Key}, size=${contentLength}`)

  // Use a TransformStream to send SSE progress events back to the client
  // while simultaneously uploading parts to R2
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  const sendEvent = async (data: Record<string, unknown>) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  // Run the upload in the background while streaming progress
  const uploadPromise = (async () => {
    try {
      const multipart = await env.AUDIO_BUCKET.createMultipartUpload(r2Key, {
        httpMetadata: { contentType: actualContentType },
      })

      const reader = request.body!.getReader()
      const partSize = 10 * 1024 * 1024 // 10MB per part
      const uploadedParts: R2UploadedPart[] = []
      let partNumber = 1
      let buffer = new Uint8Array(0)
      let bytesReceived = 0

      await sendEvent({ type: 'start', total: contentLength })

      while (true) {
        const { done, value } = await reader.read()

        if (value) {
          const newBuffer = new Uint8Array(buffer.length + value.length)
          newBuffer.set(buffer)
          newBuffer.set(value, buffer.length)
          buffer = newBuffer
          bytesReceived += value.length

          // Send receive progress
          await sendEvent({
            type: 'receiving',
            received: bytesReceived,
            total: contentLength,
            percent: contentLength > 0 ? Math.round((bytesReceived / contentLength) * 50) : 0,
          })
        }

        while (buffer.length >= partSize || (done && buffer.length > 0)) {
          const chunk = buffer.slice(0, partSize)
          buffer = buffer.slice(chunk.length)

          await sendEvent({
            type: 'uploading_part',
            part: partNumber,
            partSize: chunk.length,
            percent: contentLength > 0
              ? 50 + Math.round(((partNumber - 1) * partSize / contentLength) * 50)
              : 50,
          })

          const part = await multipart.uploadPart(partNumber, chunk)
          uploadedParts.push(part)
          partNumber++

          if (done && buffer.length === 0) break
        }

        if (done) break
      }

      await sendEvent({ type: 'finalizing', percent: 95 })
      await multipart.complete(uploadedParts)

      // Update DB
      const head = await env.AUDIO_BUCKET.head(r2Key)
      if (head) {
        await env.DB.prepare(
          'UPDATE sets SET r2_key = ?, file_size_bytes = ?, audio_format = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        )
          .bind(r2Key, head.size, ext, id)
          .run()
      }

      // Waveform generation
      try {
        await generateWaveform(id, env)
      } catch (err) {
        console.error('Waveform generation failed:', err)
      }

      await sendEvent({
        type: 'complete',
        percent: 100,
        r2_key: r2Key,
        size: head?.size ?? 0,
      })

      console.log(`[upload] Complete: ${r2Key}, ${head?.size ?? 0} bytes, ${partNumber - 1} parts`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      console.error(`[upload] Error:`, err)
      await sendEvent({ type: 'error', message })
    } finally {
      await writer.close()
    }
  })()

  // Don't await — let it run while we stream the response
  _ctx.waitUntil(uploadPromise)

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

// POST /api/admin/sets — Create a new DJ set record
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
    r2_key: string
    audio_format?: string
    bitrate?: number
    source_url?: string
    thumbnail_url?: string
  }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  if (!body.title?.trim() || !body.artist?.trim() || !body.duration_seconds || !body.r2_key) {
    return errorResponse('title, artist, duration_seconds, and r2_key are required', 400)
  }

  const id = body.id || generateId()

  // Use INSERT OR REPLACE to handle retries where the set record already exists
  // (e.g. previous upload attempt failed after the record was created)
  await env.DB.prepare(
    `INSERT OR REPLACE INTO sets (id, title, artist, description, genre, subgenre, venue, event, recorded_date, duration_seconds, r2_key, audio_format, bitrate, source_url, detection_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', COALESCE((SELECT created_at FROM sets WHERE id = ?), CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)`
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
      body.r2_key,
      body.audio_format || 'mp3',
      body.bitrate || null,
      body.source_url || null,
      id
    )
    .run()

  // If a thumbnail URL was provided, fetch it and store in R2
  // Also try to get the maxres version for a better hero background
  if (body.thumbnail_url) {
    try {
      // Try maxresdefault first for the best quality hero background
      let imageResp: Response | null = null
      let imageContentType = 'image/jpeg'

      if (body.source_url) {
        const { extractVideoId } = await import('../services/youtube')
        const videoId = extractVideoId(body.source_url)
        if (videoId) {
          const maxresUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
          const maxresResp = await fetch(maxresUrl)
          const contentLength = parseInt(maxresResp.headers.get('Content-Length') || '0')
          if (maxresResp.ok && contentLength > 5000) {
            imageResp = maxresResp
            imageContentType = maxresResp.headers.get('Content-Type') || 'image/jpeg'
          }
        }
      }

      // Fallback to the provided thumbnail URL
      if (!imageResp) {
        imageResp = await fetch(body.thumbnail_url)
        imageContentType = imageResp.headers.get('Content-Type') || 'image/jpeg'
      }

      if (imageResp.ok && imageResp.body) {
        const thumbKey = `sets/${id}/cover.webp`
        await env.AUDIO_BUCKET.put(thumbKey, imageResp.body, {
          httpMetadata: { contentType: imageContentType },
        })
        await env.DB.prepare(
          'UPDATE sets SET cover_image_r2_key = ? WHERE id = ?'
        )
          .bind(thumbKey, id)
          .run()
        console.log(`[createSet] Thumbnail stored: ${thumbKey}`)
      }
    } catch (err) {
      console.error('[createSet] Thumbnail fetch failed (non-blocking):', err)
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
    'SELECT r2_key, r2_waveform_key, cover_image_r2_key FROM sets WHERE id = ?'
  )
    .bind(id)
    .first<{ r2_key: string; r2_waveform_key: string | null; cover_image_r2_key: string | null }>()

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
  const r2Deletes: string[] = [set.r2_key]
  if (set.r2_waveform_key) r2Deletes.push(set.r2_waveform_key)
  if (set.cover_image_r2_key) r2Deletes.push(set.cover_image_r2_key)

  try {
    await env.AUDIO_BUCKET.delete(r2Deletes)
  } catch {
    console.error('Failed to delete some R2 objects (non-blocking)')
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

// ═══════════════════════════════════════════
// VIDEO PREVIEW UPLOAD
// ═══════════════════════════════════════════

// PUT /api/admin/sets/:id/video — Upload a video preview clip to R2
export async function uploadSetVideo(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  // Verify set exists
  const set = await env.DB.prepare('SELECT id FROM sets WHERE id = ?')
    .bind(id).first<{ id: string }>()
  if (!set) return errorResponse('Set not found', 404)

  if (!request.body) return errorResponse('Request body is required', 400)

  const contentLength = parseInt(request.headers.get('Content-Length') || '0')
  const maxSize = 25 * 1024 * 1024 // 25MB max
  if (contentLength > maxSize) {
    return errorResponse(`Video file too large (${(contentLength / 1048576).toFixed(1)}MB). Maximum is 25MB.`, 400)
  }

  const r2Key = `sets/${id}/preview.mp4`

  try {
    const multipart = await env.AUDIO_BUCKET.createMultipartUpload(r2Key, {
      httpMetadata: { contentType: 'video/mp4' },
    })

    const reader = request.body.getReader()
    const partSize = 10 * 1024 * 1024 // 10MB per part
    const uploadedParts: R2UploadedPart[] = []
    let partNumber = 1
    let buffer = new Uint8Array(0)

    while (true) {
      const { done, value } = await reader.read()

      if (value) {
        const newBuffer = new Uint8Array(buffer.length + value.length)
        newBuffer.set(buffer)
        newBuffer.set(value, buffer.length)
        buffer = newBuffer
      }

      while (buffer.length >= partSize || (done && buffer.length > 0)) {
        const chunk = buffer.slice(0, partSize)
        buffer = buffer.slice(chunk.length)

        const part = await multipart.uploadPart(partNumber, chunk)
        uploadedParts.push(part)
        partNumber++

        if (done && buffer.length === 0) break
      }

      if (done) break
    }

    await multipart.complete(uploadedParts)

    // Update DB
    await env.DB.prepare(
      'UPDATE sets SET video_preview_r2_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(r2Key, id).run()

    const head = await env.AUDIO_BUCKET.head(r2Key)
    console.log(`[video-upload] Complete: ${r2Key}, ${head?.size ?? 0} bytes`)

    return json({
      data: { r2_key: r2Key, size: head?.size ?? 0 },
      ok: true,
    })
  } catch (err) {
    console.error('[video-upload] Error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Video upload failed', 500)
  }
}
