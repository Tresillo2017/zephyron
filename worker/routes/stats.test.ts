import { getStats } from './stats'
import { describe, it, expect, beforeEach } from 'vitest'
import type { GetStatsResponse, GetStatsError } from '../types'

describe('getStats', () => {
  let mockEnv: Env
  let mockRequest: Request

  beforeEach(() => {
    mockEnv = {
      DB: {
        prepare: (query: string) => {
          // Mock user check
          if (query.includes('SELECT id')) {
            return {
              bind: () => ({
                first: async () => ({ id: 'user123', is_profile_public: 1 })
              })
            }
          }
          // Mock listening history for heatmap/weekday
          if (query.includes('listening_sessions') && query.includes('started_at')) {
            return {
              bind: () => ({
                all: async () => ({
                  results: [
                    { started_at: '2026-01-01T14:00:00Z', duration_seconds: 3600 },
                    { started_at: '2026-01-02T20:00:00Z', duration_seconds: 7200 }
                  ]
                })
              })
            }
          }
          // Mock basic stats
          if (query.includes('SUM(duration_seconds)')) {
            return {
              bind: () => ({
                first: async () => ({
                  total_hours: 100,
                  total_sessions: 50,
                  average_session_minutes: 120,
                  longest_session_minutes: 240
                })
              })
            }
          }
          // Default mock for other queries
          return {
            bind: () => ({
              first: async () => null,
              all: async () => ({ results: [] })
            })
          }
        }
      }
    } as any

    mockRequest = new Request('http://localhost/api/profile/user123/stats')
  })

  it('returns stats for valid user', async () => {
    const response = await getStats(
      mockRequest,
      mockEnv,
      {} as ExecutionContext,
      { userId: 'user12345678' }
    )

    expect(response.status).toBe(200)
    const data = await response.json() as GetStatsResponse
    expect(data.stats).toBeDefined()
    expect(data.stats.total_hours).toBeGreaterThanOrEqual(0)
    expect(data.stats.listening_heatmap).toBeDefined()
    expect(data.stats.listening_heatmap).toHaveLength(7) // 7 days
    expect(data.stats.weekday_pattern).toBeDefined()
    expect(data.stats.weekday_pattern).toHaveLength(7) // 7 days
  })

  it('returns 400 for invalid user ID format', async () => {
    const response = await getStats(
      mockRequest,
      mockEnv,
      {} as ExecutionContext,
      { userId: 'invalid!' }
    )

    expect(response.status).toBe(400)
    const data = await response.json() as GetStatsError
    expect(data.error).toBe('INVALID_USER_ID')
  })

  it('returns 404 for non-existent user', async () => {
    mockEnv.DB.prepare = (_query: string) => ({
      bind: () => ({
        first: async () => null,
        all: async () => ({ results: [] })
      })
    }) as any

    const response = await getStats(
      mockRequest,
      mockEnv,
      {} as ExecutionContext,
      { userId: 'user12345678' }
    )

    expect(response.status).toBe(404)
    const data = await response.json() as GetStatsError
    expect(data.error).toBe('USER_NOT_FOUND')
  })

  it('returns 403 for private profile', async () => {
    mockEnv.DB.prepare = ((query: string) => {
      if (query.includes('SELECT id')) {
        return {
          bind: () => ({
            first: async () => ({ id: 'user123', is_profile_public: 0 })
          })
        }
      }
      return {
        bind: () => ({
          first: async () => null,
          all: async () => ({ results: [] })
        })
      }
    }) as any

    const response = await getStats(
      mockRequest,
      mockEnv,
      {} as ExecutionContext,
      { userId: 'user12345678' }
    )

    expect(response.status).toBe(403)
    const data = await response.json() as GetStatsError
    expect(data.error).toBe('PROFILE_PRIVATE')
  })
})
