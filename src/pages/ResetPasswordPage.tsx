import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { authClient } from '../lib/auth-client'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Logo } from '../components/ui/Logo'

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

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-2/5 bg-surface-raised border-r border-border items-end p-12 relative overflow-hidden">
        <div className="absolute top-1/3 -right-20 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[80px]" />
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2.5 mb-12 no-underline">
            <Logo size={32} />
            <span className="text-lg font-semibold text-text-primary tracking-tight">Zephyron</span>
          </Link>
          <p className="text-2xl font-semibold text-text-primary leading-snug mb-3">
            The platform for<br />curated DJ sets
          </p>
          <p className="text-sm text-text-muted">
            AI-powered tracklists. Community-verified.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-10 lg:hidden no-underline">
            <Logo size={28} />
            <span className="text-base font-semibold text-text-primary tracking-tight">Zephyron</span>
          </Link>

          {!token || isExpiredToken ? (
            <div
              className="rounded-xl p-5 space-y-3"
              style={{ background: 'hsl(0 60% 50% / 0.08)', boxShadow: 'inset 0 0 0 1px hsl(0 60% 50% / 0.2)' }}
            >
              <p className="text-sm font-semibold text-text-primary">Link expired or invalid</p>
              <p className="text-sm text-text-muted">This password reset link has expired or is no longer valid.</p>
              <Link
                to="/login"
                className="text-sm text-accent hover:text-accent-hover no-underline"
              >
                Request a new reset link →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h1 className="text-xl font-semibold text-text-primary mb-1">Choose a new password</h1>
                <p className="text-sm text-text-muted mb-8">Pick something strong.</p>
              </div>
              <Input
                label="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
                minLength={8}
              />
              <Input
                label="Confirm password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                error={confirmError ?? undefined}
              />
              {submitError && (
                <p className="text-xs text-danger">{submitError}</p>
              )}
              <Button variant="primary" type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Setting password...' : 'Set new password'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
