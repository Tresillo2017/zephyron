import { useState, useEffect } from 'react'
import { getConsent, setConsent } from '../lib/analytics'
import { Button } from './bleh'
import './shell/dialogs.css'

/** Analytics consent banner, glass card pinned to the bottom until a choice is made. */
export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show if the user hasn't made a choice yet
    if (getConsent() === null) {
      // Small delay to avoid flash on page load
      const timer = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  if (!visible) return null

  const handleAccept = () => {
    setConsent('accepted')
    setVisible(false)
  }

  const handleDecline = () => {
    setConsent('declined')
    setVisible(false)
  }

  return (
    <div className="cc-consent" role="dialog" aria-label="Cookie consent">
      <p className="cc-text">
        We use cookies for analytics to understand how you use Zephyron and improve the experience.{' '}
        <a href="/privacy">Privacy Policy</a>
      </p>
      <div className="cc-actions">
        <Button appearance="default" label="Decline" onClick={handleDecline} />
        <Button appearance="primary" label="Accept" onClick={handleAccept} />
      </div>
    </div>
  )
}
