import { useState, useEffect } from 'react'
import { Modal, Button } from './bleh'
import './shell/dialogs.css'

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

/** First-run welcome dialog (bleh Modal). Shown once, after the changelog dialog has been seen. */
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

  if (!open) return null

  return (
    <Modal
      title="Welcome to Zephyron"
      onClose={handleDismiss}
      width={400}
      footer={<Button appearance="primary" label="Let's go →" onClick={handleDismiss} />}
    >
      <div className="ob-list">
        {FEATURES.map((f) => (
          <div key={f.title} className="ob-row">
            <div className="ob-icon" aria-hidden="true">{f.icon}</div>
            <div>
              <p className="ob-title">{f.title}</p>
              <p className="ob-desc">{f.description}</p>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
