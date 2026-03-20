import { Link } from 'react-router'

export function TermsPage() {
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
        <h1 className="text-3xl font-bold text-text-primary mb-2">Terms of Service</h1>
        <p className="text-sm text-text-muted mb-8">Last updated: March 2026</p>

        <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using Zephyron, you agree to be bound by these Terms of Service. If you do not agree, do not use the service. Zephyron is currently in invite-only beta and access is granted at our discretion.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">2. Account Registration</h2>
            <p>You must provide a valid invite code to create an account. You are responsible for maintaining the security of your account credentials. You must provide accurate information and keep it up to date.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">3. Acceptable Use</h2>
            <p>You agree to use Zephyron only for its intended purpose of streaming and discovering DJ sets. You agree not to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Download or redistribute audio content from the platform</li>
              <li>Submit intentionally false annotations or spam</li>
              <li>Attempt to manipulate the voting or reputation system</li>
              <li>Use automated tools to access the service without permission</li>
              <li>Harass or abuse other users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">4. User Contributions</h2>
            <p>Annotations, corrections, and votes you submit are contributions to the community. By submitting them, you grant Zephyron a non-exclusive license to use this data to improve the platform, including training AI models.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">5. Content & Copyright</h2>
            <p>DJ sets hosted on Zephyron are uploaded by authorized curators. If you believe content infringes your copyright, please contact us through our GitHub repository to request removal.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">6. Service Availability</h2>
            <p>Zephyron is provided "as is" during the beta period. We do not guarantee uptime, data preservation, or continued access. We may modify or discontinue the service at any time.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">7. Account Termination</h2>
            <p>We reserve the right to suspend or terminate accounts that violate these terms, abuse the reputation system, or engage in disruptive behavior.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">8. Changes to Terms</h2>
            <p>We may update these terms as the platform evolves. Continued use after changes constitutes acceptance of the revised terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">9. Contact</h2>
            <p>
              For questions about these terms, open an issue on our{' '}
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
            <Link to="/privacy" className="text-text-muted hover:text-text-primary transition-colors no-underline">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
