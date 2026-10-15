import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Logo } from '../ui/Logo';
import './PublicFrame.css';

/**
 * Chrome for the standalone public pages (privacy, terms, delete account, 404): transparent
 * top bar with the brand, one readable column of content, and a quiet footer.
 */
export function PublicFrame({ children, width = 760 }: { children: ReactNode; width?: number }) {
  return (
    <div className="pf-page">
      <div className="pf-glow" aria-hidden="true" />
      <header className="pf-nav">
        <Link to="/" className="pf-brand" aria-label="Zephyron home">
          <Logo size={30} />
          <span className="pf-brand-name">Zephyron</span>
        </Link>
        <nav className="pf-links" aria-label="Site">
          <Link to="/app/profile?tab=about" className="pf-link">About</Link>
          <Link to="/login" className="pf-link">Sign in</Link>
        </nav>
      </header>
      <main className="pf-main" style={{ '--pf-width': `${width}px` } as React.CSSProperties}>
        {children}
      </main>
      <footer className="pf-foot">
        <p>&copy; {new Date().getFullYear()} Zephyron</p>
        <nav className="pf-links" aria-label="Legal">
          <Link to="/app/profile?tab=about" className="pf-link">About</Link>
          <Link to="/terms" className="pf-link">Terms</Link>
          <Link to="/privacy" className="pf-link">Privacy</Link>
        </nav>
      </footer>
    </div>
  );
}

/** Legal document body: serif title, dated line, numbered sections. */
export function LegalDoc({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <article className="pf-doc animate-item">
      <h1 className="setting-head">{title}</h1>
      {updated && <p className="pf-updated">Last updated: {updated}</p>}
      <div className="pf-body">{children}</div>
    </article>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pf-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
