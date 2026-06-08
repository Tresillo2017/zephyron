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
  const userId = (request as any).session?.session?.userId
  if (!userId) {
    return json({ data: [], ok: true })
  }

  // Return the most recent session per set (qualified completed sessions, or in-progress with
  // actual position — covers tab-close/page-refresh cases where ended_at is never written)
  const result = await env.DB.prepare(
    `WITH ranked AS (
       SELECT
         id, user_id, set_id, last_position_seconds, started_at, ended_at,
         ROW_NUMBER() OVER (PARTITION BY set_id ORDER BY COALESCE(ended_at, started_at) DESC) AS rn,
         COUNT(*) OVER (PARTITION BY set_id) AS listen_count
       FROM listening_sessions
       WHERE user_id = ?
         AND (
           (qualifies = 1 AND ended_at IS NOT NULL)
           OR (ended_at IS NULL AND last_position_seconds > 0)
         )
     )
     SELECT
       r.id, r.user_id, NULL AS anonymous_id, r.set_id,
       r.last_position_seconds, r.listen_count,
       COALESCE(r.ended_at, r.started_at) AS last_listened_at,
       s.title, s.artist, s.genre, s.duration_seconds, s.cover_image_r2_key
     FROM ranked r
     JOIN sets s ON r.set_id = s.id
     WHERE r.rn = 1
     ORDER BY COALESCE(r.ended_at, r.started_at) DESC
     LIMIT 50`
  )
    .bind(userId)
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
