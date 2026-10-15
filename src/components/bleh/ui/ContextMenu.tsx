import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { Popout } from './Popout';
import { MenuHeader, MenuItem, MenuSeparator } from './Menu';
import { POPOUT_EXIT_MS } from './usePopout';
import { usePresence } from './presence';

export type ContextItem =
  | { type: 'separator' }
  | { type: 'header'; label: ReactNode }
  | { label: ReactNode; onSelect: () => void; icon?: ReactNode; tone?: 'default' | 'accent' | 'danger'; disabled?: boolean; trailing?: ReactNode };

interface State { x: number; y: number; items: ContextItem[] }

// One menu at a time, app-wide: a tiny external store keeps callers free of providers.
let state: State | null = null;
const listeners = new Set<() => void>();
const set = (next: State | null) => { state = next; listeners.forEach(l => l()); };

/** Open the menu at the pointer. Call from an `onContextMenu` handler; it replaces the default items. */
export function openContextMenu(e: { clientX: number; clientY: number; preventDefault: () => void }, items: ContextItem[]) {
  e.preventDefault();
  if (items.length) set({ x: e.clientX, y: e.clientY, items });
}

const CURSOR_GAP = 2;
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/**
 * Right-click menu: the same glass Popout as every other menu, anchored to a zero-size rect at
 * the cursor. `fallback` builds the page-wide items when nothing more specific claimed the click.
 */
export function ContextMenuHost({ fallback }: { fallback: (target: HTMLElement) => ContextItem[] }) {
  const current = useSyncExternalStore(subscribe, () => state);
  const menuRef = useRef<HTMLDivElement>(null);
  const last = useRef<State | null>(null);
  if (current) last.current = current;
  const { mounted } = usePresence(current !== null, POPOUT_EXIT_MS);
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  useEffect(() => {
    const onContext = (e: MouseEvent) => {
      if (e.defaultPrevented || e.shiftKey) return; // Shift keeps the native menu
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, [contenteditable="true"]')) return;
      openContextMenu(e, fallbackRef.current(target));
    };
    document.addEventListener('contextmenu', onContext);
    return () => document.removeEventListener('contextmenu', onContext);
  }, []);

  useEffect(() => {
    if (!current) return;
    const close = () => set(null);
    const onDown = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('contextmenu', onDown, true); // a second right-click elsewhere replaces it
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('contextmenu', onDown, true);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('blur', close);
    };
  }, [current]);

  const shown = current ?? last.current;
  if (!mounted || !shown) return null;
  return (
    <Popout
      rect={new DOMRect(shown.x, shown.y, 0, 0)}
      menuRef={menuRef}
      open={current !== null}
      onClose={() => set(null)}
      offset={CURSOR_GAP}
      width={232}
    >
      {shown.items.map((item, i) => {
        if ('type' in item) return item.type === 'separator' ? <MenuSeparator key={i} /> : <MenuHeader key={i}>{item.label}</MenuHeader>;
        return <MenuItem key={i} icon={item.icon} label={item.label} tone={item.tone} disabled={item.disabled} trailing={item.trailing} onClick={item.onSelect} />;
      })}
    </Popout>
  );
}
