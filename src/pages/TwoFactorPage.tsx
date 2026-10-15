import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Key1Filled, ShieldFilled } from '@mingcute/react/core-filled'
import { authClient } from '../lib/auth-client'
import { Button, Input } from '../components/bleh'
import { AuthShell } from '../components/auth/AuthShell'
import { AuthBadge, AuthHeading, AuthLink } from '../components/auth/AuthParts'

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

  const switchMethod = (next: Method) => {
    setMethod(next)
    setCode('')
    setError('')
  }

  const isTotp = method === 'totp'

  return (
    <AuthShell width={420} eyebrow="Two-step verification">
      <div key={method} className="animate-item">
        <div className="mb-5">
          <AuthBadge>{isTotp ? <ShieldFilled /> : <Key1Filled />}</AuthBadge>
        </div>
        <AuthHeading
          title="Two-factor authentication"
          subtitle={isTotp ? 'Enter the 6-digit code from your authenticator app' : 'Enter one of your backup codes'}
        />

        <form onSubmit={handleVerify} className="flex flex-col gap-3">
          {isTotp ? (
            <Input
              label="Authentication code"
              name="code"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="text-center font-mono text-lg tracking-[0.3em]"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
            />
          ) : (
            <Input
              label="Backup code"
              name="backupCode"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter backup code"
              className="font-mono"
              autoComplete="off"
              autoFocus
            />
          )}

          {error && <p role="alert" className="ui-field-msg" data-error>{error}</p>}

          <Button
            appearance="primary"
            label={loading ? 'Verifying...' : 'Verify'}
            htmlButtonType="submit"
            loading={loading}
            disabled={loading || (isTotp ? code.length !== 6 : !code.trim())}
            className="mt-1 w-full"
          />
        </form>

        <div className="as-foot">
          {isTotp ? (
            <AuthLink onClick={() => switchMethod('backup')}>Use a backup code instead</AuthLink>
          ) : (
            <AuthLink onClick={() => switchMethod('totp')}>Use authenticator app instead</AuthLink>
          )}
        </div>
      </div>
    </AuthShell>
  )
}
