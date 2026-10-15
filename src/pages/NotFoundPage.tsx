import { Button } from '../components/bleh'
import { AuthShell } from '../components/auth/AuthShell'

export function NotFoundPage() {
  return (
    <AuthShell width={420} eyebrow="Page not found">
      <div className="as-center animate-item">
        <p className="setting-head text-[oklch(var(--h3))] text-6xl leading-none" aria-hidden="true">404</p>
        <div>
          <h1 className="setting-head italic text-heading">Page not found</h1>
          <p className="mt-1.5">The page you're looking for doesn't exist or has been moved.</p>
        </div>
        <Button to="/" appearance="primary" label="Go home" />
      </div>
    </AuthShell>
  )
}
