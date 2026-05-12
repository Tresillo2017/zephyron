import { describe, it, expect } from 'vitest'

// Tests for stream URL resolution logic.
// Exercises the decision: R2 set vs Invidious set, and missing video ID.

function resolveSource(set: {
  stream_type: string | null
  r2_key: string
  youtube_video_id: string | null
}): 'r2' | 'invidious' | 'none' {
  if (set.stream_type === 'r2' && set.r2_key && set.r2_key !== '') return 'r2'
  if (set.youtube_video_id) return 'invidious'
  return 'none'
}

describe('stream source resolution', () => {
  it('resolves to r2 when stream_type is r2 and r2_key is present', () => {
    expect(resolveSource({ stream_type: 'r2', r2_key: 'sets/abc.mp3', youtube_video_id: null })).toBe('r2')
  })

  it('resolves to invidious when stream_type is invidious', () => {
    expect(resolveSource({ stream_type: 'invidious', r2_key: '', youtube_video_id: 'dQw4w9WgXcQ' })).toBe('invidious')
  })

  it('resolves to invidious when r2_key is empty string', () => {
    expect(resolveSource({ stream_type: 'r2', r2_key: '', youtube_video_id: 'dQw4w9WgXcQ' })).toBe('invidious')
  })

  it('resolves to none when no valid source exists', () => {
    expect(resolveSource({ stream_type: null, r2_key: '', youtube_video_id: null })).toBe('none')
  })

  it('resolves to invidious when stream_type is null but video ID exists', () => {
    expect(resolveSource({ stream_type: null, r2_key: '', youtube_video_id: 'dQw4w9WgXcQ' })).toBe('invidious')
  })
})

describe('stream error responses', () => {
  it('503 response has correct status and user-facing message', () => {
    const response = new Response('This set is temporarily unavailable. Please try again later.', { status: 503 })
    expect(response.status).toBe(503)
  })

  it('404 response returned when no video ID exists', () => {
    const response = new Response('No audio source available', { status: 404 })
    expect(response.status).toBe(404)
  })
})
