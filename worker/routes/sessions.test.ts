import { describe, it, expect, vi } from 'vitest'
import { startSession } from './sessions'

describe('sessions', () => {
  describe('startSession', () => {
    it('creates new session when no active session exists', async () => {
      // Mock the auth session context
      const request = new Request('http://localhost/api/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ set_id: 'set_123' }),
      })

      // Attach session context (simulating Better Auth)
      ;(request as any).session = {
        session: {
          userId: 'user_123',
        },
      }

      // Mock environment
      const env = {
        DB: {
          prepare: vi.fn().mockReturnThis(),
          bind: vi.fn().mockReturnThis(),
          first: vi.fn().mockResolvedValue(null), // No existing session
          run: vi.fn().mockResolvedValue({ success: true }),
        },
      } as any

      const ctx = {} as ExecutionContext

      const response = await startSession(request, env, ctx, {})

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('session_id')
      expect(data).toHaveProperty('started_at')
      expect(typeof data.session_id).toBe('string')
      expect(typeof data.started_at).toBe('string')
    })

    it('returns 401 when user not authenticated', async () => {
      const request = new Request('http://localhost/api/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ set_id: 'set_123' }),
      })

      // No session context attached

      const env = {} as any
      const ctx = {} as ExecutionContext

      const response = await startSession(request, env, ctx, {})

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    it('returns 400 when set_id missing', async () => {
      const request = new Request('http://localhost/api/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      ;(request as any).session = {
        session: {
          userId: 'user_123',
        },
      }

      const env = {
        DB: {
          prepare: vi.fn().mockReturnThis(),
          bind: vi.fn().mockReturnThis(),
          first: vi.fn().mockResolvedValue(null),
          run: vi.fn().mockResolvedValue({ success: true }),
        },
      } as any

      const ctx = {} as ExecutionContext

      const response = await startSession(request, env, ctx, {})

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })
  })
})
