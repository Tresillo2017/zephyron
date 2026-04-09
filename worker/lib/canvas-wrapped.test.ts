import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock canvas before importing the module
vi.mock('@napi-rs/canvas', () => ({
  createCanvas: (width: number, height: number) => {
    const ctx = {
      createLinearGradient: () => ({
        addColorStop: vi.fn(),
      }),
      fillStyle: '',
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      font: '',
      textAlign: 'left',
      textBaseline: 'middle',
      strokeStyle: '',
      lineWidth: 0,
    }

    return {
      width,
      height,
      getContext: () => ctx,
      toBuffer: (format: string) => Buffer.from('fake-png-data'),
    }
  },
  GlobalFonts: {
    registerFromPath: vi.fn(),
  },
  Image: class {},
}))

import { generateWrappedImage } from './canvas-wrapped'

describe('Canvas Wrapped Image Generation', () => {
  let mockEnv: any

  beforeEach(() => {
    mockEnv = {
      WRAPPED_IMAGES: {
        put: vi.fn(async () => ({})),
      },
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('generateWrappedImage', () => {
    it('generates PNG with correct R2 key pattern', async () => {
      const stats = {
        year: 2025,
        total_seconds: 3600 * 150, // 150 hours
        top_artists: JSON.stringify(['Artist A', 'Artist B', 'Artist C']),
        top_genre: 'Techno',
        longest_streak_days: 14,
        discoveries_count: 23,
      }

      const result = await generateWrappedImage('user-123', stats, mockEnv as any)

      expect(result.success).toBe(true)
      expect(result.r2_key).toBe('wrapped/2025/user-123.png')
      expect(mockEnv.WRAPPED_IMAGES.put).toHaveBeenCalled()

      const callArgs = mockEnv.WRAPPED_IMAGES.put.mock.calls[0]
      expect(callArgs[0]).toBe('wrapped/2025/user-123.png')
      expect(callArgs[1]).toBeDefined() // Buffer
    })

    it('handles missing/empty stats gracefully', async () => {
      const stats = {
        year: 2025,
        total_seconds: 0,
        top_artists: '[]',
        top_genre: null,
        longest_streak_days: 0,
        discoveries_count: 0,
      }

      const result = await generateWrappedImage('user-456', stats, mockEnv as any)

      expect(result.success).toBe(true)
      expect(result.r2_key).toBe('wrapped/2025/user-456.png')
      expect(mockEnv.WRAPPED_IMAGES.put).toHaveBeenCalled()
    })

    it('handles invalid JSON in top_artists gracefully', async () => {
      const stats = {
        year: 2025,
        total_seconds: 3600,
        top_artists: 'invalid json',
        top_genre: 'House',
        longest_streak_days: 5,
        discoveries_count: 10,
      }

      const result = await generateWrappedImage('user-789', stats, mockEnv as any)

      expect(result.success).toBe(true)
      expect(result.r2_key).toBe('wrapped/2025/user-789.png')
      expect(mockEnv.WRAPPED_IMAGES.put).toHaveBeenCalled()
    })
  })
})
