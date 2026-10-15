import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Icon tile above the title. Without one, a kaomoji face is shown. */
  icon?: ReactNode;
  face?: string;
  style?: CSSProperties;
}

export function EmptyState({ title, description, action, icon, face = '(ᵕ—ᴗ—)', style }: EmptyStateProps) {
  return (
    <div className="animate-item flex flex-col items-center gap-[15px] px-8 py-[30px] text-center" style={style}>
      {icon ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-item bg-b4/50 text-muted shadow-inset [&>svg]:h-5 [&>svg]:w-5">
          {icon}
        </div>
      ) : (
        <div aria-hidden className="text-[18px] leading-[22px] font-semibold whitespace-nowrap text-muted">{face}</div>
      )}
      <div className="flex flex-col gap-1">
        <div className="text-[14px] leading-[18px] font-medium text-heading">{title}</div>
        {description && <div className={cn('mx-auto max-w-[320px] text-[13px] leading-[17px] text-muted')}>{description}</div>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
