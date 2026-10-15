import { Link } from 'react-router'
import { openChangelog } from '../WhatsNew'
import { REPORT_ISSUE_URL } from './navItems'

const Dot = () => <span className="sh-footer-dot" aria-hidden="true" />

/**
 * Page footer: brand, version, the legal links and the changelog/report actions.
 * No props. Mounted once by AppLayout after the routed page.
 */
export function Footer() {
  return (
    <footer className="sh-footer">
      <div className="sh-footer-row">
        <span className="sh-footer-brand">Zephyron</span>
        <span>v{__APP_VERSION__}</span>
        <Dot />
        <Link className="sh-footer-link" to="/privacy">Privacy</Link>
        <Dot />
        <Link className="sh-footer-link" to="/terms">Terms</Link>
        <Dot />
        <button type="button" className="sh-footer-link" onClick={() => openChangelog()}>Changelog</button>
        <Dot />
        <a className="sh-footer-link" href={REPORT_ISSUE_URL} target="_blank" rel="noopener noreferrer">Report issue</a>
      </div>
    </footer>
  )
}
