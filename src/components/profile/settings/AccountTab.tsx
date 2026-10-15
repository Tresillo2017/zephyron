import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useSession, authClient } from '../../../lib/auth-client'
import { Badge, Button, Section } from '../../bleh'
import { SettingGroup, SettingRow } from './SettingPrimitives'
import type { ProfileUser } from '../profileTabs'

export function AccountTab() {
  const { data: session } = useSession()
  const user = session?.user as ProfileUser | undefined
  const navigate = useNavigate()
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

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Unknown'

  return (
    <>
      <Section title="Account information">
        <p className="setting-body" style={{ margin: '-4px 0 0' }}>Details about your Zephyron account.</p>
        <SettingGroup>
          <SettingRow title="Role" slot="none">
            <Badge>{user?.role || 'user'}</Badge>
          </SettingRow>
          <SettingRow title="Member since" slot="none">
            <span className="text-sm" style={{ color: 'oklch(var(--c2))' }}>{memberSince}</span>
          </SettingRow>
          <SettingRow title="App version" slot="none">
            <Link to="/app/changelog" className="font-mono text-xs hover:underline no-underline" style={{ color: 'oklch(var(--h3))' }}>
              v{__APP_VERSION__}
            </Link>
          </SettingRow>
        </SettingGroup>
      </Section>

      <Section title="Active sessions">
        <SettingGroup>
          <SettingRow title="Sign out all devices" body="Sign out of all other sessions across all devices.">
            <Button label={signingOut ? 'Signing out…' : 'Sign out all devices'} size="sm" htmlButtonType="button" onClick={handleSignOutAll} disabled={signingOut} />
          </SettingRow>
        </SettingGroup>
      </Section>

      <Section title="Danger zone">
        <SettingGroup className="setting-danger-zone">
          <SettingRow title="Delete account" body="Permanently delete your account and all associated data. This action cannot be undone.">
            <Button label="Delete account" appearance="danger" size="sm" htmlButtonType="button" onClick={() => navigate('/delete-account')} />
          </SettingRow>
        </SettingGroup>
      </Section>
    </>
  )
}
