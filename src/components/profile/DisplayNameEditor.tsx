import { useState } from 'react'
import { sileo } from 'sileo'
import { updateProfileSettings } from '../../lib/api'
import { getSession } from '../../lib/auth-client'
import { Button } from '../ui/Button'

interface DisplayNameEditorProps {
  initialName: string
  onUpdate: (name: string) => void
}

const NAME_MIN_LENGTH = 3
const NAME_MAX_LENGTH = 50
const NAME_PATTERN = /^[\w\s\-'.]+$/

export function DisplayNameEditor({ initialName, onUpdate }: DisplayNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEdit = () => {
    setIsEditing(true)
    setError(null)
  }

  const handleCancel = () => {
    setName(initialName)
    setError(null)
    setIsEditing(false)
  }

  const validateName = (value: string): string | null => {
    if (value.length < NAME_MIN_LENGTH) {
      return `Display name must be at least ${NAME_MIN_LENGTH} characters`
    }
    if (value.length > NAME_MAX_LENGTH) {
      return `Display name must be no more than ${NAME_MAX_LENGTH} characters`
    }
    if (!NAME_PATTERN.test(value)) {
      return 'Display name can only contain letters, numbers, spaces, hyphens, apostrophes, and dots'
    }
    return null
  }

  const handleSave = async () => {
    // Validate name
    const validationError = validateName(name)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError(null)

    try {
      const result = await updateProfileSettings({ name })
      onUpdate(result.user.name || '')
      sileo.success({ description: 'Display name updated successfully' })
      setIsEditing(false)
      // Refresh session to update name in TopNav
      await getSession()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update display name'
      setError(errorMessage)
      sileo.error({ description: errorMessage })
    } finally {
      setSaving(false)
    }
  }

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <label className="text-sm font-[var(--font-weight-medium)] text-[hsl(var(--c1))] mb-1">
            Display Name
          </label>
          <span className="text-sm font-[var(--font-weight-medium)] text-[hsl(var(--c1))]">
            {name}
          </span>
        </div>
        <Button
          onClick={handleEdit}
          variant="ghost"
          size="sm"
          className="text-xs text-[hsl(var(--h3))]"
        >
          Edit
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor="display-name-input"
        className="text-sm font-[var(--font-weight-medium)] text-[hsl(var(--c1))]"
      >
        Display Name
      </label>

      <input
        id="display-name-input"
        type="text"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          if (error) setError(null)
        }}
        disabled={saving}
        autoFocus
        placeholder="Enter your display name"
        className="w-full px-3 py-2 rounded-lg text-sm bg-[hsl(var(--b4))] text-[hsl(var(--c1))] placeholder:text-[hsl(var(--c3))] disabled:opacity-50"
        style={{
          boxShadow: 'inset 0 0 0 1px hsl(var(--b3) / 0.5)',
          transition: 'box-shadow 0.2s var(--ease-out-custom)',
        }}
      />

      {error && (
        <p className="text-xs text-[var(--color-danger)]">{error}</p>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={name === initialName || saving}
          variant="primary"
          size="sm"
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          onClick={handleCancel}
          disabled={saving}
          variant="ghost"
          size="sm"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
