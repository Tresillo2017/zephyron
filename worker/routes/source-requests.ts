// Source request API — users suggest stream sources for sourceless sets
import { json, errorResponse } from '../lib/router'

function generateId(): string {
  return crypto.randomUUID()
}

// POST /api/sets/:id/request-source — user suggests a source for a set
export async function createSourceRequest(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id: setId } = params

  // Check the set exists
  const set = await env.DB.prepare(
    'SELECT id, stream_type FROM sets WHERE id = ?'
  )
    .bind(setId)
    .first<{ id: string; stream_type: string | null }>()

  if (!set) return errorResponse('Set not found', 404)

  let body: {
    source_type: 'youtube' | 'soundcloud' | 'hearthis'
    source_url: string
    notes?: string
  }

  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  if (!body.source_type) return errorResponse('source_type is required', 400)
  if (!['youtube', 'soundcloud', 'hearthis'].includes(body.source_type)) {
    return errorResponse('source_type must be youtube, soundcloud, or hearthis', 400)
  }
  if (!body.source_url?.trim()) return errorResponse('source_url is required', 400)

  // Basic URL validation
  try {
    new URL(body.source_url.trim())
  } catch {
    return errorResponse('source_url must be a valid URL', 400)
  }

  // Get user from session
  const { createAuth } = await import('../lib/auth')
  const auth = createAuth(env)
  const session = await auth.api.getSession({ headers: request.headers })
  const userId = session?.user?.id || null

  // Check for duplicate pending request from this user
  if (userId) {
    const existing = await env.DB.prepare(
      `SELECT id FROM source_requests
       WHERE set_id = ? AND user_id = ? AND status = 'pending'`
    )
      .bind(setId, userId)
      .first<{ id: string }>()

    if (existing) {
      return errorResponse('You already have a pending source request for this set', 409)
    }
  }

  const id = generateId()

  await env.DB.prepare(
    `INSERT INTO source_requests (
      id, set_id, user_id, source_type, source_url, notes,
      status, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      'pending', datetime('now'), datetime('now')
    )`
  )
    .bind(
      id,
      setId,
      userId,
      body.source_type,
      body.source_url.trim(),
      body.notes?.trim() || null
    )
    .run()

  return json({ data: { id }, ok: true }, 201)
}

// GET /api/admin/source-requests — list source requests (admin only)
export async function listSourceRequests(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url)
  const status = url.searchParams.get('status') || 'pending'
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  const result = await env.DB.prepare(
    `SELECT
      sr.*,
      s.title AS set_title,
      s.artist AS set_artist,
      s.stream_type AS set_stream_type,
      u.name AS user_name,
      u.email AS user_email
    FROM source_requests sr
    JOIN sets s ON s.id = sr.set_id
    LEFT JOIN user u ON u.id = sr.user_id
    WHERE sr.status = ?
    ORDER BY sr.created_at DESC
    LIMIT ? OFFSET ?`
  )
    .bind(status, limit, offset)
    .all()

  const countResult = await env.DB.prepare(
    'SELECT COUNT(*) AS total FROM source_requests WHERE status = ?'
  )
    .bind(status)
    .first<{ total: number }>()

  return json({
    data: result.results,
    total: countResult?.total ?? 0,
    page,
    limit,
    ok: true,
  })
}

// POST /api/admin/source-requests/:id/approve — approve + apply source to set
export async function approveSourceRequest(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const req = await env.DB.prepare(
    `SELECT id, set_id, source_type, source_url, status
     FROM source_requests WHERE id = ?`
  )
    .bind(id)
    .first<{
      id: string
      set_id: string
      source_type: string
      source_url: string
      status: string
    }>()

  if (!req) return errorResponse('Source request not found', 404)
  if (req.status !== 'pending') {
    return errorResponse('Source request is not in pending status', 409)
  }

  // Derive stream_type for the set
  const streamType = req.source_type === 'youtube' ? 'invidious' : req.source_type

  // Extract youtube_video_id if youtube type
  let youtubeVideoId: string | null = null
  if (req.source_type === 'youtube') {
    const ytMatch = req.source_url.match(
      /(?:youtube\.com\/(?:watch\?v=|live\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    )
    youtubeVideoId = ytMatch ? ytMatch[1] : null
  }

  // Apply source to the set + mark request approved — in a batch
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE sets
       SET stream_type = ?,
           source_url = ?,
           youtube_video_id = CASE WHEN ? IS NOT NULL THEN ? ELSE youtube_video_id END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(streamType, req.source_url, youtubeVideoId, youtubeVideoId, req.set_id),
    env.DB.prepare(
      `UPDATE source_requests
       SET status = 'approved', updated_at = datetime('now')
       WHERE id = ?`
    ).bind(id),
    // Reject all other pending requests for the same set
    env.DB.prepare(
      `UPDATE source_requests
       SET status = 'rejected', updated_at = datetime('now')
       WHERE set_id = ? AND id != ? AND status = 'pending'`
    ).bind(req.set_id, id),
  ])

  return json({
    data: {
      id,
      set_id: req.set_id,
      stream_type: streamType,
      source_url: req.source_url,
      youtube_video_id: youtubeVideoId,
    },
    ok: true,
  })
}

// POST /api/admin/source-requests/:id/reject — reject a source request
export async function rejectSourceRequest(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const existing = await env.DB.prepare(
    'SELECT id, status FROM source_requests WHERE id = ?'
  )
    .bind(id)
    .first<{ id: string; status: string }>()

  if (!existing) return errorResponse('Source request not found', 404)
  if (existing.status !== 'pending') {
    return errorResponse('Source request is not in pending status', 409)
  }

  await env.DB.prepare(
    `UPDATE source_requests
     SET status = 'rejected', updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(id)
    .run()

  return json({ data: { id, status: 'rejected' }, ok: true })
}
