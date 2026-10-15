import { useState } from 'react'
import { sileo } from 'sileo'
import { useSession } from '../../../lib/auth-client'
import { updateProfileSettings } from '../../../lib/api'
import { Section } from '../../bleh'
import { SettingGroup, SettingSwitch } from './SettingPrimitives'
import type { ProfileUser } from '../profileTabs'

export function PrivacyTab() {
  const { data: session } = useSession()
  const user = session?.user as ProfileUser | undefined

  const [isProfilePublic, setIsProfilePublic] = useState(user?.is_profile_public ?? false)
  const [showActivity, setShowActivity] = useState(user?.show_activity ?? true)
  const [showLikedSongs, setShowLikedSongs] = useState(user?.show_liked_songs ?? true)
  const [saving, setSaving] = useState<string | null>(null)

  const save = async (field: string, value: boolean, revert: () => void) => {
    setSaving(field)
    try {
      await updateProfileSettings({ [field]: value } as Parameters<typeof updateProfileSettings>[0])
    } catch {
      sileo.error({ title: 'Failed to save', duration: 5000 })
      revert()
    } finally {
      setSaving(null)
    }
  }

  const busy = saving !== null

  return (
    <Section title="Visibility">
      <p className="setting-body" style={{ margin: '-4px 0 0' }}>Control who can see your profile and content.</p>
      <SettingGroup>
        <SettingSwitch
          title="Public profile"
          body="Other users can view your profile, stats, and history"
          checked={isProfilePublic}
          disabled={busy}
          onChange={(v) => { setIsProfilePublic(v); save('is_profile_public', v, () => setIsProfilePublic(!v)) }}
        />
        <SettingSwitch
          title="Show listening activity"
          body="Display what you're listening to on your profile"
          checked={showActivity}
          disabled={busy}
          onChange={(v) => { setShowActivity(v); save('show_activity', v, () => setShowActivity(!v)) }}
        />
        <SettingSwitch
          title="Show liked songs"
          body="Others can see your liked songs list"
          checked={showLikedSongs}
          disabled={busy}
          onChange={(v) => { setShowLikedSongs(v); save('show_liked_songs', v, () => setShowLikedSongs(!v)) }}
        />
      </SettingGroup>
    </Section>
  )
}
