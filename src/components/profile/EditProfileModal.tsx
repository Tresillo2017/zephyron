import { Button, FooterFill, Modal } from '../bleh'
import { DisplayNameEditor } from './DisplayNameEditor'
import { BioEditor } from './BioEditor'
import type { ProfileUser } from './profileTabs'

interface EditProfileModalProps {
  user: ProfileUser
  avatarUrl: string | null
  bannerUrl: string | null
  /** Draft values; null means "not edited yet, use the account value". */
  displayName: string | null
  bio: string | null
  onClose: () => void
  onChangeBanner: () => void
  onChangeAvatar: () => void
  onRemoveBanner: () => void
  onDisplayNameChange: (name: string) => void
  onBioChange: (bio: string) => void
}

const CHANGE_BUTTON = 'absolute inset-0 flex items-center justify-center text-xs font-medium text-white opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100'

/** Edit profile dialog: cover and avatar previews (click to change), display name and bio editors. */
export function EditProfileModal({
  user, avatarUrl, bannerUrl, displayName, bio, onClose, onChangeBanner, onChangeAvatar, onRemoveBanner, onDisplayNameChange, onBioChange,
}: EditProfileModalProps) {
  const initial = user.name?.charAt(0).toUpperCase() || '?'

  return (
    <Modal
      title="Edit profile"
      width={520}
      onClose={onClose}
      footer={(
        <>
          <FooterFill />
          <Button label="Done" appearance="primary" size="sm" onClick={onClose} />
        </>
      )}
    >
      <div className="flex flex-col gap-5">
        <div className="relative">
          <div className="relative h-28 overflow-hidden rounded-card" style={{ background: 'linear-gradient(135deg, oklch(var(--h3) / 0.1), oklch(var(--b4)))' }}>
            {bannerUrl && <img src={bannerUrl} alt="" className="h-full w-full object-cover object-center" />}
            <button
              type="button"
              onClick={onChangeBanner}
              aria-label={bannerUrl ? 'Change cover' : 'Add cover'}
              className={CHANGE_BUTTON}
              style={{ background: 'rgba(0,0,0,0.35)' }}
            >
              {bannerUrl ? 'Change cover' : 'Add cover'}
            </button>
          </div>

          <div className="absolute bottom-0 left-4 translate-y-1/2">
            <button
              type="button"
              onClick={onChangeAvatar}
              aria-label="Change profile picture"
              className="relative h-16 w-16 overflow-hidden rounded-xl"
              style={{ boxShadow: '0 0 0 3px oklch(var(--b5)), var(--subtle-shadow)' }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xl font-bold" style={{ background: 'oklch(var(--h3) / 0.15)', color: 'oklch(var(--h3))' }}>
                  {initial}
                </span>
              )}
            </button>
          </div>

          {bannerUrl && (
            <button
              type="button"
              className="absolute right-2 bottom-2 rounded px-2 py-1 text-[11px] transition-colors"
              style={{ color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
              onClick={onRemoveBanner}
            >
              Remove cover
            </button>
          )}
        </div>

        <div className="h-10" />

        <DisplayNameEditor initialName={displayName ?? user.name ?? ''} onUpdate={onDisplayNameChange} />

        <div className="pt-4" style={{ borderTop: '1px solid oklch(var(--b4) / 0.25)' }}>
          <BioEditor initialBio={bio ?? user.bio ?? ''} onUpdate={onBioChange} />
        </div>
      </div>
    </Modal>
  )
}
