import { describe, it, expect } from 'vitest';
import { computePosition } from './position';

const viewport = { width: 1000, height: 800 };

describe('computePosition', () => {
  it('centres above the anchor with the offset', () => {
    const p = computePosition({ left: 100, top: 400, width: 40, height: 20 }, { width: 80, height: 30 }, { side: 'top', offset: 2, viewport });
    expect(p).toEqual({ left: 80, top: 368, side: 'top' });
  });

  it('flips to the bottom when there is no room above', () => {
    const p = computePosition({ left: 100, top: 10, width: 40, height: 20 }, { width: 80, height: 30 }, { side: 'top', offset: 2, viewport });
    expect(p.side).toBe('bottom');
    expect(p.top).toBe(32);
  });

  it('flips up when a menu would overflow the bottom', () => {
    const p = computePosition({ left: 100, top: 700, width: 40, height: 28 }, { width: 200, height: 300 }, { side: 'bottom', align: 'start', offset: 10, viewport });
    expect(p).toEqual({ left: 100, top: 390, side: 'top' });
  });

  it('shifts inside the viewport padding', () => {
    const right = computePosition({ left: 980, top: 400, width: 20, height: 20 }, { width: 200, height: 30 }, { side: 'bottom', align: 'start', offset: 10, padding: 6, viewport });
    expect(right.left).toBe(794);
    const left = computePosition({ left: 0, top: 400, width: 20, height: 20 }, { width: 200, height: 30 }, { side: 'bottom', align: 'end', offset: 10, padding: 6, viewport });
    expect(left.left).toBe(6);
  });
});
