import type { ReactNode } from 'react';
import { RightSmallFilled } from '@mingcute/react/core-filled';
import { cn } from '../../../lib/cn';
import { Interactive } from './Interactive';

export interface SideCtaAction { label: ReactNode; onClick?: () => void; to?: string; href?: string }

/** Sidebar CTA: gradient strip with a bold line and a see-more style link (or any node). */
export function SideCta({ line, action, className }: { line: ReactNode; action?: ReactNode | SideCtaAction; className?: string }) {
  const isLink = action != null && typeof action === 'object' && 'label' in action;
  return (
    <div className={cn('cc-side-cta', className)}>
      <strong>{line}</strong>
      {isLink ? (
        <Interactive to={action.to} href={action.href} onClick={action.onClick} className="cc-seemore">
          {action.label}
          <RightSmallFilled size={14} aria-hidden="true" />
        </Interactive>
      ) : action}
    </div>
  );
}

/** Muted 13px lines (version, build time) at the bottom of a sidebar. */
export function VersionLines({ lines, className }: { lines: ReactNode[]; className?: string }) {
  return (
    <div className={cn('cc-version', className)}>
      {lines.map((line, i) => <p key={i}>{line}</p>)}
    </div>
  );
}
