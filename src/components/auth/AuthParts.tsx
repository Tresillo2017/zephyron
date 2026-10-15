import type { ReactNode } from 'react';
import { ArrowLeftFilled } from '@mingcute/react/core-filled';
import { SeeMore } from '../bleh/ui/Text';

/** Serif italic headline + muted line, shared by every public page. */
export function AuthHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="as-head">
      <h1 className="setting-head">{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return <div className="as-divider">{label}</div>;
}

/** Inline text button (toggle between sign in / sign up, forgot password). */
export function AuthLink({ onClick, children, muted, small }: { onClick: () => void; children: ReactNode; muted?: boolean; small?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="as-link" data-muted={muted ? '' : undefined} data-small={small ? '' : undefined}>
      {children}
    </button>
  );
}

export function BackToSignIn({ onClick }: { onClick: () => void }) {
  return <SeeMore onClick={onClick} iconLeft={<ArrowLeftFilled />}>Back to sign in</SeeMore>;
}

/** Round icon tile at the top of a state (check inbox, 2-step, pending). */
export function AuthBadge({ children, hue }: { children: ReactNode; hue?: 'hue-pos' | 'hue-warn' | 'hue-neg' }) {
  return <div className={hue ? `as-badge ${hue}` : 'as-badge'}>{children}</div>;
}

/** Centred confirmation state: icon, serif title, body, then actions. */
export function AuthNotice({ icon, hue, title, body, children }: { icon: ReactNode; hue?: 'hue-pos' | 'hue-warn'; title: string; body: string; children?: ReactNode }) {
  return (
    <div className="as-center animate-item">
      <AuthBadge hue={hue}>{icon}</AuthBadge>
      <div>
        <h1 className="setting-head italic text-heading">{title}</h1>
        <p className="mt-1.5">{body}</p>
      </div>
      {children && <div className="flex w-full flex-col items-center gap-3 pt-1">{children}</div>}
    </div>
  );
}
