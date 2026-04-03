// Set request API — stores requests in DB instead of GitHub Issues
import { json, errorResponse } from '../lib/router'

function generateId(): string {
  return crypto.randomUUID()
}

// POST /api/petitions — submit a set request (authenticated users)
export async function submitSetRequest(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  let body: {
    name: string
    artist: string
    source_type?: 'youtube' | 'soundcloud' | 'hearthis'
    source_url?: string
    event?: string
    genre?: string
    notes?: string
  }

  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  if (!body.name?.trim()) return errorResponse('Set name is required', 400)
  if (!body.artist?.trim()) return errorResponse('DJ/Artist name is required', 400)

  // Validate source_url if source_type is provided
  if (body.source_type && !body.source_url?.trim()) {
    return errorResponse('A URL is required when a source type is selected', 400)
  }

  // Get the authenticated user's ID from the session
  const { createAuth } = await import('../lib/auth')
  const auth = createAuth(env)
  const session = await auth.api.getSession({ headers: request.headers })
  const userId = session?.user?.id || null

  const id = generateId()

  await env.DB.prepare(
    `INSERT INTO set_requests (
      id, user_id, title, artist, source_type, source_url,
      event, genre, notes, status, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, 'pending',
      datetime('now'), datetime('now')
    )`
  )
    .bind(
      id,
      userId,
      body.name.trim(),
      body.artist.trim(),
      body.source_type || null,
      body.source_url?.trim() || null,
      body.event?.trim() || null,
      body.genre?.trim() || null,
      body.notes?.trim() || null
    )
    .run()

  return json({ data: { id }, ok: true }, 201)
}

// GET /api/admin/set-requests — list all set requests (admin only)
export async function listSetRequests(
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
      r.*,
      u.name AS user_name,
      u.email AS user_email
    FROM set_requests r
    LEFT JOIN user u ON u.id = r.user_id
    WHERE r.status = ?
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?`
  )
    .bind(status, limit, offset)
    .all()

  const countResult = await env.DB.prepare(
    'SELECT COUNT(*) AS total FROM set_requests WHERE status = ?'
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

// POST /api/admin/set-requests/:id/approve — approve a set request (admin only)
export async function approveSetRequest(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  const existing = await env.DB.prepare(
    'SELECT id, status FROM set_requests WHERE id = ?'
  )
    .bind(id)
    .first<{ id: string; status: string }>()

  if (!existing) return errorResponse('Set request not found', 404)
  if (existing.status !== 'pending') {
    return errorResponse('Set request is not in pending status', 409)
  }

  await env.DB.prepare(
    `UPDATE set_requests SET status = 'approved', updated_at = datetime('now') WHERE id = ?`
  )
    .bind(id)
    .run()

  return json({ data: { id, status: 'approved' }, ok: true })
}

// POST /api/admin/set-requests/:id/reject — reject a set request (admin only)
export async function rejectSetRequest(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params

  let body: { admin_notes?: string } = {}
  try {
    body = await request.json()
  } catch {
    // notes are optional
  }

  const existing = await env.DB.prepare(
    'SELECT id, status FROM set_requests WHERE id = ?'
  )
    .bind(id)
    .first<{ id: string; status: string }>()

  if (!existing) return errorResponse('Set request not found', 404)
  if (existing.status !== 'pending') {
    return errorResponse('Set request is not in pending status', 409)
  }

  await env.DB.prepare(
    `UPDATE set_requests
     SET status = 'rejected', admin_notes = ?, updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(body.admin_notes?.trim() || null, id)
    .run()

  return json({ data: { id, status: 'rejected' }, ok: true })
}
