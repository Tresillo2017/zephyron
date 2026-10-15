import type { ReactNode } from 'react';
import { cn } from '../../../lib/cn';

export interface ContentCardProps {
  toolbar?: ReactNode;
  top?: ReactNode;
  main: ReactNode;
  side?: ReactNode;
  bottom?: ReactNode;
  seasonal?: boolean;
  className?: string;
}

/** The bleh content card: toolbar, full-width rows, then a main | sidebar split. */
export function ContentCard({ toolbar, top, main, side, bottom, seasonal = true, className }: ContentCardProps) {
  return (
    <div
      className={cn('cc-card', seasonal && 'seasonal-card', className)}
      data-has-top={toolbar || top ? '' : undefined}
      data-has-bottom={bottom ? '' : undefined}
      data-single={side ? undefined : ''}
    >
      {toolbar}
      {top && <div className="cc-top">{top}</div>}
      <div className="cc-split">
        <div className="cc-main"><div className="cc-col cc-col-main">{main}</div></div>
        {side && <aside className="cc-side"><div className="cc-col cc-col-side">{side}</div></aside>}
      </div>
      {bottom && <div className="cc-bottom">{bottom}</div>}
    </div>
  );
}
