import { useState } from 'react'
import { sileo } from 'sileo'
import { updateProfileSettings } from '../../lib/api'

interface BioEditorProps {
  initialBio: string | null
  onUpdate: (bio: string) => void
}

export function BioEditor({ initialBio, onUpdate }: BioEditorProps) {
  const [bio, setBio] = useState(initialBio || '')
  const [saving, setSaving] = useState(false)

  const charCount = bio.length
  const maxChars = 160
  const isOverLimit = charCount > maxChars

  const handleBlur = async () => {
    // Early return if no change
    if (bio === (initialBio || '')) {
      return
    }

    // Early return if over limit
    if (isOverLimit) {
      return
    }

    setSaving(true)

    try {
      const result = await updateProfileSettings({ bio })
      onUpdate(result.user.bio || '')
      // Silent success - no toast on save
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update bio'
      sileo.error({ description: errorMessage })
      // Revert to initial value on error
      setBio(initialBio || '')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="bio-input"
          className="text-sm font-[var(--font-weight-medium)] text-[hsl(var(--c1))]"
        >
          Bio
        </label>
        <span
          className={`text-xs font-mono ${
            isOverLimit ? 'text-[var(--color-danger)]' : 'text-[hsl(var(--c3))]'
          }`}
        >
          {charCount} / {maxChars}
        </span>
      </div>

      <input
        id="bio-input"
        type="text"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        onBlur={handleBlur}
        disabled={saving}
        placeholder="Tell us a bit about yourself..."
        className="w-full px-3 py-2 rounded-lg text-sm bg-[hsl(var(--b4))] text-[hsl(var(--c1))] placeholder:text-[hsl(var(--c3))] disabled:opacity-50"
        style={{
          boxShadow: 'inset 0 0 0 1px hsl(var(--b3) / 0.5)',
          transition: 'box-shadow 0.2s var(--ease-out-custom)',
        }}
      />

      {saving && (
        <p className="text-xs text-[hsl(var(--c3))]">Saving...</p>
      )}
    </div>
  )
}
