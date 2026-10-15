import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CheckCircleFilled, DeviceFilled } from '@mingcute/react/core-filled'
import { authClient } from '../lib/auth-client'
import { Button, Input } from '../components/bleh'
import { AuthShell } from '../components/auth/AuthShell'
import { AuthBadge, AuthHeading, AuthNotice } from '../components/auth/AuthParts'

export function DevicePage() {
  const [searchParams] = useSearchParams()
  const codeFromUrl = searchParams.get('user_code')?.toUpperCase().replace(/[\s-]/g, '') ?? ''

  const [rawCode, setRawCode] = useState(codeFromUrl)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const { data: session } = authClient.useSession()

  const normalizedCode = rawCode.toUpperCase().replace(/[\s-]/g, '')

  // Claim the device code when the page loads with a user_code param and user is logged in
  useEffect(() => {
    if (!session || !codeFromUrl) return
    fetch(`/api/auth/device?user_code=${encodeURIComponent(codeFromUrl)}`, {
      credentials: 'include',
    }).catch(() => {})
  }, [session, codeFromUrl])

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault()
    if (!session) return
    setStatus('loading')
    setError('')
    try {
      // Ensure the device code is claimed before approving
      await fetch(`/api/auth/device?user_code=${encodeURIComponent(normalizedCode)}`, {
        credentials: 'include',
      })
      await authClient.device.approve({ userCode: normalizedCode })
      setStatus('success')
    } catch (err: any) {
      setStatus('error')
      setError(err?.message ?? 'Invalid or expired code')
    }
  }

  if (!session) {
    return (
      <AuthShell width={420} eyebrow="Device authorization">
        <div className="animate-item">
          <AuthNotice
            icon={<DeviceFilled />}
            title="Log in to authorize a device"
            body="You need to be logged in to authorize a device."
          >
            <Link to="/login?redirect=/device" className="as-link text-sm">Log in</Link>
          </AuthNotice>
        </div>
      </AuthShell>
    )
  }

  if (status === 'success') {
    return (
      <AuthShell width={420} eyebrow="Device authorization">
        <div className="animate-item">
          <AuthNotice
            icon={<CheckCircleFilled />}
            hue="hue-pos"
            title="Device authorized"
            body="You can return to your TV."
          />
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell width={420} eyebrow="Device authorization">
      <div className="animate-item">
        <div className="mb-5">
          <AuthBadge><DeviceFilled /></AuthBadge>
        </div>
        <AuthHeading title="Authorize your TV" subtitle="Enter the code shown on your TV screen." />
        <form onSubmit={handleApprove} className="flex flex-col gap-3">
          <Input
            label="Device code"
            name="userCode"
            value={rawCode}
            onChange={e => setRawCode(e.target.value)}
            placeholder="ABCD-1234"
            maxLength={9}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="text-center font-mono text-2xl uppercase tracking-[0.2em]"
            autoFocus
          />
          {status === 'error' && <p role="alert" className="ui-field-msg" data-error>{error}</p>}
          <Button
            appearance="primary"
            label={status === 'loading' ? 'Authorizing…' : 'Authorize'}
            htmlButtonType="submit"
            loading={status === 'loading'}
            disabled={normalizedCode.length < 8 || status === 'loading'}
            className="mt-1 w-full"
          />
        </form>
      </div>
    </AuthShell>
  )
}
