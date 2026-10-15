import { LeftSmallFilled, RightSmallFilled } from '@mingcute/react/core-filled';
import { IconButton } from './IconButton';
import { Button } from '../Button';

const EDGE = 1;
const AROUND = 1;

/** Page numbers (0-based) to show, with `null` for a gap: first, last and the current page's neighbours. */
export function pageWindow(page: number, pageCount: number): (number | null)[] {
  const keep = new Set<number>();
  for (let i = 0; i < pageCount; i++) {
    if (i < EDGE || i >= pageCount - EDGE || Math.abs(i - page) <= AROUND) keep.add(i);
  }
  const out: (number | null)[] = [];
  let prev = -1;
  for (const i of [...keep].sort((a, b) => a - b)) {
    if (prev !== -1 && i - prev > 1) out.push(null);
    out.push(i);
    prev = i;
  }
  return out;
}

interface PaginationProps {
  /** 0-based current page. */
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

/** "11–20 of 54" plus prev / numbered pages / next. Renders nothing when everything fits on one page. */
export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const pageCount = Math.ceil(total / pageSize);
  if (pageCount <= 1) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <nav className="mt-[15px] flex flex-wrap items-center justify-between gap-3" aria-label={'Pagination'}>
      <span className="text-[13px] text-muted tabular-nums">{`${from}–${to} of ${total}`}</span>
      <div className="flex items-center gap-1">
        <IconButton size="sm" label={'Previous page'} disabled={page === 0} onClick={() => onChange(page - 1)}>
          <LeftSmallFilled />
        </IconButton>
        {pageWindow(page, pageCount).map((p, i) =>
          p === null
            ? <span key={`gap${i}`} className="px-1 text-muted" aria-hidden>…</span>
            : <Button key={p} size="sm" appearance={p === page ? 'primary' : 'ghost'} label={String(p + 1)} onClick={() => onChange(p)} aria-current={p === page ? 'page' : undefined} />
        )}
        <IconButton size="sm" label={'Next page'} disabled={page >= pageCount - 1} onClick={() => onChange(page + 1)}>
          <RightSmallFilled />
        </IconButton>
      </div>
    </nav>
  );
}
