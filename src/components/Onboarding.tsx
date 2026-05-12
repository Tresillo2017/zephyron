import { useState, useEffect } from 'react'
import { Modal } from './ui/Modal'

const LS_KEY = 'zephyron_onboarding_done'
const LS_WHATS_NEW_KEY = 'zephyron_last_seen_version'

const FEATURES = [
  {
    icon: '🎧',
    title: 'Stream DJ sets',
    description: 'Festival and club recordings from artists you follow',
  },
  {
    icon: '🔍',
    title: 'Find any track',
    description: 'Search by artist, event, or song across every tracklist',
  },
  {
    icon: '🗳',
    title: 'Vote & correct',
    description: 'Help verify AI detections and earn reputation',
  },
]

export function Onboarding() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Already dismissed
    if (localStorage.getItem(LS_KEY)) return

    // Defer if WhatsNew would also open this session — avoid stacking two modals
    if (localStorage.getItem(LS_WHATS_NEW_KEY) !== __APP_VERSION__) return

    setOpen(true)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(LS_KEY, '1')
    setOpen(false)
  }

  return (
    <Modal
      isOpen={open}
      onClose={handleDismiss}
      title="Welcome to Zephyron"
      className="max-w-sm"
    >
      <div className="space-y-1 mb-6">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex items-start gap-3 py-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
              style={{ background: 'hsl(var(--h3) / 0.12)' }}
            >
              {f.icon}
            </div>
            <div>
              <p className="text-sm font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--c1))' }}>
                {f.title}
              </p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'hsl(var(--c2))' }}>
                {f.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="w-full h-[var(--button-height)] rounded-[var(--button-radius)] text-sm font-[var(--font-weight-medium)] cursor-pointer transition-all"
        style={{
          background: 'hsl(var(--h3))',
          color: 'white',
          boxShadow: '0 0 20px hsl(var(--h3) / 0.3)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'hsl(var(--h2))'
          e.currentTarget.style.transform = 'scale(0.98)'
          e.currentTarget.style.boxShadow = '0 0 25px hsl(var(--h3) / 0.4)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'hsl(var(--h3))'
          e.currentTarget.style.transform = ''
          e.currentTarget.style.boxShadow = '0 0 20px hsl(var(--h3) / 0.3)'
        }}
      >
        Let's go →
      </button>
    </Modal>
  )
}
