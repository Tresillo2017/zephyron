import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { signIn, authClient } from '../lib/auth-client'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Logo } from '../components/ui/Logo'

type Step = 'login' | 'forgot' | 'sent'

export function LoginPage() {
  const [step, setStep] = useState<Step>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const result = await signIn.email({ email, password })
      if (result.error) {
        setError(result.error.message || 'Sign in failed')
      } else {
        navigate('/app')
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

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-10 lg:hidden no-underline">
            <Logo size={28} />
            <span className="text-base font-semibold text-text-primary tracking-tight">Zephyron</span>
          </Link>

          {step === 'login' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <h1 className="text-xl font-semibold text-text-primary mb-1">Welcome back</h1>
                <p className="text-sm text-text-muted mb-8">Sign in to continue listening</p>
              </div>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
              <div className="space-y-1">
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={goToForgot}
                  className="text-xs text-accent hover:text-accent-hover float-right cursor-pointer bg-transparent border-none p-0"
                >
                  Forgot password?
                </button>
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              <Button variant="primary" type="submit" disabled={isLoading} className="w-full !mt-8">
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
              <p className="text-xs text-text-muted">
                Don't have an account?{' '}
                <Link to="/register" className="text-accent hover:text-accent-hover no-underline">Request access</Link>
              </p>
            </form>
          )}

          {step === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <h1 className="text-xl font-semibold text-text-primary mb-1">Reset your password</h1>
                <p className="text-sm text-text-muted mb-8">Enter your email and we'll send a reset link.</p>
              </div>
              <Input
                label="Email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
              {error && <p className="text-xs text-danger">{error}</p>}
              <Button variant="primary" type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Sending...' : 'Send reset link'}
              </Button>
              <Button variant="ghost" type="button" onClick={goToLogin} className="w-full">
                ← Back to sign in
              </Button>
            </form>
          )}

          {step === 'sent' && (
            <div className="space-y-4 text-center">
              <div className="text-4xl mb-4">✉️</div>
              <h1 className="text-xl font-semibold text-text-primary">Check your email</h1>
              <p className="text-sm text-text-muted">
                If <strong className="text-text-secondary">{forgotEmail}</strong> is registered, you'll receive a password reset link shortly.
              </p>
              <button
                type="button"
                onClick={goToLogin}
                className="text-sm text-accent hover:text-accent-hover cursor-pointer bg-transparent border-none p-0 mt-4"
              >
                ← Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
