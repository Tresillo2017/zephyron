import type { ReactNode } from 'react';
import { cn } from '../../../lib/cn';
import { Interactive } from './Interactive';
import { Spinner } from './Spinner';

export function SideList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('cc-list', className)}>{children}</div>;
}

export interface SideRowProps {
  avatar: ReactNode;
  name: ReactNode;
  /** Right-aligned status; defaults to "Live now" while `live`. */
  status?: ReactNode;
  tile?: ReactNode;
  title?: ReactNode;
  sub?: ReactNode;
  live?: boolean;
  idle?: boolean;
  to?: string;
  onClick?: () => void;
}

/** 40px avatar + name line with status + optional tile/title/sub line. */
export function SideRow({ avatar, name, status, tile, title, sub, live, idle, to, onClick }: SideRowProps) {
  const shownStatus = status ?? (live ? 'Live now' : null);
  return (
    <Interactive to={to} onClick={onClick} className="cc-row animate-activity" data-idle={idle ? '' : undefined} data-live={live ? '' : undefined}>
      <span className="cc-row-avatar">{avatar}</span>
      <span className="cc-row-info">
        <span className="cc-row-name">
          <strong>{name}</strong>
          {shownStatus && (
            <span className="cc-row-status" data-live={live ? '' : undefined}>
              {live && <Spinner size={12} className="cc-row-spin" />}
              {shownStatus}
            </span>
          )}
        </span>
        {(tile || title || sub) && (
          <span className="cc-row-track">
            {tile && <span className={cn('cc-row-tile', live && 'animate-status')}>{tile}</span>}
            <span className="cc-row-text">
              {title && <strong>{title}</strong>}
              {sub && <span>{sub}</span>}
            </span>
          </span>
        )}
      </span>
    </Interactive>
  );
}
