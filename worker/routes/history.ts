import { json, errorResponse } from '../lib/router'
import { getAnonymousId } from '../lib/db'
import { generateId } from '../lib/id'

// GET /api/history — Get listening history
export async function getHistory(
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
    `SELECT h.*, s.title, s.artist, s.genre, s.duration_seconds, s.cover_image_r2_key
     FROM listen_history h
     JOIN sets s ON h.set_id = s.id
     WHERE h.anonymous_id = ?
     ORDER BY h.last_listened_at DESC
     LIMIT 50`
  )
    .bind(anonymousId)
    .all()

  return json({ data: result.results, ok: true })
}

// POST /api/history — Update listening position
export async function updateHistory(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const anonymousId = getAnonymousId(request)
  if (!anonymousId) {
    return errorResponse('Anonymous ID required', 400)
  }

  let body: { set_id: string; position_seconds: number }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  if (!body.set_id || typeof body.position_seconds !== 'number') {
    return errorResponse('set_id and position_seconds required', 400)
  }

  // Upsert listen history
  const existing = await env.DB.prepare(
    'SELECT id FROM listen_history WHERE anonymous_id = ? AND set_id = ?'
  )
    .bind(anonymousId, body.set_id)
    .first<{ id: string }>()

  if (existing) {
    await env.DB.prepare(
      `UPDATE listen_history
       SET last_position_seconds = ?, listen_count = listen_count + 1, last_listened_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(body.position_seconds, existing.id)
      .run()
  } else {
    const id = generateId()
    await env.DB.prepare(
      `INSERT INTO listen_history (id, anonymous_id, set_id, last_position_seconds)
       VALUES (?, ?, ?, ?)`
    )
      .bind(id, anonymousId, body.set_id, body.position_seconds)
      .run()
  }

  return json({ ok: true })
}
