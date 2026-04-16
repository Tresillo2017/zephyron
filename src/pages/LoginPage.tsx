import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { signIn } from '../lib/auth-client'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Logo } from '../components/ui/Logo'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
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

          <h1 className="text-xl font-semibold text-text-primary mb-1">Welcome back</h1>
          <p className="text-sm text-text-muted mb-8">Sign in to continue listening</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

            {error && <p className="text-xs text-danger">{error}</p>}

            <Button variant="primary" type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-xs text-text-muted mt-8">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent hover:text-accent-hover no-underline">Request access</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
