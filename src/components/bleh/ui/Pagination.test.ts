import { describe, it, expect } from 'vitest';
import { pageWindow } from './Pagination';

describe('pageWindow', () => {
  it('shows every page when there are few', () => expect(pageWindow(1, 3)).toEqual([0, 1, 2]));
  it('collapses far pages into gaps around the current one', () => expect(pageWindow(5, 12)).toEqual([0, null, 4, 5, 6, null, 11]));
  it('has no gap next to the edges', () => expect(pageWindow(0, 12)).toEqual([0, 1, null, 11]));
});
