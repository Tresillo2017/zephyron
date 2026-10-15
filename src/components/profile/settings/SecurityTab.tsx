import { useEffect, useState, type FormEvent } from 'react'
import QRCode from 'react-qr-code'
import { Key2Filled, LockFilled, ShieldFilled } from '@mingcute/react/core-filled'
import { useSession, authClient } from '../../../lib/auth-client'
import { Button, Input, Section } from '../../bleh'
import { FeedbackBanner, SettingGroup, SettingRow } from './SettingPrimitives'
import type { ProfileUser } from '../profileTabs'

const ICON = 14

type Message = { type: 'success' | 'error'; text: string } | null

export function SecurityTab() {
  return (
    <>
      <ChangePasswordSection />
      <TwoFactorSection />
      <ApiKeysSection />
    </>
  )
}

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<Message>(null)

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)
    if (newPassword.length < 8) { setMessage({ type: 'error', text: 'Password must be at least 8 characters' }); return }
    if (newPassword !== confirmPassword) { setMessage({ type: 'error', text: 'Passwords do not match' }); return }
    setSaving(true)
    try {
      const { error } = await authClient.changePassword({ currentPassword, newPassword })
      if (error) {
        setMessage({ type: 'error', text: error.message || 'Failed to change password' })
      } else {
        setMessage({ type: 'success', text: 'Password changed successfully' })
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section title="Change password" icon={<LockFilled size={ICON} />}>
      <p className="setting-body">Use a strong password of at least 8 characters.</p>
      <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
        <Input type="password" label="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" autoComplete="current-password" />
        <Input type="password" label="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
        <Input type="password" label="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" autoComplete="new-password" />
        {message && <FeedbackBanner type={message.type} text={message.text} />}
        <div className="flex justify-end">
          <Button
            label={saving ? 'Saving…' : 'Update password'}
            appearance="primary"
            size="sm"
            htmlButtonType="submit"
            disabled={saving || !currentPassword || !newPassword || !confirmPassword}
          />
        </div>
      </form>
    </Section>
  )
}

type TwoFactorStep = 'idle' | 'enabling' | 'qr' | 'verify' | 'backup' | 'disabling'

function TwoFactorSection() {
  const { data: session } = useSession()
  const user = session?.user as ProfileUser | undefined
  const is2FAEnabled = user?.twoFactorEnabled

  const [step, setStep] = useState<TwoFactorStep>('idle')
  const [password, setPassword] = useState('')
  const [totpURI, setTotpURI] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [verifyCode, setVerifyCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEnable2FA = async (e: FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const { data, error: err } = await authClient.twoFactor.enable({ password, method: 'totp' })
      if (err) { setError(err.message || 'Failed to enable 2FA'); return }
      if (data && data.method === 'totp') { setTotpURI(data.totpURI); setBackupCodes(data.backupCodes); setStep('qr') }
    } catch { setError('Something went wrong') } finally { setLoading(false) }
  }

  const handleVerifyTotp = async (e: FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const { error: err } = await authClient.twoFactor.verifyTotp({ code: verifyCode })
      if (err) { setError(err.message || 'Invalid code'); return }
      setStep('backup')
    } catch { setError('Something went wrong') } finally { setLoading(false) }
  }

  const handleDisable2FA = async (e: FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const { error: err } = await authClient.twoFactor.disable({ password })
      if (err) { setError(err.message || 'Failed to disable 2FA'); return }
      setStep('idle'); setPassword('')
    } catch { setError('Something went wrong') } finally { setLoading(false) }
  }

  const resetFlow = () => { setStep('idle'); setPassword(''); setTotpURI(''); setBackupCodes([]); setVerifyCode(''); setError('') }

  return (
    <Section title="Two-factor authentication" icon={<ShieldFilled size={ICON} />}>
      <p className="setting-body">Require a verification code from your authenticator app on every sign-in.</p>
      <SettingGroup>
        <SettingRow title={is2FAEnabled ? 'Enabled' : 'Not enabled'} body={is2FAEnabled ? 'Your account requires a code at sign-in.' : 'Add a second step to sign-in with an authenticator app.'}>
          {step === 'idle' && (is2FAEnabled
            ? <Button label="Disable" appearance="danger" size="sm" onClick={() => setStep('disabling')} />
            : <Button label="Enable" appearance="primary" size="sm" onClick={() => setStep('enabling')} />)}
        </SettingRow>

        {step === 'enabling' && (
          <form onSubmit={handleEnable2FA} className="flex flex-col gap-3">
            <p className="setting-body">Confirm your password to continue.</p>
            <Input type="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" />
            {error && <FeedbackBanner type="error" text={error} />}
            <div className="flex gap-2">
              <Button label={loading ? 'Verifying…' : 'Continue'} appearance="primary" size="sm" htmlButtonType="submit" disabled={loading || !password} />
              <Button label="Cancel" appearance="ghost" size="sm" htmlButtonType="button" onClick={resetFlow} />
            </div>
          </form>
        )}

        {step === 'qr' && (
          <div className="flex flex-col gap-4">
            <p className="setting-body">Scan with Google Authenticator, Authy, 1Password, or any TOTP app.</p>
            <div className="flex justify-center">
              <div className="p-3 rounded-xl" style={{ background: '#fff', boxShadow: 'var(--card-border)' }}>
                <QRCode value={totpURI} size={168} />
              </div>
            </div>
            <form onSubmit={handleVerifyTotp} className="flex flex-col gap-3">
              <Input
                label="6-digit code"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000 000"
                className="font-mono text-center tracking-[0.4em] text-lg"
                maxLength={6}
                autoComplete="one-time-code"
              />
              {error && <FeedbackBanner type="error" text={error} />}
              <div className="flex gap-2">
                <Button label={loading ? 'Verifying…' : 'Verify & enable'} appearance="primary" size="sm" htmlButtonType="submit" disabled={loading || verifyCode.length !== 6} />
                <Button label="Cancel" appearance="ghost" size="sm" htmlButtonType="button" onClick={resetFlow} />
              </div>
            </form>
          </div>
        )}

        {step === 'backup' && (
          <div className="flex flex-col gap-4">
            <FeedbackBanner type="success" text="2FA is now enabled. Save these backup codes — each can only be used once." />
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code) => (
                <code key={code} className="setting-code">{code}</code>
              ))}
            </div>
            <div>
              <Button label="Done" appearance="primary" size="sm" htmlButtonType="button" onClick={resetFlow} />
            </div>
          </div>
        )}

        {step === 'disabling' && (
          <form onSubmit={handleDisable2FA} className="flex flex-col gap-3">
            <p className="setting-body">Enter your password to disable two-factor authentication.</p>
            <Input type="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" />
            {error && <FeedbackBanner type="error" text={error} />}
            <div className="flex gap-2">
              <Button label={loading ? 'Disabling…' : 'Disable 2FA'} appearance="danger" size="sm" htmlButtonType="submit" disabled={loading || !password} />
              <Button label="Cancel" appearance="ghost" size="sm" htmlButtonType="button" onClick={resetFlow} />
            </div>
          </form>
        )}
      </SettingGroup>
    </Section>
  )
}

interface ApiKey {
  id: string
  name: string | null
  start: string | null
  createdAt: string
  expiresAt: string | null
  enabled: boolean
}

const formatKeyDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('Browser Extension')
  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const loadKeys = async () => {
    try {
      const { data, error: err } = await (authClient.apiKey as any).list()
      if (err) { setError(err.message || 'Failed to load API keys'); return }
      setKeys(data || [])
    } catch { setError('Failed to load API keys') } finally { setLoading(false) }
  }

  useEffect(() => { loadKeys() }, [])

  const handleCreate = async () => {
    setCreating(true); setError('')
    try {
      const { data, error: err } = await (authClient.apiKey as any).create({ name: newKeyName.trim() || 'API Key' })
      if (err) { setError(err.message || 'Failed to create API key'); return }
      setNewKey(data.key); loadKeys()
    } catch { setError('Failed to create API key') } finally { setCreating(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      await (authClient.apiKey as any).delete({ keyId: id })
      setKeys((prev) => prev.filter((k) => k.id !== id))
    } catch { setError('Failed to delete API key') }
  }

  const handleCopy = () => {
    if (!newKey) return
    navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Section title="API keys" icon={<Key2Filled size={ICON} />}>
      <p className="setting-body">Keys for the browser extension and external integrations.</p>
      <SettingGroup>
        {newKey && (
          <div className="flex flex-col gap-3">
            <p className="setting-body" style={{ color: 'oklch(var(--h3))' }}>Copy your key now — it won&apos;t be shown again</p>
            <div className="flex items-center gap-2">
              <code className="setting-code flex-1 text-left break-all">{newKey}</code>
              <Button label={copied ? 'Copied!' : 'Copy'} size="sm" htmlButtonType="button" onClick={handleCopy} />
            </div>
            <div>
              <Button label="Done" appearance="ghost" size="sm" htmlButtonType="button" onClick={() => { setNewKey(null); setShowCreate(false) }} />
            </div>
          </div>
        )}

        {showCreate && !newKey && (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input label="Key name" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g. Browser Extension" />
            </div>
            <Button label={creating ? 'Creating…' : 'Create'} appearance="primary" size="sm" htmlButtonType="button" onClick={handleCreate} disabled={creating} />
            <Button label="Cancel" appearance="ghost" size="sm" htmlButtonType="button" onClick={() => setShowCreate(false)} />
          </div>
        )}

        {error && <FeedbackBanner type="error" text={error} />}

        {loading ? (
          <p className="setting-body">Loading…</p>
        ) : keys.length > 0 ? (
          <div className="flex flex-col gap-2">
            {keys.map((key) => (
              <div key={key.id} className="setting-key-row">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: 'oklch(var(--c1))' }}>{key.name || 'Unnamed key'}</p>
                  <p className="text-[11px] font-mono mt-0.5" style={{ color: 'oklch(var(--c3))' }}>
                    {key.start ? `${key.start}••••••••` : '••••••••'}
                    {' · '}
                    {formatKeyDate(key.createdAt)}
                    {key.expiresAt && ` · Expires ${formatKeyDate(key.expiresAt)}`}
                  </p>
                </div>
                <Button label="Revoke" appearance="danger" size="sm" htmlButtonType="button" onClick={() => handleDelete(key.id)} />
              </div>
            ))}
          </div>
        ) : !showCreate && !newKey ? (
          <p className="setting-body">No API keys yet.</p>
        ) : null}

        {!showCreate && !newKey && (
          <div>
            <Button label="New key" size="sm" htmlButtonType="button" onClick={() => setShowCreate(true)} />
          </div>
        )}
      </SettingGroup>
    </Section>
  )
}
