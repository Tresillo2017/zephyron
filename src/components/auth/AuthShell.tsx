import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import { Logo } from '../ui/Logo';
import { cn } from '../../lib/cn';
import './AuthShell.css';

/**
 * Shell for the public pages (login, register, 2FA, reset, device): they render outside the
 * app shell, so this draws the accent backdrop glow and one centred glass dialog itself.
 */
export function AuthShell({ children, width = 420, eyebrow, className }: {
  children: ReactNode; width?: number; eyebrow?: string; className?: string;
}) {
  return (
    <div className="as-page">
      <div className="as-glow" aria-hidden="true" />
      <main className={cn('as-dialog glass-dialog animate-page', className)} style={{ '--as-width': `${width}px` } as CSSProperties}>
        <Link to="/" className="as-brand" aria-label="Zephyron home">
          <Logo size={30} />
          <span className="as-brand-text">
            <span className="as-brand-name">Zephyron</span>
            {eyebrow && <span className="as-brand-eyebrow">{eyebrow}</span>}
          </span>
        </Link>
        {children}
      </main>
    </div>
  );
}
