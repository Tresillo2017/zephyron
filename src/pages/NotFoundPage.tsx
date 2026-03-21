import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="h-screen flex items-center justify-center bg-surface">
      <div className="text-center px-6 max-w-md">
        <p className="text-6xl font-[var(--font-weight-bold)] mb-2" style={{ color: 'hsl(var(--h3) / 0.3)' }}>404</p>
        <h1 className="text-lg font-[var(--font-weight-bold)] mb-2" style={{ color: 'hsl(var(--c1))' }}>Page not found</h1>
        <p className="text-sm mb-6" style={{ color: 'hsl(var(--c3))' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex px-5 py-2 rounded-lg text-sm font-medium no-underline transition-colors"
          style={{
            background: 'hsl(var(--h3))',
            color: 'white',
          }}
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
