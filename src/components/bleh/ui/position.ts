export type Side = 'top' | 'bottom';
export type Align = 'start' | 'center' | 'end';

export interface Box { left: number; top: number; width: number; height: number }
export interface Size { width: number; height: number }

export interface PlaceOptions {
  side: Side;
  align?: Align;
  /** Gap between anchor and floating element. */
  offset: number;
  /** Minimum distance to the viewport edge (shift + flip). */
  padding?: number;
  viewport?: Size;
}

/**
 * Tiny floating-ui style positioner: flip to the other side when the preferred
 * one lacks room, then shift along the cross axis to stay inside the viewport.
 */
export function computePosition(anchor: Box, floating: Size, o: PlaceOptions): { left: number; top: number; side: Side } {
  const pad = o.padding ?? 6;
  const vw = o.viewport?.width ?? window.innerWidth;
  const vh = o.viewport?.height ?? window.innerHeight;
  const need = floating.height + o.offset + pad;
  const above = anchor.top;
  const below = vh - (anchor.top + anchor.height);

  let side = o.side;
  if (side === 'top' && above < need && below > above) side = 'bottom';
  else if (side === 'bottom' && below < need && above > below) side = 'top';

  const align = o.align ?? 'center';
  let left = align === 'start' ? anchor.left
    : align === 'end' ? anchor.left + anchor.width - floating.width
    : anchor.left + (anchor.width - floating.width) / 2;
  left = Math.max(pad, Math.min(left, vw - floating.width - pad));

  const top = side === 'bottom'
    ? anchor.top + anchor.height + o.offset
    : anchor.top - o.offset - floating.height;
  return { left, top, side };
}

export function boxOf(el: Element): Box {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}
