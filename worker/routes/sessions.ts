import { json, errorResponse } from '../lib/router'
import { generateId } from '../lib/id'
import { getSessionDate } from '../lib/timezone'

/**
 * POST /api/sessions/start
 * Creates a new listening session when a user begins playing a DJ set.
 * Returns the session_id and started_at timestamp.
 */
export async function startSession(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  // Check authentication via session context
  // Note: session is attached by Better Auth middleware, type assertion needed for middleware-added properties
  const userId = (request as any).session?.session?.userId
  if (!userId) {
    return errorResponse('Authentication required', 401)
  }

  // Parse JSON body
  let body: { set_id?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  // Validate set_id is present
  const setId = body.set_id?.trim()
  if (!setId) {
    return errorResponse('set_id is required', 400)
  }

  try {
    // Verify set exists before creating session (prevents orphaned sessions)
    const set = await env.DB.prepare('SELECT id FROM sets WHERE id = ?')
      .bind(setId)
      .first<{ id: string }>()

    if (!set) {
      return errorResponse('Set not found', 404)
    }

    // Check for existing active session (to avoid duplicates)
    const existingSession = await env.DB.prepare(
      'SELECT id, started_at FROM listening_sessions WHERE user_id = ? AND set_id = ? AND ended_at IS NULL LIMIT 1'
    )
      .bind(userId, setId)
      .first<{ id: string; started_at: string }>()

    if (existingSession) {
      // Return the existing session
      return json({ session_id: existingSession.id, started_at: existingSession.started_at })
    }

    // Generate new session ID
    const sessionId = generateId()

    // Get current UTC timestamp
    const startedAt = new Date().toISOString()

    // Calculate session_date in Pacific timezone
    const sessionDate = getSessionDate(startedAt)

    // Insert new listening session
    await env.DB.prepare(
      'INSERT INTO listening_sessions (id, user_id, set_id, started_at, session_date) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(sessionId, userId, setId, startedAt, sessionDate)
      .run()

    return json({ session_id: sessionId, started_at: startedAt })
  } catch (error) {
    console.error('Failed to create session:', error)
    return errorResponse('Failed to create session', 500)
  }
}

/**
 * PATCH /api/sessions/:id/progress - Update session progress
 * Called by the player every 30 seconds to track listening position.
 * Updates the session duration and last position.
 */
export async function updateProgress(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  // Check authentication via session context
  // Note: session is attached by Better Auth middleware, type assertion needed for middleware-added properties
  const userId = (request as any).session?.session?.userId
  if (!userId) {
    return errorResponse('Authentication required', 401)
  }

  // Parse JSON body
  let body: { position_seconds?: number }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  // Validate position_seconds is a number
  const positionSeconds = body.position_seconds
  if (typeof positionSeconds !== 'number' || positionSeconds < 0) {
    return errorResponse('position_seconds must be a non-negative number', 400)
  }

  const sessionId = params.id
  if (!sessionId) {
    return errorResponse('Session ID required', 400)
  }

  try {
    // Get session from DB
    const session = await env.DB.prepare(
      'SELECT id, user_id, duration_seconds FROM listening_sessions WHERE id = ?'
    )
      .bind(sessionId)
      .first<{ id: string; user_id: string; duration_seconds: number }>()

    if (!session) {
      return errorResponse('Session not found', 404)
    }

    // Verify session belongs to user
    if (session.user_id !== userId) {
      return errorResponse('Unauthorized', 403)
    }

    // Update: add 30 seconds to duration (progress update interval), update position
    const newDuration = session.duration_seconds + 30

    await env.DB.prepare(
      'UPDATE listening_sessions SET duration_seconds = ?, last_position_seconds = ? WHERE id = ?'
    )
      .bind(newDuration, positionSeconds, sessionId)
      .run()

    return json({ ok: true })
  } catch (error) {
    console.error('Failed to update session progress:', error)
    return errorResponse('Failed to update session progress', 500)
  }
}

/**
 * POST /api/sessions/:id/end - Finalize listening session
 * Called when user stops/pauses playback.
 * Calculates percentage completed and qualification (>= 15%).
 * Updates ended_at timestamp and marks session as complete.
 */
export async function endSession(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  // Check authentication via session context
  // Note: session is attached by Better Auth middleware, type assertion needed for middleware-added properties
  const userId = (request as any).session?.session?.userId
  if (!userId) {
    return errorResponse('Authentication required', 401)
  }

  // Parse JSON body
  let body: { position_seconds?: number }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  // Validate position_seconds is a number
  const positionSeconds = body.position_seconds
  if (typeof positionSeconds !== 'number' || positionSeconds < 0) {
    return errorResponse('position_seconds must be a non-negative number', 400)
  }

  const sessionId = params.id
  if (!sessionId) {
    return errorResponse('Session ID required', 400)
  }

  try {
    // Get session from DB
    const session = await env.DB.prepare(
      'SELECT id, user_id, set_id, duration_seconds FROM listening_sessions WHERE id = ?'
    )
      .bind(sessionId)
      .first<{ id: string; user_id: string; set_id: string; duration_seconds: number }>()

    if (!session) {
      return errorResponse('Session not found', 404)
    }

    // Verify session belongs to user
    if (session.user_id !== userId) {
      return errorResponse('Unauthorized', 403)
    }

    // Get set duration
    const set = await env.DB.prepare('SELECT duration_seconds FROM sets WHERE id = ?')
      .bind(session.set_id)
      .first<{ duration_seconds: number }>()

    if (!set) {
      return errorResponse('Set not found', 404)
    }

    // Calculate percentage completed
    const percentageCompleted = (session.duration_seconds / set.duration_seconds) * 100

    // Calculate qualifies: >= 15% completion
    const qualifies = percentageCompleted >= 15 ? 1 : 0

    // Update session: set ended_at, last_position_seconds, percentage_completed, qualifies
    const endedAt = new Date().toISOString()

    await env.DB.prepare(
      'UPDATE listening_sessions SET ended_at = ?, last_position_seconds = ?, percentage_completed = ?, qualifies = ? WHERE id = ?'
    )
      .bind(endedAt, positionSeconds, percentageCompleted, qualifies, sessionId)
      .run()

    return json({ ok: true, qualifies: qualifies === 1 })
  } catch (error) {
    console.error('Failed to end session:', error)
    return errorResponse('Failed to end session', 500)
  }
}
