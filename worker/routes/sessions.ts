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
