import type { CSSProperties } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: number | string;
  borderRadius?: string | number;
  style?: CSSProperties;
}

/** b4/50% bar that breathes 1 -> 0 -> 1 over 2s. Text bars are 10px-radius; pass borderRadius for covers. */
export function Skeleton({ width = '100%', height = 14, borderRadius, style }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className="ui-skeleton"
      style={{ width, height, ...(borderRadius != null ? { borderRadius } : {}), ...style }}
    />
  );
}
