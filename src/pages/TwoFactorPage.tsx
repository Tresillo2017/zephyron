import { useState } from 'react'
import { useNavigate } from 'react-router'
import { authClient } from '../lib/auth-client'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

type Method = 'totp' | 'backup'

export function TwoFactorPage() {
  const navigate = useNavigate()
  const [method, setMethod] = useState<Method>('totp')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (method === 'totp') {
        const { error: err } = await authClient.twoFactor.verifyTotp({
          code,
          trustDevice: true,
        })
        if (err) {
          setError(err.message || 'Invalid code')
          setLoading(false)
          return
        }
      } else {
        const { error: err } = await authClient.twoFactor.verifyBackupCode({
          code,
          trustDevice: true,
        })
        if (err) {
          setError(err.message || 'Invalid backup code')
          setLoading(false)
          return
        }
      }

      navigate('/app', { replace: true })
    } catch {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-accent/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-text-primary">Two-Factor Authentication</h1>
          <p className="text-sm text-text-secondary mt-1">
            {method === 'totp'
              ? 'Enter the 6-digit code from your authenticator app'
              : 'Enter one of your backup codes'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="bg-surface-raised border border-border rounded-lg p-5 space-y-4">
            {method === 'totp' ? (
              <Input
                label="Authentication Code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="font-mono text-center tracking-[0.3em] text-lg"
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
              />
            ) : (
              <Input
                label="Backup Code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter backup code"
                className="font-mono"
                autoFocus
              />
            )}

            {error && <p className="text-xs text-danger">{error}</p>}

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              disabled={loading || (method === 'totp' ? code.length !== 6 : !code.trim())}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
          </div>
        </form>

        {/* Toggle method */}
        <div className="text-center mt-4">
          {method === 'totp' ? (
            <button
              onClick={() => { setMethod('backup'); setCode(''); setError('') }}
              className="text-xs text-text-muted hover:text-accent transition-colors cursor-pointer"
            >
              Use a backup code instead
            </button>
          ) : (
            <button
              onClick={() => { setMethod('totp'); setCode(''); setError('') }}
              className="text-xs text-text-muted hover:text-accent transition-colors cursor-pointer"
            >
              Use authenticator app instead
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
