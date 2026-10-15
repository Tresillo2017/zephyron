import { PublicFrame, LegalDoc, LegalSection } from '../components/public/PublicFrame'

export function TermsPage() {
  return (
    <PublicFrame>
      <LegalDoc title="Terms of Service" updated="March 2026">
        <LegalSection title="1. Acceptance of Terms">
          <p>By accessing or using Zephyron, you agree to be bound by these Terms of Service. If you do not agree, do not use the service. Zephyron is currently in invite-only beta and access is granted at our discretion.</p>
        </LegalSection>

        <LegalSection title="2. Account Registration">
          <p>You must provide a valid invite code to create an account. You are responsible for maintaining the security of your account credentials. You must provide accurate information and keep it up to date.</p>
        </LegalSection>

        <LegalSection title="3. Acceptable Use">
          <p>You agree to use Zephyron only for its intended purpose of streaming and discovering DJ sets. You agree not to:</p>
          <ul>
            <li>Download or redistribute audio content from the platform</li>
            <li>Submit intentionally false annotations or spam</li>
            <li>Attempt to manipulate the voting or reputation system</li>
            <li>Use automated tools to access the service without permission</li>
            <li>Harass or abuse other users</li>
          </ul>
        </LegalSection>

        <LegalSection title="4. User Contributions">
          <p>Annotations, corrections, and votes you submit are contributions to the community. By submitting them, you grant Zephyron a non-exclusive license to use this data to improve the platform, including training AI models.</p>
        </LegalSection>

        <LegalSection title="5. Content & Copyright (DMCA)">
          <p>DJ sets hosted on Zephyron are uploaded by authorized curators. Zephyron respects intellectual property rights and complies with the Digital Millennium Copyright Act (DMCA).</p>
          <p>If you believe content on Zephyron infringes your copyright, please send a written notice containing:</p>
          <ul>
            <li>Your name, address, telephone number, and email address</li>
            <li>A description of the copyrighted work you claim has been infringed</li>
            <li>The URL or specific location of the infringing material</li>
            <li>A statement that you have a good faith belief the use is not authorized by the copyright owner</li>
            <li>A statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on their behalf</li>
            <li>Your physical or electronic signature</li>
          </ul>
          <p>Send DMCA notices to: <strong>dmca@zephyron.app</strong></p>
          <p className="pf-note">Counter-notifications and repeat infringer policy are handled in accordance with 17 U.S.C. §512.</p>
        </LegalSection>

        <LegalSection title="6. Service Availability">
          <p>Zephyron is provided "as is" during the beta period. We do not guarantee uptime, data preservation, or continued access. We may modify or discontinue the service at any time.</p>
        </LegalSection>

        <LegalSection title="7. Account Termination">
          <p>We reserve the right to suspend or terminate accounts that violate these terms, abuse the reputation system, or engage in disruptive behavior.</p>
        </LegalSection>

        <LegalSection title="8. Changes to Terms">
          <p>We may update these terms as the platform evolves. Continued use after changes constitutes acceptance of the revised terms.</p>
        </LegalSection>

        <LegalSection title="9. Contact">
          <p>
            For questions about these terms, open an issue on our{' '}
            <a href="https://github.com/tresillo2017/zephyron/issues" target="_blank" rel="noopener noreferrer">
              GitHub repository
            </a>.
          </p>
        </LegalSection>
      </LegalDoc>
    </PublicFrame>
  )
}
