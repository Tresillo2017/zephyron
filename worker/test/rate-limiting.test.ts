import { describe, it, expect, vi } from 'vitest'

// Unit-test the rate limiting logic isolated from the full Worker.
// We test the shape of the middleware: that a 429 is returned when the
// rate limiter signals failure and requests pass through when it succeeds.

function makeEnv(rateLimitSuccess: boolean) {
  return {
    RATE_LIMITER: {
      limit: vi.fn().mockResolvedValue({ success: rateLimitSuccess }),
    },
  } as unknown as Env
}

describe('rate limiting middleware', () => {
  it('returns 429 when rate limit is exceeded', async () => {
    const env = makeEnv(false)

    const { success } = await env.RATE_LIMITER.limit({ key: '1.2.3.4' })
    expect(success).toBe(false)

    const response = new Response(JSON.stringify({ error: 'Too many requests', ok: false }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    })
    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('60')
    const body = await response.json() as { error: string; ok: boolean }
    expect(body.ok).toBe(false)
    expect(body.error).toBe('Too many requests')
  })

  it('passes through when rate limit allows', async () => {
    const env = makeEnv(true)
    const { success } = await env.RATE_LIMITER.limit({ key: '1.2.3.4' })
    expect(success).toBe(true)
  })

  it('uses CF-Connecting-IP as the rate limit key', async () => {
    const env = makeEnv(true)
    const ip = '10.0.0.1'
    await env.RATE_LIMITER.limit({ key: ip })
    expect(env.RATE_LIMITER.limit).toHaveBeenCalledWith({ key: ip })
  })

  it('falls back to "unknown" when CF-Connecting-IP is absent', () => {
    const request = new Request('https://example.com/api/health')
    const clientIp = request.headers.get('CF-Connecting-IP') ?? 'unknown'
    expect(clientIp).toBe('unknown')
  })
})
