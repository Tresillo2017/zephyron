import { cn } from '../../lib/cn';

/* bleh view-button: transparent, b4/40% hover, selected = primary styling. */
export function FilterChip({ label, active, count, onClick }: {
  label: string; active: boolean; count?: number; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn('ui-btn ui-chip')}
    >
      {label}
      {count !== undefined && count > 0 && <span className="ui-chip-count">{count}</span>}
    </button>
  );
}
