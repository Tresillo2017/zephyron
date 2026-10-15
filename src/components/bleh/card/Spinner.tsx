import { Loading3Filled } from '@mingcute/react/core-filled';
import { cn } from '../../../lib/cn';

/** Open-ring spinner; rotation is switched off through --motion (reduced motion). */
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return <Loading3Filled size={size} className={cn('cc-spin', className)} aria-hidden="true" />;
}
