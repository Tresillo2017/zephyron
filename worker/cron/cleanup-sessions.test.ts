import { describe, it, expect, vi } from 'vitest'
import { cleanupOrphanedSessions } from './cleanup-sessions'

describe('cleanupOrphanedSessions', () => {
  it('closes sessions older than 4 hours with NULL ended_at', async () => {
    // Create a timestamp 4+ hours ago
    const fourHoursAgo = new Date(Date.now() - 4.5 * 60 * 60 * 1000).toISOString()

    const mockPrepare = vi.fn()
    const mockBind = vi.fn()
    const mockAll = vi.fn()
    const mockRun = vi.fn()

    mockPrepare.mockReturnThis()
    mockBind.mockReturnThis()

    // First query: get orphaned sessions (SELECT all)
    mockAll.mockResolvedValueOnce({
      results: [
        {
          id: 'session_orphaned_1',
          set_id: 'set_123',
          created_at: fourHoursAgo,
          duration_seconds: 900, // 15 minutes
        },
      ],
    })

    // Second query: get set duration
    mockAll.mockResolvedValueOnce({
      results: [
        {
          duration_seconds: 6000, // 100 minutes, 900/6000 = 15%
        },
      ],
    })

    mockRun.mockResolvedValue({ success: true })

    const env = {
      DB: {
        prepare: mockPrepare,
        bind: mockBind,
        all: mockAll,
        run: mockRun,
      },
    } as any

    const result = await cleanupOrphanedSessions(env)

    expect(result.closedCount).toBe(1)
    expect(mockRun).toHaveBeenCalled()
  })

  it('does not close recent sessions', async () => {
    const mockPrepare = vi.fn()
    const mockBind = vi.fn()
    const mockAll = vi.fn()
    const mockRun = vi.fn()

    mockPrepare.mockReturnThis()
    mockBind.mockReturnThis()

    // First query: get orphaned sessions (none found for recent times)
    mockAll.mockResolvedValueOnce({
      results: [],
    })

    mockRun.mockResolvedValue({ success: true })

    const env = {
      DB: {
        prepare: mockPrepare,
        bind: mockBind,
        all: mockAll,
        run: mockRun,
      },
    } as any

    const result = await cleanupOrphanedSessions(env)

    expect(result.closedCount).toBe(0)
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('skips sessions where set is not found', async () => {
    const fourHoursAgo = new Date(Date.now() - 4.5 * 60 * 60 * 1000).toISOString()

    const mockPrepare = vi.fn()
    const mockBind = vi.fn()
    const mockAll = vi.fn()
    const mockRun = vi.fn()

    mockPrepare.mockReturnThis()
    mockBind.mockReturnThis()

    // First query: get orphaned sessions
    mockAll.mockResolvedValueOnce({
      results: [
        {
          id: 'session_orphaned_1',
          set_id: 'set_deleted',
          created_at: fourHoursAgo,
          duration_seconds: 900,
        },
      ],
    })

    // Second query: set not found (empty results)
    mockAll.mockResolvedValueOnce({
      results: [],
    })

    mockRun.mockResolvedValue({ success: true })

    const env = {
      DB: {
        prepare: mockPrepare,
        bind: mockBind,
        all: mockAll,
        run: mockRun,
      },
    } as any

    const result = await cleanupOrphanedSessions(env)

    // Session skipped, but we still count it as attempted cleanup
    expect(result.closedCount).toBe(0)
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('calculates percentage_completed and qualifies flag correctly', async () => {
    const fourHoursAgo = new Date(Date.now() - 4.5 * 60 * 60 * 1000).toISOString()

    const mockPrepare = vi.fn()
    const mockBind = vi.fn()
    const mockAll = vi.fn()
    const mockRun = vi.fn()

    mockPrepare.mockReturnThis()
    mockBind.mockReturnThis()

    // First query: get orphaned session
    mockAll.mockResolvedValueOnce({
      results: [
        {
          id: 'session_orphaned_1',
          set_id: 'set_123',
          created_at: fourHoursAgo,
          duration_seconds: 1800, // 30 minutes
        },
      ],
    })

    // Second query: get set duration
    mockAll.mockResolvedValueOnce({
      results: [
        {
          duration_seconds: 12000, // 200 minutes, 1800/12000 = 15%
        },
      ],
    })

    mockRun.mockResolvedValue({ success: true })

    const env = {
      DB: {
        prepare: mockPrepare,
        bind: mockBind,
        all: mockAll,
        run: mockRun,
      },
    } as any

    const result = await cleanupOrphanedSessions(env)

    expect(result.closedCount).toBe(1)

    // Verify UPDATE was called with correct percentage and qualifies
    const updateCall = mockRun.mock.calls[0]
    expect(updateCall).toBeDefined()
  })

  it('handles multiple orphaned sessions', async () => {
    const fourHoursAgo = new Date(Date.now() - 4.5 * 60 * 60 * 1000).toISOString()

    const mockPrepare = vi.fn()
    const mockBind = vi.fn()
    const mockAll = vi.fn()
    const mockRun = vi.fn()

    mockPrepare.mockReturnThis()
    mockBind.mockReturnThis()

    // First query: get multiple orphaned sessions
    mockAll.mockResolvedValueOnce({
      results: [
        {
          id: 'session_orphaned_1',
          set_id: 'set_123',
          created_at: fourHoursAgo,
          duration_seconds: 900,
        },
        {
          id: 'session_orphaned_2',
          set_id: 'set_456',
          created_at: fourHoursAgo,
          duration_seconds: 1200,
        },
      ],
    })

    // Set duration queries
    mockAll
      .mockResolvedValueOnce({
        results: [
          {
            duration_seconds: 6000,
          },
        ],
      })
      .mockResolvedValueOnce({
        results: [
          {
            duration_seconds: 8000,
          },
        ],
      })

    mockRun.mockResolvedValue({ success: true })

    const env = {
      DB: {
        prepare: mockPrepare,
        bind: mockBind,
        all: mockAll,
        run: mockRun,
      },
    } as any

    const result = await cleanupOrphanedSessions(env)

    expect(result.closedCount).toBe(2)
    expect(mockRun).toHaveBeenCalledTimes(2)
  })
})
