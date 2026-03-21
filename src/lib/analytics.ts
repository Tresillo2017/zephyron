const CONSENT_KEY = 'zephyron_cookie_consent'
const SCRIPT_ID = 'zephyron-analytics'

export type ConsentStatus = 'accepted' | 'declined' | null

/** Read stored consent from localStorage */
export function getConsent(): ConsentStatus {
  const value = localStorage.getItem(CONSENT_KEY)
  if (value === 'accepted' || value === 'declined') return value
  return null
}

/** Store consent and apply it (inject or remove script) */
export function setConsent(status: 'accepted' | 'declined') {
  localStorage.setItem(CONSENT_KEY, status)
  applyConsent(status)
}

/** Inject or remove the analytics script based on consent status */
export function applyConsent(status: ConsentStatus) {
  if (status === 'accepted') {
    injectAnalytics()
  } else {
    removeAnalytics()
  }
}

function injectAnalytics() {
  if (document.getElementById(SCRIPT_ID)) return

  const script = document.createElement('script')
  script.id = SCRIPT_ID
  script.src = 'https://analytics.tomasps.com/api/script.js'
  script.dataset.siteId = 'a29e299fcda5'
  script.defer = true
  document.head.appendChild(script)
}

function removeAnalytics() {
  const existing = document.getElementById(SCRIPT_ID)
  if (existing) existing.remove()
}

/** Initialize analytics on app load if consent was previously given */
export function initAnalytics() {
  const consent = getConsent()
  if (consent === 'accepted') {
    injectAnalytics()
  }
}
