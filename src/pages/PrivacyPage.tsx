import { PublicFrame, LegalDoc, LegalSection } from '../components/public/PublicFrame'

export function PrivacyPage() {
  return (
    <PublicFrame>
      <LegalDoc title="Privacy Policy" updated="March 2026">
        <LegalSection title="1. Information We Collect">
          <p>When you create an account, we collect your name, email address, and invite code. When you use Zephyron, we collect listening history, annotations, votes, and playlist data to provide the service.</p>
        </LegalSection>

        <LegalSection title="2. How We Use Your Information">
          <p>We use your information to provide and improve Zephyron, including authenticating your account, tracking your listening history, displaying your contributions (annotations, votes), and improving our AI-powered tracklist detection through aggregate community feedback.</p>
        </LegalSection>

        <LegalSection title="3. Data Storage">
          <p>Your data is stored on Cloudflare's global network using D1 (database) and R2 (audio storage). Session data is stored in secure, HTTP-only cookies. We do not sell or share your personal data with third parties.</p>
        </LegalSection>

        <LegalSection title="4. Third-Party Services">
          <p>We use Last.fm's API to enrich track and artist metadata. We use YouTube's Data API for tracklist source data. These services may have their own privacy policies.</p>
        </LegalSection>

        <LegalSection title="5. Security">
          <p>Passwords are hashed and never stored in plain text. Sessions are encrypted. Two-factor authentication is available for additional account security. We use HTTPS for all connections.</p>
        </LegalSection>

        <LegalSection title="6. Your Rights">
          <p>You can view and update your account information in Settings. You can request deletion of your account by contacting us. We will respond to requests within 30 days.</p>
        </LegalSection>

        <LegalSection title="7. Contact">
          <p>
            For privacy-related questions, open an issue on our{' '}
            <a href="https://github.com/tresillo2017/zephyron/issues" target="_blank" rel="noopener noreferrer">
              GitHub repository
            </a>.
          </p>
        </LegalSection>
      </LegalDoc>
    </PublicFrame>
  )
}
