import { json, errorResponse } from '../lib/router'

// POST /api/artists/:id/follow
export async function followArtist(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>,
  user: { id: string }
): Promise<Response> {
  const { id: artistId } = params

  const artist = await env.DB.prepare('SELECT id FROM artists WHERE id = ?')
    .bind(artistId)
    .first()
  if (!artist) return errorResponse('Artist not found', 404)

  await env.DB.prepare(
    'INSERT OR IGNORE INTO artist_follows (user_id, artist_id) VALUES (?, ?)'
  ).bind(user.id, artistId).run()

  return json({ data: { following: true }, ok: true })
}

// DELETE /api/artists/:id/follow
export async function unfollowArtist(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>,
  user: { id: string }
): Promise<Response> {
  const { id: artistId } = params

  await env.DB.prepare(
    'DELETE FROM artist_follows WHERE user_id = ? AND artist_id = ?'
  ).bind(user.id, artistId).run()

  return json({ data: { following: false }, ok: true })
}

// GET /api/artists/:id/follow
export async function getFollowStatus(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>,
  user: { id: string }
): Promise<Response> {
  const { id: artistId } = params

  const row = await env.DB.prepare(
    'SELECT 1 FROM artist_follows WHERE user_id = ? AND artist_id = ?'
  ).bind(user.id, artistId).first()

  return json({ data: { following: !!row }, ok: true })
}
