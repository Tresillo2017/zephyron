import { describe, it, expect, vi } from 'vitest'
import { startSession, updateProgress, endSession } from './sessions'

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

      // Mock environment with set existing and no active session
      const mockPrepare = vi.fn()
      const mockBind = vi.fn()
      const mockFirst = vi.fn()
      const mockRun = vi.fn()

      mockPrepare.mockReturnThis()
      mockBind.mockReturnThis()

      // First call: set existence check returns set
      // Second call: existing session check returns null
      // Third call (implicit from run): insert succeeds
      mockFirst
        .mockResolvedValueOnce({ id: 'set_123' }) // Set exists
        .mockResolvedValueOnce(null) // No existing session

      mockRun.mockResolvedValue({ success: true })

      const env = {
        DB: {
          prepare: mockPrepare,
          bind: mockBind,
          first: mockFirst,
          run: mockRun,
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

    it('returns existing active session when one already exists', async () => {
      const request = new Request('http://localhost/api/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ set_id: 'set_123' }),
      })

      ;(request as any).session = {
        session: {
          userId: 'user_123',
        },
      }

      const existingSessionId = 'session_existing_123'
      const existingStartedAt = new Date().toISOString()

      const mockPrepare = vi.fn()
      const mockBind = vi.fn()
      const mockFirst = vi.fn()

      mockPrepare.mockReturnThis()
      mockBind.mockReturnThis()

      mockFirst
        .mockResolvedValueOnce({ id: 'set_123' }) // Set exists
        .mockResolvedValueOnce({ id: existingSessionId, started_at: existingStartedAt }) // Existing session found

      const env = {
        DB: {
          prepare: mockPrepare,
          bind: mockBind,
          first: mockFirst,
        },
      } as any

      const ctx = {} as ExecutionContext

      const response = await startSession(request, env, ctx, {})

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.session_id).toBe(existingSessionId)
      expect(data.started_at).toBe(existingStartedAt)
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

    it('returns 400 when set_id is empty string or whitespace only', async () => {
      const request = new Request('http://localhost/api/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ set_id: '   ' }),
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
      expect(data.error).toBe('set_id is required')
    })

    it('returns 400 when request body is invalid JSON', async () => {
      const request = new Request('http://localhost/api/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json {',
      })

      ;(request as any).session = {
        session: {
          userId: 'user_123',
        },
      }

      const env = {} as any
      const ctx = {} as ExecutionContext

      const response = await startSession(request, env, ctx, {})

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid JSON body')
    })

    it('returns 404 when set does not exist', async () => {
      const request = new Request('http://localhost/api/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ set_id: 'nonexistent_set' }),
      })

      ;(request as any).session = {
        session: {
          userId: 'user_123',
        },
      }

      const mockPrepare = vi.fn()
      const mockBind = vi.fn()
      const mockFirst = vi.fn()

      mockPrepare.mockReturnThis()
      mockBind.mockReturnThis()
      mockFirst.mockResolvedValueOnce(null) // Set does not exist

      const env = {
        DB: {
          prepare: mockPrepare,
          bind: mockBind,
          first: mockFirst,
        },
      } as any

      const ctx = {} as ExecutionContext

      const response = await startSession(request, env, ctx, {})

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Set not found')
    })

    it('returns 500 when database error occurs', async () => {
      const request = new Request('http://localhost/api/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ set_id: 'set_123' }),
      })

      ;(request as any).session = {
        session: {
          userId: 'user_123',
        },
      }

      const mockPrepare = vi.fn()
      const mockBind = vi.fn()

      mockPrepare.mockReturnThis()
      mockBind.mockImplementationOnce(() => {
        throw new Error('Database connection failed')
      })

      const env = {
        DB: {
          prepare: mockPrepare,
          bind: mockBind,
        },
      } as any

      const ctx = {} as ExecutionContext

      const response = await startSession(request, env, ctx, {})

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to create session')
    })
  })

  describe('PATCH /api/sessions/:id/progress', () => {
    it('updates session duration and position', async () => {
      const request = new Request('http://localhost/api/sessions/session_123/progress', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ position_seconds: 60 }),
      })

      ;(request as any).session = {
        session: {
          userId: 'user_123',
        },
      }

      const mockPrepare = vi.fn()
      const mockBind = vi.fn()
      const mockFirst = vi.fn()
      const mockRun = vi.fn()

      mockPrepare.mockReturnThis()
      mockBind.mockReturnThis()

      // First call: get session
      mockFirst.mockResolvedValueOnce({
        id: 'session_123',
        user_id: 'user_123',
        duration_seconds: 30,
      })

      mockRun.mockResolvedValue({ success: true })

      const env = {
        DB: {
          prepare: mockPrepare,
          bind: mockBind,
          first: mockFirst,
          run: mockRun,
        },
      } as any

      const ctx = {} as ExecutionContext

      const response = await updateProgress(request, env, ctx, { id: 'session_123' })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.ok).toBe(true)
    })

    it('returns 403 when session belongs to different user', async () => {
      const request = new Request('http://localhost/api/sessions/session_123/progress', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ position_seconds: 60 }),
      })

      ;(request as any).session = {
        session: {
          userId: 'user_123',
        },
      }

      const mockPrepare = vi.fn()
      const mockBind = vi.fn()
      const mockFirst = vi.fn()

      mockPrepare.mockReturnThis()
      mockBind.mockReturnThis()

      // Session belongs to different user
      mockFirst.mockResolvedValueOnce({
        id: 'session_123',
        user_id: 'user_999',
        duration_seconds: 30,
      })

      const env = {
        DB: {
          prepare: mockPrepare,
          bind: mockBind,
          first: mockFirst,
        },
      } as any

      const ctx = {} as ExecutionContext

      const response = await updateProgress(request, env, ctx, { id: 'session_123' })

      expect(response.status).toBe(403)
    })

    it('returns 401 when user not authenticated', async () => {
      const request = new Request('http://localhost/api/sessions/session_123/progress', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ position_seconds: 60 }),
      })

      // No session context

      const env = {} as any
      const ctx = {} as ExecutionContext

      const response = await updateProgress(request, env, ctx, { id: 'session_123' })

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/sessions/:id/end', () => {
    it('finalizes session and calculates qualification', async () => {
      const request = new Request('http://localhost/api/sessions/session_123/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ position_seconds: 900 }),
      })

      ;(request as any).session = {
        session: {
          userId: 'user_123',
        },
      }

      const mockPrepare = vi.fn()
      const mockBind = vi.fn()
      const mockFirst = vi.fn()
      const mockRun = vi.fn()

      mockPrepare.mockReturnThis()
      mockBind.mockReturnThis()

      // First call: get session
      mockFirst
        .mockResolvedValueOnce({
          id: 'session_123',
          user_id: 'user_123',
          set_id: 'set_123',
          duration_seconds: 900,
        })
        // Second call: get set duration
        .mockResolvedValueOnce({
          duration_seconds: 6000, // 100 minutes
        })

      mockRun.mockResolvedValue({ success: true })

      const env = {
        DB: {
          prepare: mockPrepare,
          bind: mockBind,
          first: mockFirst,
          run: mockRun,
        },
      } as any

      const ctx = {} as ExecutionContext

      const response = await endSession(request, env, ctx, { id: 'session_123' })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.ok).toBe(true)
      expect(typeof data.qualifies).toBe('boolean')
      expect(data.qualifies).toBe(true) // 900/6000 = 15%, should qualify
    })

    it('returns false for qualifies when below 15% threshold', async () => {
      const request = new Request('http://localhost/api/sessions/session_123/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ position_seconds: 300 }),
      })

      ;(request as any).session = {
        session: {
          userId: 'user_123',
        },
      }

      const mockPrepare = vi.fn()
      const mockBind = vi.fn()
      const mockFirst = vi.fn()
      const mockRun = vi.fn()

      mockPrepare.mockReturnThis()
      mockBind.mockReturnThis()

      // First call: get session
      mockFirst
        .mockResolvedValueOnce({
          id: 'session_123',
          user_id: 'user_123',
          set_id: 'set_123',
          duration_seconds: 300,
        })
        // Second call: get set duration
        .mockResolvedValueOnce({
          duration_seconds: 3000, // 50 minutes, 300/3000 = 10%
        })

      mockRun.mockResolvedValue({ success: true })

      const env = {
        DB: {
          prepare: mockPrepare,
          bind: mockBind,
          first: mockFirst,
          run: mockRun,
        },
      } as any

      const ctx = {} as ExecutionContext

      const response = await endSession(request, env, ctx, { id: 'session_123' })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.qualifies).toBe(false)
    })

    it('returns 401 when user not authenticated', async () => {
      const request = new Request('http://localhost/api/sessions/session_123/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ position_seconds: 900 }),
      })

      // No session context

      const env = {} as any
      const ctx = {} as ExecutionContext

      const response = await endSession(request, env, ctx, { id: 'session_123' })

      expect(response.status).toBe(401)
    })

    it('returns 403 when session belongs to different user', async () => {
      const request = new Request('http://localhost/api/sessions/session_123/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ position_seconds: 900 }),
      })

      ;(request as any).session = {
        session: {
          userId: 'user_123',
        },
      }

      const mockPrepare = vi.fn()
      const mockBind = vi.fn()
      const mockFirst = vi.fn()

      mockPrepare.mockReturnThis()
      mockBind.mockReturnThis()

      // Session belongs to different user
      mockFirst.mockResolvedValueOnce({
        id: 'session_123',
        user_id: 'user_999',
        set_id: 'set_123',
        duration_seconds: 900,
      })

      const env = {
        DB: {
          prepare: mockPrepare,
          bind: mockBind,
          first: mockFirst,
        },
      } as any

      const ctx = {} as ExecutionContext

      const response = await endSession(request, env, ctx, { id: 'session_123' })

      expect(response.status).toBe(403)
    })

    it('returns 404 when session not found', async () => {
      const request = new Request('http://localhost/api/sessions/session_123/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ position_seconds: 900 }),
      })

      ;(request as any).session = {
        session: {
          userId: 'user_123',
        },
      }

      const mockPrepare = vi.fn()
      const mockBind = vi.fn()
      const mockFirst = vi.fn()

      mockPrepare.mockReturnThis()
      mockBind.mockReturnThis()

      // Session not found
      mockFirst.mockResolvedValueOnce(null)

      const env = {
        DB: {
          prepare: mockPrepare,
          bind: mockBind,
          first: mockFirst,
        },
      } as any

      const ctx = {} as ExecutionContext

      const response = await endSession(request, env, ctx, { id: 'session_123' })

      expect(response.status).toBe(404)
    })
  })
})
