import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useSession, authClient } from '../lib/auth-client'
import { Button, Input, Spinner } from '../components/bleh'
import { PublicFrame, LegalDoc } from '../components/public/PublicFrame'

const DELETED_ITEMS = [
  'Your account and login credentials',
  'Listening history and playlists',
  'Liked songs',
  'Profile picture and banner',
  'Annotations and votes (anonymised, not removed)',
]

export function DeleteAccountPage() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <PublicFrame>
      {isPending ? (
        <div className="flex justify-center py-16" role="status" aria-label="Loading">
          <Spinner size={24} />
        </div>
      ) : (
        <LegalDoc title="Delete account">
          {session ? (
            <DeleteSteps
              userName={session.user.name}
              confirmText={confirmText}
              onConfirmChange={setConfirmText}
              onDelete={handleDelete}
              loading={loading}
              error={error}
            />
          ) : (
            <LoggedOutState />
          )}
        </LegalDoc>
      )}
    </PublicFrame>
  )
}

function LoggedOutState() {
  return (
    <section className="cc-card pf-card">
      <p>To delete your account, you need to be signed in. Please sign in first and you'll be brought back here to complete the process.</p>
      <Button to="/login?redirect=/delete-account" appearance="primary" label="Sign in to continue" />
    </section>
  )
}

function DeleteSteps({
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
    <>
      <p className="pf-lede">
        Signed in as <span className="pf-strong">{userName}</span>
      </p>

      <section className="cc-card pf-card">
        <h2>What will be deleted</h2>
        <ul className="pf-list">
          {DELETED_ITEMS.map((item) => (
            <li key={item}>
              <span className="pf-cross" aria-hidden="true">×</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="pf-card pf-danger">
        <p>
          This action is <strong>permanent and cannot be undone</strong>. Type <code>DELETE</code> to confirm.
        </p>
        <Input
          label="Confirmation"
          name="confirm"
          value={confirmText}
          onChange={(e) => onConfirmChange(e.target.value)}
          placeholder="Type DELETE to confirm"
          disabled={loading}
          autoComplete="off"
          spellCheck={false}
        />
        {error && <p role="alert" className="ui-field-msg" data-error>{error}</p>}
        <div className="flex items-center gap-4">
          <Button
            appearance="danger-primary"
            label={loading ? 'Deleting…' : 'Delete my account'}
            onClick={onDelete}
            disabled={!confirmed || loading}
            loading={loading}
          />
          <Link to="/app/profile?tab=account" className="as-link text-sm">Cancel</Link>
        </div>
      </section>
    </>
  )
}
