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
    <div className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 justify-center mb-8 no-underline">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-black" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-text-primary tracking-tight">Zephyron</span>
        </Link>

        <h1 className="text-2xl font-bold text-text-primary text-center mb-2">Get Beta Access</h1>
        <p className="text-sm text-text-secondary text-center mb-8">Enter your invite code to create an account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Invite Code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="ABCD1234"
            className="font-mono text-center tracking-widest uppercase"
            required
          />
          <Input
            label="Display Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
          />

          {error && <p className="text-xs text-danger">{error}</p>}

          <Button variant="primary" type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <p className="text-xs text-text-muted text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline no-underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
