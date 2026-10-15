import type { CSSProperties, ReactNode } from 'react';
import { TrafficConeFilled } from '@mingcute/react/core-filled';
import { cn } from '../../../lib/cn';

const AMBER = { '--hue-over': 56, '--sat-over': 1.8, '--lit-over': 1.07 } as CSSProperties;

/** Amber "under construction" strip; `mascot` (an img/svg) peeks up from the bottom edge on hover. */
export function ConstructionStrip({ children, mascot, className }: { children: ReactNode; mascot?: ReactNode; className?: string }) {
  return (
    <div className={cn('cc-construction colourful', className)} style={AMBER}>
      <TrafficConeFilled size={16} className="cc-construction-icon" aria-hidden="true" />
      <div className="cc-construction-text">{children}</div>
      {mascot && <div className="cc-construction-mascot" aria-hidden="true"><div>{mascot}</div></div>}
    </div>
  );
}
