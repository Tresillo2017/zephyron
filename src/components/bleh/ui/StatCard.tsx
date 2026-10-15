import type { ReactNode } from 'react';
import { cn } from '../../../lib/cn';
import { Skeleton } from '../Skeleton';
import { Card } from './Card';

const toneClass = {
  neutral: 'text-heading',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
} as const;

export function StatCard({ label, value, sub, tone = 'neutral', loading, icon }: {
  label: string; value: string | number; sub?: string;
  tone?: keyof typeof toneClass; loading?: boolean; icon?: ReactNode;
}) {
  return (
    <Card className="animate-item flex flex-col gap-2 transition-[background-color] duration-200 ease-bleh hover:bg-[color-mix(in_oklch,var(--surface),oklch(var(--b4))_40%)]">
      <div className="flex items-center justify-between text-[13px] leading-[17px] text-muted">
        <span>{label}</span>
        {icon && <span className="text-accent-2 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      </div>
      {loading ? (
        <Skeleton height={30} width={80} borderRadius={7} />
      ) : (
        <div className={cn('text-[30px] leading-none font-medium tracking-tight tabular-nums', toneClass[tone])}>{value}</div>
      )}
      {sub && <div className="text-[13px] leading-[17px] text-muted">{sub}</div>}
    </Card>
  );
}
