import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../../../lib/cn';

export type TabsVariant = 'segmented' | 'pill' | 'underline' | 'tabbed';

export interface TabItem<T extends string> {
  key: T;
  label: string;
  icon?: ReactNode;
  count?: number;
}

/**
 * bleh tabs. segmented = view-buttons group (selected = primary), pill = toolbar tabs,
 * underline = nav row with the glowing bar, tabbed = in-card tabs with a hairline.
 */
export function Tabs<T extends string>({ tabs, active, onChange, variant = 'segmented', className, 'aria-label': ariaLabel }: {
  tabs: TabItem<T>[];
  active: T;
  onChange: (key: T) => void;
  variant?: TabsVariant;
  className?: string;
  'aria-label'?: string;
}) {
  const list = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const at = tabs.findIndex(t => t.key === active);
    const next = tabs[(at + step + tabs.length) % tabs.length];
    onChange(next.key);
    list.current?.querySelectorAll<HTMLElement>('[role="tab"]')[tabs.indexOf(next)]?.focus();
  };

  return (
    <div ref={list} role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown} className={cn('ui-tabs', className)} data-variant={variant}>
      {tabs.map(tab => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            type="button"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.key)}
            className="ui-btn ui-tab"
          >
            {tab.icon}
            {tab.label}
            {tab.count != null && tab.count > 0 && <span className="ui-badge ui-tab-count">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
