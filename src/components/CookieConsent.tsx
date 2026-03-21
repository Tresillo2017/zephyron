import { useState, useEffect } from 'react'
import { getConsent, setConsent } from '../lib/analytics'

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
    <div
      className="fixed bottom-0 left-0 right-0 z-50 animate-[slide-up_0.3s_var(--ease-spring)]"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div
        className="mx-3 mb-3 sm:mx-5 sm:mb-5 rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5"
        style={{
          background: 'hsl(var(--b5) / 0.85)',
          backdropFilter: 'var(--card-blur)',
          WebkitBackdropFilter: 'var(--card-blur)',
          boxShadow: 'inset 0 0 0 1px hsl(var(--br1) / 0.5), 0 12px 40px hsl(0 0% 0% / 0.4)',
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--c2))' }}>
            We use cookies for analytics to understand how you use Zephyron and improve the experience.{' '}
            <a
              href="/privacy"
              className="underline underline-offset-2 transition-colors"
              style={{ color: 'hsl(var(--h3))' }}
            >
              Privacy Policy
            </a>
          </p>
        </div>

        <div className="flex gap-2.5 shrink-0 w-full sm:w-auto">
          <button
            onClick={handleDecline}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-sm cursor-pointer transition-colors"
            style={{
              background: 'hsl(var(--b4) / 0.5)',
              color: 'hsl(var(--c3))',
              transitionProperty: 'background-color, color',
              transitionDuration: 'var(--trans)',
              transitionTimingFunction: 'var(--ease-out-custom)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'hsl(var(--b3) / 0.5)'
              e.currentTarget.style.color = 'hsl(var(--c2))'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'hsl(var(--b4) / 0.5)'
              e.currentTarget.style.color = 'hsl(var(--c3))'
            }}
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-sm cursor-pointer font-[var(--font-weight-medium)]"
            style={{
              background: 'hsl(var(--h3))',
              color: 'white',
              boxShadow: '0 3px 12px hsl(var(--h4) / 0.32)',
              transitionProperty: 'background-color, transform, box-shadow',
              transitionDuration: 'var(--trans)',
              transitionTimingFunction: 'var(--ease-out-custom)',
            }}
            onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)' }}
            onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = '' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = '' }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
