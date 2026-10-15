import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AlertFilled } from '@mingcute/react/core-filled'
import { authClient } from '../lib/auth-client'
import { Button, Input } from '../components/bleh'
import { AuthShell } from '../components/auth/AuthShell'
import { AuthHeading, AuthNotice } from '../components/auth/AuthParts'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? undefined
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isExpiredToken, setIsExpiredToken] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setConfirmError(null)
    setSubmitError(null)

    if (newPassword !== confirmPassword) {
      setConfirmError('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      const result = await authClient.resetPassword({ newPassword, token: token! })
      if (result.error) {
        const msg = (result.error.message ?? '').toLowerCase()
        if (msg.includes('expired') || msg.includes('invalid') || msg.includes('not found')) {
          setIsExpiredToken(true)
        } else {
          setSubmitError(result.error.message || 'Something went wrong. Please try again.')
        }
      } else {
        navigate('/login')
      }
    } catch (_err) {
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token || isExpiredToken) {
    return (
      <AuthShell width={420} eyebrow="Password reset">
        <div className="animate-item">
          <AuthNotice
            icon={<AlertFilled />}
            hue="hue-warn"
            title="Link expired or invalid"
            body="This password reset link has expired or is no longer valid."
          >
            <Link to="/login" className="as-link text-sm">Request a new reset link</Link>
          </AuthNotice>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell width={420} eyebrow="Password reset">
      <div className="animate-item">
        <AuthHeading title="Choose a new password" subtitle="Pick something strong." />
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            label="New password"
            name="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
            autoFocus
            minLength={8}
          />
          <Input
            label="Confirm password"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            error={confirmError ?? undefined}
          />
          {submitError && <p role="alert" className="ui-field-msg" data-error>{submitError}</p>}
          <Button
            appearance="primary"
            label={isLoading ? 'Setting password...' : 'Set new password'}
            htmlButtonType="submit"
            disabled={isLoading}
            loading={isLoading}
            className="mt-1 w-full"
          />
        </form>
      </div>
    </AuthShell>
  )
}
