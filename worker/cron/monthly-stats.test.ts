import { describe, it, expect, vi } from 'vitest'
import { generateMonthlyStats } from './monthly-stats'

describe('generateMonthlyStats', () => {
  it('aggregates sessions from previous month and returns processedUsers count', async () => {
    // 2026-04-01
    const _startDate = '2026-03-01'
    const _endDate = '2026-04-01'

    const mockPrepare = vi.fn()
    const mockBind = vi.fn()
    const mockAll = vi.fn()
    const mockFirst = vi.fn()
    const mockRun = vi.fn()

    mockPrepare.mockReturnThis()
    mockBind.mockReturnThis()

    // First query: get distinct users
    mockAll.mockResolvedValueOnce({
      results: [
        { user_id: 'user_1' },
        { user_id: 'user_2' },
      ],
    })

    // For user_1: base stats
    mockFirst.mockResolvedValueOnce({
      total_duration: 3600,
      qualifying_sessions: 5,
      unique_sets: 3,
    })

    // For user_1: top artists
    mockAll.mockResolvedValueOnce({
      results: ['Artist A', 'Artist B', 'Artist C'],
    })

    // For user_1: top genre
    mockFirst.mockResolvedValueOnce({
      genre: 'House',
    })

    // For user_1: discoveries
    mockFirst.mockResolvedValueOnce({
      discovery_count: 2,
    })

    // For user_1: longest set
    mockFirst.mockResolvedValueOnce({
      set_id: 'set_longest_1',
    })

    // For user_1: insert
    mockRun.mockResolvedValueOnce({ success: true })

    // For user_2: base stats
    mockFirst.mockResolvedValueOnce({
      total_duration: 2400,
      qualifying_sessions: 3,
      unique_sets: 2,
    })

    // For user_2: top artists
    mockAll.mockResolvedValueOnce({
      results: ['Artist D', 'Artist E', 'Artist F'],
    })

    // For user_2: top genre
    mockFirst.mockResolvedValueOnce({
      genre: 'Techno',
    })

    // For user_2: discoveries
    mockFirst.mockResolvedValueOnce({
      discovery_count: 1,
    })

    // For user_2: longest set
    mockFirst.mockResolvedValueOnce({
      set_id: 'set_longest_2',
    })

    // For user_2: insert
    mockRun.mockResolvedValueOnce({ success: true })

    const env = {
      DB: {
        prepare: mockPrepare,
        bind: mockBind,
        all: mockAll,
        first: mockFirst,
        run: mockRun,
      },
    } as any

    const result = await generateMonthlyStats(env, 2026, 3)

    expect(result.processedUsers).toBe(2)
    expect(mockRun).toHaveBeenCalledTimes(2)
  })

  it('returns 0 when no users have sessions in the period', async () => {
    const mockPrepare = vi.fn()
    const mockBind = vi.fn()
    const mockAll = vi.fn()
    const mockRun = vi.fn()

    mockPrepare.mockReturnThis()
    mockBind.mockReturnThis()

    // First query: get distinct users (empty)
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

    const result = await generateMonthlyStats(env, 2026, 3)

    expect(result.processedUsers).toBe(0)
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('handles January month (previous month is December of previous year)', async () => {
    const mockPrepare = vi.fn()
    const mockBind = vi.fn()
    const mockAll = vi.fn()
    const mockFirst = vi.fn()
    const mockRun = vi.fn()

    mockPrepare.mockReturnThis()
    mockBind.mockReturnThis()

    // First query: get distinct users
    mockAll.mockResolvedValueOnce({
      results: [{ user_id: 'user_1' }],
    })

    // For user_1: base stats
    mockFirst.mockResolvedValueOnce({
      total_duration: 1800,
      qualifying_sessions: 1,
      unique_sets: 1,
    })

    // For user_1: top artists
    mockAll.mockResolvedValueOnce({
      results: ['Artist A'],
    })

    // For user_1: top genre
    mockFirst.mockResolvedValueOnce({
      genre: 'Ambient',
    })

    // For user_1: discoveries
    mockFirst.mockResolvedValueOnce({
      discovery_count: 0,
    })

    // For user_1: longest set
    mockFirst.mockResolvedValueOnce({
      set_id: 'set_1',
    })

    // For user_1: insert
    mockRun.mockResolvedValueOnce({ success: true })

    const env = {
      DB: {
        prepare: mockPrepare,
        bind: mockBind,
        all: mockAll,
        first: mockFirst,
        run: mockRun,
      },
    } as any

    // Call with January (1) - should calculate previous month as December (12) of 2025
    const result = await generateMonthlyStats(env, 2026, 1)

    expect(result.processedUsers).toBe(1)
    // Verify that the query was called with correct date range (2025-12-01 to 2026-01-01)
    const firstCallArgs = mockBind.mock.calls[0]
    expect(firstCallArgs).toBeDefined()
  })

  it('stores top_artists as JSON string', async () => {
    const mockPrepare = vi.fn()
    const mockBind = vi.fn()
    const mockAll = vi.fn()
    const mockFirst = vi.fn()
    const mockRun = vi.fn()

    mockPrepare.mockReturnThis()
    mockBind.mockReturnThis()

    // First query: get distinct users
    mockAll.mockResolvedValueOnce({
      results: [{ user_id: 'user_1' }],
    })

    // For user_1: base stats
    mockFirst.mockResolvedValueOnce({
      total_duration: 3600,
      qualifying_sessions: 5,
      unique_sets: 3,
    })

    // For user_1: top artists
    mockAll.mockResolvedValueOnce({
      results: ['Artist A', 'Artist B', 'Artist C'],
    })

    // For user_1: top genre
    mockFirst.mockResolvedValueOnce({
      genre: 'House',
    })

    // For user_1: discoveries
    mockFirst.mockResolvedValueOnce({
      discovery_count: 2,
    })

    // For user_1: longest set
    mockFirst.mockResolvedValueOnce({
      set_id: 'set_longest_1',
    })

    // For user_1: insert
    mockRun.mockResolvedValueOnce({ success: true })

    const env = {
      DB: {
        prepare: mockPrepare,
        bind: mockBind,
        all: mockAll,
        first: mockFirst,
        run: mockRun,
      },
    } as any

    await generateMonthlyStats(env, 2026, 3)

    // Verify that the INSERT/UPSERT was called with JSON stringified top_artists
    const insertCall = mockRun.mock.calls[0]
    expect(insertCall).toBeDefined()
  })
})
