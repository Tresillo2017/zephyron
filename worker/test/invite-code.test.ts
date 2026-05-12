import { describe, it, expect } from 'vitest'

// Tests for invite code validation logic extracted from auth.ts database hook.
// The hook validates: code exists, not exhausted, not expired.

interface InviteCode {
  id: string
  max_uses: number
  used_count: number
  expires_at: string | null
}

function validateInviteCode(
  code: InviteCode | null,
  now: Date = new Date()
): { valid: boolean; error?: string } {
  if (!code) return { valid: false, error: 'Invalid invite code' }
  if (code.max_uses > 0 && code.used_count >= code.max_uses) {
    return { valid: false, error: 'Invite code has been fully used' }
  }
  if (code.expires_at && new Date(code.expires_at) < now) {
    return { valid: false, error: 'Invite code has expired' }
  }
  return { valid: true }
}

describe('invite code validation', () => {
  it('rejects when code does not exist', () => {
    const result = validateInviteCode(null)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Invalid invite code')
  })

  it('accepts a valid unused code with no expiry', () => {
    const code: InviteCode = { id: '1', max_uses: 5, used_count: 0, expires_at: null }
    expect(validateInviteCode(code).valid).toBe(true)
  })

  it('rejects when used_count has reached max_uses', () => {
    const code: InviteCode = { id: '1', max_uses: 3, used_count: 3, expires_at: null }
    const result = validateInviteCode(code)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Invite code has been fully used')
  })

  it('accepts when max_uses is 0 (unlimited)', () => {
    const code: InviteCode = { id: '1', max_uses: 0, used_count: 9999, expires_at: null }
    expect(validateInviteCode(code).valid).toBe(true)
  })

  it('rejects when code is expired', () => {
    const code: InviteCode = {
      id: '1',
      max_uses: 0,
      used_count: 0,
      expires_at: '2020-01-01T00:00:00.000Z',
    }
    expect(validateInviteCode(code).valid).toBe(false)
    expect(validateInviteCode(code).error).toBe('Invite code has expired')
  })

  it('accepts when expiry is in the future', () => {
    const future = new Date(Date.now() + 1_000_000).toISOString()
    const code: InviteCode = { id: '1', max_uses: 0, used_count: 0, expires_at: future }
    expect(validateInviteCode(code).valid).toBe(true)
  })
})
