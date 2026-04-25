import { json, errorResponse } from '../lib/router'
import { requireAuth, createAuth } from '../lib/auth'

/**
 * PATCH /api/user/username
 * Updates the authenticated user's display name (username), enforcing uniqueness.
 */
export async function updateUsername(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const authResult = await requireAuth(request, env)
  if (authResult instanceof Response) return authResult

  const { user } = authResult

  let body: { username?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  const username = body.username?.trim()

  if (!username) {
    return errorResponse('Username is required', 400)
  }

  if (username.length < 2 || username.length > 32) {
    return errorResponse('Username must be between 2 and 32 characters', 400)
  }

  // Allow letters, numbers, underscores, hyphens, dots — no spaces
  if (!/^[a-zA-Z0-9_\-. ]+$/.test(username)) {
    return errorResponse('Username can only contain letters, numbers, spaces, underscores, hyphens, and dots', 400)
  }

  // Check uniqueness — case-insensitive, exclude current user
  const existing = await env.DB.prepare(
    'SELECT id FROM user WHERE LOWER(name) = LOWER(?) AND id != ? LIMIT 1'
  )
    .bind(username, user.id)
    .first<{ id: string }>()

  if (existing) {
    return errorResponse('Username is already taken', 409)
  }

  // Update via Better Auth so the session reflects the new name
  const auth = createAuth(env)
  await auth.api.updateUser({
    headers: request.headers,
    body: { name: username },
  })

  return json({ ok: true, username })
}

/**
 * DELETE /api/user/me
 * Deletes the authenticated user's account and all associated R2 assets.
 */
export async function deleteCurrentUser(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const authResult = await requireAuth(request, env)
  if (authResult instanceof Response) return authResult

  const { user } = authResult

  // Best-effort: delete R2 assets before removing user record
  await Promise.allSettled([
    env.AVATARS.delete(`${user.id}/avatar.webp`),
    env.AVATARS.delete(`${user.id}/banner.webp`),
  ])

  const auth = createAuth(env)
  // `auth.api` type does not expose admin-plugin endpoints without explicit widening.
  // The admin plugin (registered in auth.ts) adds `removeUser` at runtime.
  const adminApi = auth.api as typeof auth.api & {
    removeUser: (opts: { body: { userId: string }; headers: Headers }) => Promise<{ success: boolean }>
  }
  const result = await adminApi.removeUser({
    body: { userId: user.id },
    headers: request.headers,
  })

  if (!result?.success) {
    return errorResponse('Failed to delete account', 500)
  }

  return json({ ok: true })
}
