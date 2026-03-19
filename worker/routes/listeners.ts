// Listener count routes — proxy to AudioSessionDO
import { json, errorResponse } from '../lib/router'

// GET /api/sets/:id/listeners — Get live listener count
export async function getListenerCount(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params
  const doId = env.AUDIO_SESSION.idFromName(id)
  const stub = env.AUDIO_SESSION.get(doId)
  const resp = await stub.fetch(new Request('http://do/count'))
  const data = await resp.json() as { listeners: number }
  return json({ data: { listeners: data.listeners }, ok: true })
}

// POST /api/sets/:id/listeners/join — Join as listener
export async function joinListeners(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params
  let body: { listener_id: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const doId = env.AUDIO_SESSION.idFromName(id)
  const stub = env.AUDIO_SESSION.get(doId)
  const resp = await stub.fetch(new Request('http://do/join', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }))
  const data = await resp.json() as { listeners: number }
  return json({ data: { listeners: data.listeners }, ok: true })
}

// POST /api/sets/:id/listeners/heartbeat — Keep alive
export async function heartbeatListener(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params
  let body: { listener_id: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const doId = env.AUDIO_SESSION.idFromName(id)
  const stub = env.AUDIO_SESSION.get(doId)
  const resp = await stub.fetch(new Request('http://do/heartbeat', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }))
  const data = await resp.json() as { listeners: number }
  return json({ data: { listeners: data.listeners }, ok: true })
}

// POST /api/sets/:id/listeners/leave — Leave
export async function leaveListeners(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params
  let body: { listener_id: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const doId = env.AUDIO_SESSION.idFromName(id)
  const stub = env.AUDIO_SESSION.get(doId)
  const resp = await stub.fetch(new Request('http://do/leave', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }))
  const data = await resp.json() as { listeners: number }
  return json({ data: { listeners: data.listeners }, ok: true })
}
