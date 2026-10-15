import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { signUp } from '../lib/auth-client'
import { Button, Input } from '../components/bleh'
import { AuthShell } from '../components/auth/AuthShell'
import { AuthHeading } from '../components/auth/AuthParts'

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
    <AuthShell width={420} eyebrow="Invite-only beta">
      <div className="animate-item">
        <AuthHeading title="Get beta access" subtitle="Enter your invite code to create an account" />

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            label="Invite code"
            name="inviteCode"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="ABCD1234"
            autoComplete="off"
            required
            className="text-center font-mono uppercase tracking-[0.25em] placeholder:tracking-[0.25em]"
          />

          <Input label="Display name" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" required />
          <Input label="Email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
          <Input label="Password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" required />

          {error && <p role="alert" className="ui-field-msg" data-error>{error}</p>}

          <Button
            appearance="primary"
            label={isLoading ? 'Creating account...' : 'Create account'}
            htmlButtonType="submit"
            disabled={isLoading}
            loading={isLoading}
            className="mt-1 w-full"
          />
        </form>

        <div className="as-foot">
          Already have an account? <Link to="/login" className="as-link">Sign in</Link>
        </div>
      </div>
    </AuthShell>
  )
}
