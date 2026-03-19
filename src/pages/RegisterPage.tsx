import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { signUp } from '../lib/auth-client'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!inviteCode.trim()) {
      setError('Invite code is required for beta access')
      return
    }

    setIsLoading(true)

    try {
      const result = await signUp.email({
        name,
        email,
        password,
        inviteCode: inviteCode.trim().toUpperCase(),
      } as any)

      if (result.error) {
        setError(result.error.message || 'Registration failed')
      } else {
        navigate('/app')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
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
            <div className="w-8 h-8 bg-accent/90 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 text-white" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-text-primary tracking-tight">Zephyron</span>
          </Link>
          <p className="text-2xl font-semibold text-text-primary leading-snug mb-3">
            Join the beta
          </p>
          <p className="text-sm text-text-muted">
            Invite-only access to the future of DJ set streaming.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-10 lg:hidden no-underline">
            <div className="w-7 h-7 bg-accent/90 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
            <span className="text-base font-semibold text-text-primary tracking-tight">Zephyron</span>
          </Link>

          <h1 className="text-xl font-semibold text-text-primary mb-1">Get beta access</h1>
          <p className="text-sm text-text-muted mb-8">Enter your invite code to create an account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Invite code — visually distinct */}
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1.5">Invite Code</label>
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="ABCD1234"
                required
                className="w-full px-4 py-3 bg-surface-overlay border border-accent/30 rounded-lg text-sm text-text-primary font-mono text-center tracking-[0.25em] uppercase placeholder:text-text-muted placeholder:tracking-[0.25em] focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors"
              />
            </div>

            <div className="h-px bg-border my-2" />

            <Input label="Display Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required />

            {error && <p className="text-xs text-danger">{error}</p>}

            <Button variant="primary" type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <p className="text-xs text-text-muted mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:text-accent-hover no-underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
