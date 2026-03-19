import { json, errorResponse } from '../lib/router'
import { getAnonymousId } from '../lib/db'
import { generateId } from '../lib/id'
import type { Detection, Annotation } from '../types'

// GET /api/detections/set/:setId — Get all detections for a set
export async function getDetections(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { setId } = params

  const result = await env.DB.prepare(
    'SELECT * FROM detections WHERE set_id = ? ORDER BY start_time_seconds ASC'
  )
    .bind(setId)
    .all()

  return json({ data: result.results as unknown as Detection[], ok: true })
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
