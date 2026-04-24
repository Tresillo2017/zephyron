import React, { useState } from 'react'
import { Link } from 'react-router'
import { authClient } from '../lib/auth-client'

export function DevicePage() {
  const [rawCode, setRawCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const { data: session } = authClient.useSession()

  const normalizedCode = rawCode.toUpperCase().replace(/\s/g, '')


  async function handleApprove(e: React.FormEvent) {
    e.preventDefault()
    if (!session) return
    setStatus('loading')
    setError('')
    try {
      await authClient.device.approve({ userCode: normalizedCode })
      setStatus('success')
    } catch (err: any) {
      setStatus('error')
      setError(err?.message ?? 'Invalid or expired code')
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center space-y-4">
          <p className="text-text-primary text-lg">You need to be logged in to authorize a device.</p>
          <Link to="/login?redirect=/device" className="text-accent underline">Log in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-full max-w-md space-y-6 p-8 rounded-2xl bg-surface-2 shadow-lg">
        <h1 className="text-2xl font-bold text-text-primary">Authorize your TV</h1>
        <p className="text-text-secondary text-sm">
          Enter the code shown on your TV screen.
        </p>

        {status === 'success' ? (
          <div className="text-center space-y-2">
            <p className="text-green-500 text-lg font-semibold">✓ Device authorized!</p>
            <p className="text-text-secondary text-sm">You can return to your TV.</p>
          </div>
        ) : (
          <form onSubmit={handleApprove} className="space-y-4">
            <label htmlFor="device-code" className="sr-only">Device code</label>
            <input
              id="device-code"
              type="text"
              value={rawCode}
              onChange={e => setRawCode(e.target.value)}
              placeholder="ABCD-1234"
              maxLength={9}
              aria-label="Device code shown on TV"
              className="w-full px-4 py-3 rounded-lg bg-surface text-text-primary text-center text-2xl tracking-widest font-mono border border-border focus:outline-none focus:ring-2 focus:ring-accent uppercase"
              autoFocus
            />
            {status === 'error' && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
            <button
              type="submit"
              disabled={normalizedCode.length < 8 || status === 'loading'}
              className="w-full py-3 rounded-lg bg-accent text-white font-semibold disabled:opacity-50"
            >
              {status === 'loading' ? 'Authorizing…' : 'Authorize'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
