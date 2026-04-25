import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useSession, authClient } from '../lib/auth-client'
import { Logo } from '../components/ui/Logo'

export function DeleteAccountPage() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const handleDelete = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/user/me', { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError((body as any).error || 'Failed to delete account. Please try again.')
        setLoading(false)
        return
      }
      await authClient.signOut()
      navigate('/login?deleted=1', { replace: true })
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-5 sm:px-8 py-5">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <Logo size={32} />
          <span className="text-lg font-semibold text-text-primary tracking-tight">Zephyron</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/about" className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">About</Link>
          {session ? (
            <Link to="/app/settings?tab=account" className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">Settings</Link>
          ) : (
            <Link to="/login?redirect=/delete-account" className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">Sign In</Link>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-5 sm:px-8 lg:px-16 py-12 max-w-3xl mx-auto w-full">
        {!session ? (
          <LoggedOutState />
        ) : (
          <LoggedInState
            userName={session.user.name}
            confirmText={confirmText}
            onConfirmChange={setConfirmText}
            onDelete={handleDelete}
            loading={loading}
            error={error}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="px-5 sm:px-8 py-5 border-t border-border">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-text-muted">&copy; {new Date().getFullYear()} Zephyron</p>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/privacy" className="text-text-muted hover:text-text-primary transition-colors no-underline">Privacy</Link>
            <Link to="/terms" className="text-text-muted hover:text-text-primary transition-colors no-underline">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function LoggedOutState() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2" style={{ color: 'hsl(var(--c1))' }}>Delete Account</h1>
      <p className="text-sm mb-8" style={{ color: 'hsl(var(--c3))' }}>Permanently remove your Zephyron account and all associated data.</p>

      <div
        className="rounded-xl p-5 space-y-4"
        style={{
          background: 'hsl(var(--b5))',
          boxShadow: 'var(--card-border), var(--card-shadow)',
        }}
      >
        <p className="text-sm" style={{ color: 'hsl(var(--c2))' }}>
          To delete your account, you need to be signed in. Please sign in first and you'll be brought back here to complete the process.
        </p>
        <Link
          to="/login?redirect=/delete-account"
          className="inline-flex items-center justify-center px-4 h-[var(--button-height)] rounded-[var(--button-radius)] text-sm font-[var(--font-weight-medium)] no-underline transition-all active:scale-[0.98]"
          style={{ background: 'hsl(var(--h3))', color: '#fff' }}
        >
          Sign In to Continue
        </Link>
      </div>
    </div>
  )
}

function LoggedInState({
  userName,
  confirmText,
  onConfirmChange,
  onDelete,
  loading,
  error,
}: {
  userName: string
  confirmText: string
  onConfirmChange: (v: string) => void
  onDelete: () => void
  loading: boolean
  error: string | null
}) {
  const confirmed = confirmText === 'DELETE'

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2" style={{ color: 'hsl(var(--c1))' }}>Delete Account</h1>
      <p className="text-sm mb-8" style={{ color: 'hsl(var(--c3))' }}>
        Signed in as <span style={{ color: 'hsl(var(--c1))' }}>{userName}</span>
      </p>

      {/* What gets deleted */}
      <div
        className="rounded-xl p-5 mb-5 space-y-3"
        style={{
          background: 'hsl(var(--b5))',
          boxShadow: 'var(--card-border), var(--card-shadow)',
        }}
      >
        <h2 className="text-sm font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--c1))' }}>
          What will be deleted
        </h2>
        <ul className="text-sm space-y-1.5 list-none p-0 m-0" style={{ color: 'hsl(var(--c2))' }}>
          {[
            'Your account and login credentials',
            'Listening history and playlists',
            'Liked songs',
            'Profile picture and banner',
            'Annotations and votes (anonymised, not removed)',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span style={{ color: 'hsl(0, 60%, 60%)' }}>×</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Danger zone */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{
          background: 'hsl(0, 60%, 50% / 0.05)',
          boxShadow: 'inset 0 0 0 1px hsl(0, 60%, 50% / 0.2)',
        }}
      >
        <p className="text-sm" style={{ color: 'hsl(var(--c2))' }}>
          This action is <strong style={{ color: 'hsl(0, 60%, 65%)' }}>permanent and cannot be undone</strong>. Type <code className="px-1 py-0.5 rounded text-xs" style={{ background: 'hsl(var(--b3))', color: 'hsl(var(--c1))' }}>DELETE</code> to confirm.
        </p>

        <input
          type="text"
          aria-label="Type DELETE to confirm account deletion"
          value={confirmText}
          onChange={(e) => onConfirmChange(e.target.value)}
          placeholder="Type DELETE to confirm"
          className="w-full px-3 py-2 rounded-[var(--button-radius)] text-sm focus:outline-none transition-all"
          style={{
            background: 'hsl(var(--b4) / 0.4)',
            color: 'hsl(var(--c1))',
            boxShadow: confirmed ? 'inset 0 0 0 1px hsl(0, 60%, 50% / 0.5)' : 'inset 0 0 0 1px hsl(var(--b4) / 0.4)',
          }}
          disabled={loading}
          autoComplete="off"
          spellCheck={false}
        />

        {error && (
          <p className="text-xs" style={{ color: 'hsl(0, 60%, 65%)' }}>{error}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onDelete}
            disabled={!confirmed || loading}
            className="px-4 h-[var(--button-height)] rounded-[var(--button-radius)] text-sm font-[var(--font-weight-medium)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={{
              background: confirmed ? 'hsl(0, 60%, 45%)' : 'hsl(0, 60%, 45% / 0.4)',
              color: '#fff',
            }}
          >
            {loading ? 'Deleting…' : 'Delete My Account'}
          </button>
          <Link
            to="/app/settings?tab=account"
            className="text-sm no-underline transition-colors"
            style={{ color: 'hsl(var(--c3))' }}
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
