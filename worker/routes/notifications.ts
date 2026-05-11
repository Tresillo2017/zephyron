import { json } from '../lib/router'

// GET /api/notifications — last 30, newest first, plus unread_count
export async function getNotifications(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>,
  user: { id: string }
): Promise<Response> {
  const [rows, countRow] = await Promise.all([
    env.DB.prepare(
      'SELECT id, type, title, body, link, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30'
    ).bind(user.id).all(),
    env.DB.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
    ).bind(user.id).first<{ count: number }>(),
  ])

  return json({
    data: {
      notifications: rows.results,
      unread_count: countRow?.count ?? 0,
    },
    ok: true,
  })
}

// POST /api/notifications/read-all
export async function markAllNotificationsRead(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>,
  user: { id: string }
): Promise<Response> {
  await env.DB.prepare(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0'
  ).bind(user.id).run()

  return json({ ok: true })
}

// POST /api/notifications/:id/read
export async function markNotificationRead(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>,
  user: { id: string }
): Promise<Response> {
  await env.DB.prepare(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
  ).bind(params.id, user.id).run()

  return json({ ok: true })
}
