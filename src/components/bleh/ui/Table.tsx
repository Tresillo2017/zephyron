import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '../../../lib/cn';

export const Table = ({ className, ...p }: HTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-x-auto rounded-card bg-surface shadow-card">
    <table className={cn('w-full border-collapse text-[14px]', className)} {...p} />
  </div>
);
export const THead = (p: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className="bg-surface-overlay/40" {...p} />
);
export const TBody = (p: HTMLAttributes<HTMLTableSectionElement>) => <tbody {...p} />;
export const Tr = ({ className, ...p }: HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('border-b border-[color:var(--border-soft)] last:border-b-0 transition-colors duration-200 hover:bg-surface-overlay/30', className)} {...p} />
);
export const Th = ({ className, ...p }: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn('px-4 py-2.5 text-left text-[13px] leading-[17px] font-medium text-text-muted', className)} {...p} />
);
export const Td = ({ className, ...p }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-4 py-3 align-middle text-text-secondary', className)} {...p} />
);
