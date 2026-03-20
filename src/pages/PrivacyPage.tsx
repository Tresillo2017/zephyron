import { Link } from 'react-router'

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-5 sm:px-8 py-5">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-8 h-8 bg-accent/90 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 text-white" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-text-primary tracking-tight">Zephyron</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/about" className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">About</Link>
          <Link to="/login" className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline">Sign In</Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-5 sm:px-8 lg:px-16 py-12 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Privacy Policy</h1>
        <p className="text-sm text-text-muted mb-8">Last updated: March 2026</p>

        <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">1. Information We Collect</h2>
            <p>When you create an account, we collect your name, email address, and invite code. When you use Zephyron, we collect listening history, annotations, votes, and playlist data to provide the service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">2. How We Use Your Information</h2>
            <p>We use your information to provide and improve Zephyron, including authenticating your account, tracking your listening history, displaying your contributions (annotations, votes), and improving our AI-powered tracklist detection through aggregate community feedback.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">3. Data Storage</h2>
            <p>Your data is stored on Cloudflare's global network using D1 (database) and R2 (audio storage). Session data is stored in secure, HTTP-only cookies. We do not sell or share your personal data with third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">4. Third-Party Services</h2>
            <p>We use Last.fm's API to enrich track and artist metadata. We use YouTube's Data API for tracklist source data. These services may have their own privacy policies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">5. Security</h2>
            <p>Passwords are hashed and never stored in plain text. Sessions are encrypted. Two-factor authentication is available for additional account security. We use HTTPS for all connections.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">6. Your Rights</h2>
            <p>You can view and update your account information in Settings. You can request deletion of your account by contacting us. We will respond to requests within 30 days.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">7. Contact</h2>
            <p>
              For privacy-related questions, open an issue on our{' '}
              <a href="https://github.com/tresillo2017/zephyron/issues" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                GitHub repository
              </a>.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-5 sm:px-8 py-5 border-t border-border">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-text-muted">&copy; {new Date().getFullYear()} Zephyron</p>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/about" className="text-text-muted hover:text-text-primary transition-colors no-underline">About</Link>
            <Link to="/terms" className="text-text-muted hover:text-text-primary transition-colors no-underline">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
