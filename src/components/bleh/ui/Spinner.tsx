import { useId } from 'react';
import { cn } from '../../../lib/cn';

/** Two opposed comet arcs (bleh loading glyph). Rotation comes from .ui-spinner. */
export function Spinner({ size, className, still }: { size?: number; className?: string; still?: boolean }) {
  const uid = useId();
  const a = `${uid}a`, b = `${uid}b`;
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      className={cn('ui-spinner', className)}
      data-static={still ? '' : undefined}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        <linearGradient id={a} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset="1" stopColor="currentColor" stopOpacity=".55" />
        </linearGradient>
        <linearGradient id={b} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="currentColor" stopOpacity="1" />
          <stop offset="1" stopColor="currentColor" stopOpacity=".55" />
        </linearGradient>
      </defs>
      <path d="M12 3a9 9 0 0 1 0 18" stroke={`url(#${a})`} />
      <path d="M12 21a9 9 0 0 1 0-18" stroke={`url(#${b})`} />
    </svg>
  );
}
