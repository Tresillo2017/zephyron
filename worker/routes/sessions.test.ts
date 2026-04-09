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
})
