import { useEffect, useState, type Ref, type RefCallback } from 'react';

/**
 * Mount/exit lifecycle for animated overlays. `visible` turns on two frames after
 * mount (so the closed styles paint first and the CSS transition runs) and off as
 * soon as `open` drops; `mounted` stays true for `exitMs` so the exit can play.
 */
export function usePresence(open: boolean, exitMs: number) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(() => setVisible(true)); });
      return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(t);
  }, [open, exitMs]);

  return { mounted: mounted || open, visible: visible && open };
}

export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as { current: T | null }).current = node;
    }
  };
}

/** Throttle with a trailing call, so the final value always lands. */
export function throttle<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: A | null = null;
  const run = (args: A) => { last = Date.now(); pending = null; fn(...args); };
  const throttled = (...args: A) => {
    const wait = ms - (Date.now() - last);
    if (wait <= 0) {
      if (timer) { clearTimeout(timer); timer = null; }
      run(args);
      return;
    }
    pending = args;
    timer ??= setTimeout(() => { timer = null; if (pending) run(pending); }, wait);
  };
  throttled.flush = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (pending) run(pending);
  };
  throttled.cancel = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    pending = null;
  };
  return throttled;
}

export const TRANS_FUNCTION = 'cubic-bezier(0.095, 0.41, 0.055, 0.96)';
