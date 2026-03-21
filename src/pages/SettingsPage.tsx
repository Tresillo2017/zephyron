import { useState } from 'react'
import { useSearchParams, Link } from 'react-router'
import { useSession, authClient } from '../lib/auth-client'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { useThemeStore, ACCENTS } from '../stores/themeStore'
import QRCode from 'react-qr-code'

type Tab = 'profile' | 'visual' | 'security' | 'account'

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (searchParams.get('tab') as Tab) || 'profile'

  const setTab = (tab: Tab) => {
    setSearchParams({ tab })
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'visual', label: 'Visual' },
    { id: 'security', label: 'Security' },
    { id: 'account', label: 'Account' },
  ]

  return (
    <div className="px-6 lg:px-10 py-6">
      {/* Two-column layout: tabs on left, content fills */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Left: tab navigation (vertical on desktop) */}
        <div className="lg:w-[200px] shrink-0">
          <h1 className="text-lg font-[var(--font-weight-bold)] text-text-primary mb-4">Settings</h1>
          <div className="flex lg:flex-col gap-0.5 overflow-x-auto lg:overflow-visible">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`px-3 py-2 rounded-lg text-sm text-left whitespace-nowrap cursor-pointer transition-colors ${
                  activeTab === tab.id
                    ? 'text-accent bg-accent/10'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                }`}
                style={{ transitionDuration: 'var(--trans)', transitionTimingFunction: 'var(--ease-out-custom)' }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: content */}
        <div className="flex-1 min-w-0 max-w-2xl">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'visual' && <VisualTab />}
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'account' && <AccountTab />}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── Visual Tab ─────────────────────────── */

function VisualTab() {
  const { theme, accent, customHue, setTheme, setAccent, setCustomHue } = useThemeStore()

  const themeCards: { id: string; label: string; bg: string; fg: string; text: string }[] = [
    { id: 'dark', label: 'Dark', bg: 'hsl(255,4%,14%)', fg: 'hsl(255,5%,18%)', text: 'hsl(255,30%,87%)' },
    { id: 'darker', label: 'Darker', bg: 'hsl(255,3%,6%)', fg: 'hsl(255,4%,9%)', text: 'hsl(255,30%,87%)' },
    { id: 'oled', label: 'OLED', bg: '#000', fg: 'hsl(255,3%,4%)', text: 'hsl(255,30%,87%)' },
    { id: 'light', label: 'Light', bg: 'hsl(255,5%,94%)', fg: '#fff', text: 'hsl(255,4%,6%)' },
  ]

  return (
    <div className="space-y-0">

      {/* ── Appearance section ── */}
      <div className="card">
        <h3 className="text-sm font-[var(--font-weight-bold)] text-accent mb-5 px-[var(--card-padding)] pt-[var(--card-padding)]">Appearance</h3>

        {/* Themes */}
        <SettingRow label="Themes" noBorder>
          <div className="flex gap-3 flex-wrap">
            {themeCards.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as any)}
                className="flex flex-col items-center gap-1.5 cursor-pointer group"
              >
                <div
                  className={`w-[52px] h-[40px] rounded-lg flex items-center justify-center text-sm font-[var(--font-weight-bold)] transition-all ${
                    theme === t.id ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface' : 'group-hover:scale-105'
                  }`}
                  style={{ background: t.bg, color: t.text, boxShadow: 'var(--card-border)' }}
                >
                  Aa
                </div>
                <span className={`text-[11px] ${theme === t.id ? 'text-text-primary' : 'text-text-muted'}`}>{t.label}</span>
              </button>
            ))}
          </div>
        </SettingRow>

        {/* Accent colour */}
        <SettingRow label="Accent colour">
          <div className="flex items-center gap-2 flex-wrap">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAccent(a.id as any)}
                className={`w-[28px] h-[28px] rounded-full cursor-pointer transition-all ${
                  accent === a.id && customHue === null ? 'ring-2 ring-white scale-110' : 'hover:scale-110'
                }`}
                style={{ background: `hsl(${a.hue}, 60%, 55%)` }}
                title={a.label}
              />
            ))}
          </div>
        </SettingRow>

        {/* Custom hue slider */}
        <SettingRow label="Custom accent hue" description="Fine-tune the exact hue value">
          <div className="flex items-center gap-3 w-full max-w-[300px]">
            <input
              type="range"
              min={0}
              max={360}
              value={customHue ?? 255}
              onChange={(e) => setCustomHue(parseInt(e.target.value))}
              className="flex-1 h-[6px] rounded-full appearance-none cursor-pointer"
              style={{
                background: 'linear-gradient(to right, hsl(0,70%,55%), hsl(60,70%,55%), hsl(120,70%,55%), hsl(180,70%,55%), hsl(240,70%,55%), hsl(300,70%,55%), hsl(360,70%,55%))',
              }}
            />
            <span className="text-xs font-mono text-text-muted w-8 text-right">{customHue ?? 255}</span>
          </div>
        </SettingRow>
      </div>

      {/* ── Fonts section ── */}
      <div className="card mt-5">
        <h3 className="text-sm font-[var(--font-weight-bold)] text-accent mb-5 px-[var(--card-padding)] pt-[var(--card-padding)]">Fonts</h3>

        {/* Font preview */}
        <div className="mx-[var(--card-padding)] mb-5 bg-[hsl(var(--b4)/0.3)] rounded-lg p-5 text-center">
          <p className="text-xl text-text-primary" style={{ fontWeight: 'var(--font-weight)' as any }}>
            The quick brown fox jumps over the lazy dog
          </p>
        </div>

        <SettingRow label="Font weight" description="Used for regular text paragraphs">
          <div className="flex items-center gap-3 w-full max-w-[300px]">
            <input
              type="range" min={300} max={700} step={10}
              value={parseInt(getComputedStyle(document.documentElement).getPropertyValue('--font-weight')) || 480}
              onChange={(e) => document.documentElement.style.setProperty('--font-weight', e.target.value)}
              className="flex-1 h-[6px] rounded-full appearance-none cursor-pointer bg-[hsl(var(--b3))]"
            />
            <span className="text-xs font-mono text-text-muted w-8 text-right">
              {parseInt(getComputedStyle(document.documentElement).getPropertyValue('--font-weight')) || 480}
            </span>
          </div>
        </SettingRow>

        <SettingRow label="Medium font weight" description="Used for button text and small headers">
          <div className="flex items-center gap-3 w-full max-w-[300px]">
            <input
              type="range" min={400} max={800} step={10}
              value={parseInt(getComputedStyle(document.documentElement).getPropertyValue('--font-weight-medium')) || 650}
              onChange={(e) => document.documentElement.style.setProperty('--font-weight-medium', e.target.value)}
              className="flex-1 h-[6px] rounded-full appearance-none cursor-pointer bg-[hsl(var(--b3))]"
            />
            <span className="text-xs font-mono text-text-muted w-8 text-right">
              {parseInt(getComputedStyle(document.documentElement).getPropertyValue('--font-weight-medium')) || 650}
            </span>
          </div>
        </SettingRow>

        <SettingRow label="Bold font weight" description="Used for large headers" noBorder>
          <div className="flex items-center gap-3 w-full max-w-[300px]">
            <input
              type="range" min={500} max={900} step={10}
              value={parseInt(getComputedStyle(document.documentElement).getPropertyValue('--font-weight-bold')) || 730}
              onChange={(e) => document.documentElement.style.setProperty('--font-weight-bold', e.target.value)}
              className="flex-1 h-[6px] rounded-full appearance-none cursor-pointer bg-[hsl(var(--b3))]"
            />
            <span className="text-xs font-mono text-text-muted w-8 text-right">
              {parseInt(getComputedStyle(document.documentElement).getPropertyValue('--font-weight-bold')) || 730}
            </span>
          </div>
        </SettingRow>
      </div>
    </div>
  )
}

/** A single settings row — label/description on left, control on right */
function SettingRow({ label, description, children, noBorder }: {
  label: string
  description?: string
  children: React.ReactNode
  noBorder?: boolean
}) {
  return (
    <div className={`flex items-center justify-between gap-4 px-[var(--card-padding)] py-3.5 ${
      noBorder ? 'pb-[var(--card-padding)]' : ''
    }`}>
      <div className="min-w-0">
        <p className="text-sm text-text-primary font-[var(--font-weight-medium)]">{label}</p>
        {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0 flex items-center">
        {children}
      </div>
    </div>
  )
}

/* ─────────────────────────── Profile Tab ─────────────────────────── */

function ProfileTab() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || name === user?.name) return

    setSaving(true)
    setMessage(null)

    try {
      const { error } = await authClient.updateUser({
        name: name.trim(),
      })

      if (error) {
        setMessage({ type: 'error', text: error.message || 'Failed to update name' })
      } else {
        setMessage({ type: 'success', text: 'Name updated successfully' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Avatar + basic info */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-accent/15 rounded-full flex items-center justify-center text-accent text-2xl font-bold">
          {user?.name?.charAt(0).toUpperCase() || '?'}
        </div>
        <div>
          <p className="text-lg font-semibold text-text-primary">{user?.name}</p>
          <p className="text-sm text-text-secondary">{user?.email}</p>
        </div>
      </div>

      {/* Edit name */}
      <form onSubmit={handleUpdateName} className="space-y-4">
        <div className="bg-surface-raised border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">Display Name</h3>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your display name"
          />
          {message && (
            <p className={`text-xs ${message.type === 'success' ? 'text-accent' : 'text-danger'}`}>
              {message.text}
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="sm" disabled={saving || name === user?.name}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </form>

      {/* Email info */}
      <div className="bg-surface-raised border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-1">Email Address</h3>
        <p className="text-sm text-text-secondary">{user?.email}</p>
        <p className="text-xs text-text-muted mt-2">
          Contact support to change your email address.
        </p>
      </div>
    </div>
  )
}

/* ─────────────────────────── Security Tab ─────────────────────────── */

function SecurityTab() {
  return (
    <div className="space-y-8">
      <ChangePasswordSection />
      <TwoFactorSection />
    </div>
  )
}

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    setSaving(true)

    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
      })

      if (error) {
        setMessage({ type: 'error', text: error.message || 'Failed to change password' })
      } else {
        setMessage({ type: 'success', text: 'Password changed successfully' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleChangePassword}>
      <div className="bg-surface-raised border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-text-primary">Change Password</h3>
        <Input
          type="password"
          label="Current Password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Enter current password"
          autoComplete="current-password"
        />
        <Input
          type="password"
          label="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
        <Input
          type="password"
          label="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat new password"
          autoComplete="new-password"
        />
        {message && (
          <p className={`text-xs ${message.type === 'success' ? 'text-accent' : 'text-danger'}`}>
            {message.text}
          </p>
        )}
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={saving || !currentPassword || !newPassword || !confirmPassword}
          >
            {saving ? 'Changing...' : 'Change Password'}
          </Button>
        </div>
      </div>
    </form>
  )
}

function TwoFactorSection() {
  const { data: session } = useSession()
  const user = session?.user as any
  const is2FAEnabled = user?.twoFactorEnabled

  const [step, setStep] = useState<'idle' | 'enabling' | 'qr' | 'verify' | 'backup' | 'disabling'>('idle')
  const [password, setPassword] = useState('')
  const [totpURI, setTotpURI] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [verifyCode, setVerifyCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: err } = await authClient.twoFactor.enable({
        password,
      })

      if (err) {
        setError(err.message || 'Failed to enable 2FA')
        setLoading(false)
        return
      }

      if (data) {
        setTotpURI(data.totpURI)
        setBackupCodes(data.backupCodes)
        setStep('qr')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: err } = await authClient.twoFactor.verifyTotp({
        code: verifyCode,
      })

      if (err) {
        setError(err.message || 'Invalid code')
        setLoading(false)
        return
      }

      setStep('backup')
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: err } = await authClient.twoFactor.disable({
        password,
      })

      if (err) {
        setError(err.message || 'Failed to disable 2FA')
        setLoading(false)
        return
      }

      setStep('idle')
      setPassword('')
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const resetFlow = () => {
    setStep('idle')
    setPassword('')
    setTotpURI('')
    setBackupCodes([])
    setVerifyCode('')
    setError('')
  }

  return (
    <div className="bg-surface-raised border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Two-Factor Authentication</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Add an extra layer of security using an authenticator app
          </p>
        </div>
        {is2FAEnabled && <Badge variant="accent">Enabled</Badge>}
      </div>

      {/* Idle state — enable or disable */}
      {step === 'idle' && !is2FAEnabled && (
        <Button variant="primary" size="sm" onClick={() => setStep('enabling')}>
          Enable 2FA
        </Button>
      )}

      {step === 'idle' && is2FAEnabled && (
        <Button variant="danger" size="sm" onClick={() => setStep('disabling')}>
          Disable 2FA
        </Button>
      )}

      {/* Step: enter password to enable */}
      {step === 'enabling' && (
        <form onSubmit={handleEnable2FA} className="space-y-3">
          <Input
            type="password"
            label="Confirm your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm" disabled={loading || !password}>
              {loading ? 'Verifying...' : 'Continue'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetFlow}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Step: show QR code */}
      {step === 'qr' && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
          </p>
          <div className="flex justify-center py-4">
            <div className="bg-white p-3 rounded-lg">
              <QRCode value={totpURI} size={180} />
            </div>
          </div>
          <form onSubmit={handleVerifyTotp} className="space-y-3">
            <Input
              label="Enter the 6-digit code from your app"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="font-mono text-center tracking-[0.3em] text-lg"
              maxLength={6}
              autoComplete="one-time-code"
            />
            {error && <p className="text-xs text-danger">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" variant="primary" size="sm" disabled={loading || verifyCode.length !== 6}>
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={resetFlow}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Step: show backup codes */}
      {step === 'backup' && (
        <div className="space-y-4">
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
            <p className="text-sm font-medium text-accent mb-1">2FA is now enabled</p>
            <p className="text-xs text-text-secondary">
              Save these backup codes in a secure location. Each code can only be used once.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, i) => (
              <code key={i} className="bg-surface-overlay border border-border rounded px-3 py-1.5 text-xs font-mono text-text-primary text-center">
                {code}
              </code>
            ))}
          </div>
          <Button variant="primary" size="sm" onClick={resetFlow}>
            Done
          </Button>
        </div>
      )}

      {/* Step: enter password to disable */}
      {step === 'disabling' && (
        <form onSubmit={handleDisable2FA} className="space-y-3">
          <Input
            type="password"
            label="Confirm your password to disable 2FA"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" variant="danger" size="sm" disabled={loading || !password}>
              {loading ? 'Disabling...' : 'Disable 2FA'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetFlow}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

/* ─────────────────────────── Account Tab ─────────────────────────── */

function AccountTab() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOutAll = async () => {
    setSigningOut(true)
    try {
      await authClient.revokeSessions()
      window.location.href = '/login'
    } catch {
      setSigningOut(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Account info */}
      <div className="bg-surface-raised border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Account Information</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Role</span>
            <Badge variant="accent">{user?.role || 'user'}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Member since</span>
            <span className="text-text-secondary">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">App version</span>
            <Link to="/app/changelog" className="text-accent text-xs font-mono hover:underline no-underline">v{__APP_VERSION__}</Link>
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div className="bg-surface-raised border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">Active Sessions</h3>
        <p className="text-xs text-text-muted">
          Sign out of all other sessions across all devices.
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSignOutAll}
          disabled={signingOut}
        >
          {signingOut ? 'Signing out...' : 'Sign Out All Devices'}
        </Button>
      </div>

      {/* Danger zone */}
      <div className="bg-surface-raised border border-danger/20 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-danger">Danger Zone</h3>
        <p className="text-xs text-text-muted">
          Account deletion is not yet available. Contact support if you need to delete your account.
        </p>
        <Button variant="danger" size="sm" disabled>
          Delete Account
        </Button>
      </div>
    </div>
  )
}
