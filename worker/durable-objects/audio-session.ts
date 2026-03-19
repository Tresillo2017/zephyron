// AudioSessionDO — Durable Object for tracking live listener count per set
// Each set gets its own DO instance. Clients connect via WebSocket heartbeat.

import { DurableObject } from 'cloudflare:workers'

export class AudioSessionDO extends DurableObject {
  private listeners = new Map<string, { connectedAt: number; lastHeartbeat: number }>()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // GET /count — return current listener count
    if (url.pathname === '/count') {
      return Response.json({ listeners: this.listeners.size })
    }

    // POST /join — register a listener
    if (url.pathname === '/join' && request.method === 'POST') {
      const body = await request.json() as { listener_id: string }
      if (!body.listener_id) {
        return new Response('listener_id required', { status: 400 })
      }

      this.listeners.set(body.listener_id, {
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
      })

      this.ensureCleanup()
      return Response.json({ listeners: this.listeners.size })
    }

    // POST /heartbeat — keep listener alive
    if (url.pathname === '/heartbeat' && request.method === 'POST') {
      const body = await request.json() as { listener_id: string }
      const listener = this.listeners.get(body.listener_id)
      if (listener) {
        listener.lastHeartbeat = Date.now()
      }
      return Response.json({ listeners: this.listeners.size })
    }

    // POST /leave — remove a listener
    if (url.pathname === '/leave' && request.method === 'POST') {
      const body = await request.json() as { listener_id: string }
      this.listeners.delete(body.listener_id)
      return Response.json({ listeners: this.listeners.size })
    }

    return new Response('Not found', { status: 404 })
  }

  private ensureCleanup() {
    if (this.cleanupInterval) return

    // Clean up stale listeners every 30 seconds
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      const staleThreshold = 60_000 // 60 seconds without heartbeat

      for (const [id, listener] of this.listeners) {
        if (now - listener.lastHeartbeat > staleThreshold) {
          this.listeners.delete(id)
        }
      }

      // Stop interval if no listeners
      if (this.listeners.size === 0 && this.cleanupInterval) {
        clearInterval(this.cleanupInterval)
        this.cleanupInterval = null
      }
    }, 30_000)
  }
}
