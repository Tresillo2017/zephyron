import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { MailSendFilled } from '@mingcute/react/core-filled'
import { signIn, authClient } from '../lib/auth-client'
import { Button, Input } from '../components/bleh'
import { AuthShell } from '../components/auth/AuthShell'
import { AuthHeading, AuthNotice, BackToSignIn, AuthLink } from '../components/auth/AuthParts'

type Step = 'login' | 'forgot' | 'sent'

export function LoginPage() {
  const [step, setStep] = useState<Step>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const result = await signIn.email({ email, password })
      if (result.error) {
        setError(result.error.message || 'Sign in failed')
      } else {
        navigate(searchParams.get('redirect') ?? '/app')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await authClient.requestPasswordReset({
        email: forgotEmail,
        redirectTo: '/reset-password',
      })
      // Swallow API-level errors (e.g. unknown email) — no user enumeration
      setStep('sent')
    } catch (_err) {
      // Only thrown on network failure — surface it
      setError(_err instanceof Error ? _err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const goToForgot = () => {
    setForgotEmail(email) // pre-fill if user already typed email
    setError(null)
    setStep('forgot')
  }

  const goToLogin = () => {
    setError(null)
    setStep('login')
  }

  return (
    <AuthShell width={420} eyebrow="Curated DJ sets">
      <div key={step} className="animate-item">
        {step === 'login' && (
          <>
            <AuthHeading title="Welcome back" subtitle="Sign in to continue listening" />
            <form onSubmit={handleSignIn} className="flex flex-col gap-3">
              <Input
                label="Email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] text-[oklch(var(--c3))]" htmlFor="login-password">Password</label>
                  <AuthLink muted small onClick={goToForgot}>Forgot password?</AuthLink>
                </div>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="ui-input"
                />
              </div>
              {error && <p role="alert" className="ui-field-msg" data-error>{error}</p>}
              <Button
                appearance="primary"
                label={isLoading ? 'Signing in...' : 'Sign in'}
                htmlButtonType="submit"
                disabled={isLoading}
                loading={isLoading}
                className="mt-1 w-full"
              />
            </form>
            <div className="as-foot">
              No account yet? <Link to="/register" className="as-link">Request access</Link>
            </div>
          </>
        )}

        {step === 'forgot' && (
          <>
            <AuthHeading title="Reset your password" subtitle="Enter your email and we'll send a reset link." />
            <form onSubmit={handleForgot} className="flex flex-col gap-3">
              <Input
                label="Email"
                name="email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                autoFocus
              />
              {error && <p role="alert" className="ui-field-msg" data-error>{error}</p>}
              <Button
                appearance="primary"
                label={isLoading ? 'Sending...' : 'Send reset link'}
                htmlButtonType="submit"
                disabled={isLoading}
                loading={isLoading}
                className="mt-1 w-full"
              />
            </form>
            <div className="as-foot">
              <BackToSignIn onClick={goToLogin} />
            </div>
          </>
        )}

        {step === 'sent' && (
          <AuthNotice
            icon={<MailSendFilled />}
            hue="hue-pos"
            title="Check your email"
            body={`If ${forgotEmail} is registered, you'll receive a password reset link shortly.`}
          >
            <BackToSignIn onClick={goToLogin} />
          </AuthNotice>
        )}
      </div>
    </AuthShell>
  )
}
