import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Button, ContentCard } from '../bleh'
import { PageFrame } from '../shell'
import { Skeleton } from '../ui/Skeleton'
import { cn } from '../../lib/cn'
import { DetailHero } from './DetailHero'
import './detail.css'

/** Hero (eyebrow + year/month title, no artwork) followed by the content card. */
export function RecapPage({ eyebrow, title, children }: { eyebrow: ReactNode; title: ReactNode; children: ReactNode }) {
  return (
    <>
      <DetailHero eyebrow={eyebrow} title={title} />
      <PageFrame>
        <ContentCard main={<div className="dt-main animate-fade">{children}</div>} />
      </PageFrame>
    </>
  )
}

/** Centered message card for error and empty states (replaces the page body). */
export function RecapMessage({ icon, title, body }: { icon: ReactNode; title: ReactNode; body?: ReactNode }) {
  return (
    <PageFrame>
      <div className="dt-empty-card dt-recap-msg">
        <div className="dt-recap-msg-icon" aria-hidden="true">{icon}</div>
        <p className="dt-recap-msg-title">{title}</p>
        {body && <p className="dt-recap-msg-body">{body}</p>}
        <Button appearance="primary" label="Back to Profile" to="/app/profile" />
      </div>
    </PageFrame>
  )
}

/** Placeholder layout shown while the recap loads. */
export function RecapSkeleton() {
  return (
    <PageFrame>
      <div className="dt-main">
        <div className="dt-about dt-recap-stat dt-recap-stat--lg">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-12 w-40" />
        </div>
        <div className="dt-grid3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="dt-about dt-recap-stat">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-28" />
            </div>
          ))}
        </div>
        <div className="dt-about">
          <Skeleton className="h-4 w-32 mb-4" />
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-4 w-full mb-3" />
          ))}
        </div>
      </div>
    </PageFrame>
  )
}

interface RecapStatProps {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  /** Large centered headline number (total hours). */
  large?: boolean
  /** Accent-coloured value. */
  accent?: boolean
}

export function RecapStat({ label, value, sub, large, accent }: RecapStatProps) {
  return (
    <div className={cn('dt-about dt-recap-stat', large && 'dt-recap-stat--lg')}>
      <p className="dt-mono-label">{label}</p>
      <p className={cn('dt-recap-value', large && 'dt-recap-value--lg', accent && 'dt-recap-value--accent')}>{value}</p>
      {sub && <p className="dt-recap-sub">{sub}</p>}
    </div>
  )
}

/** Numbered list (#1, #2, ...) of names, or a fallback line when empty. */
export function RecapRank({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (items.length === 0) {
    return <p className="dt-recap-sub">{emptyText}</p>
  }
  return (
    <ol className="dt-rank">
      {items.map((name, index) => (
        <li key={`${index}-${name}`} className="dt-rank-item">
          <span className="dt-rank-no">#{index + 1}</span>
          <span className="dt-rank-name">{name}</span>
        </li>
      ))}
    </ol>
  )
}

export function RecapLink({ to, title, subtitle }: { to: string; title: ReactNode; subtitle: ReactNode }) {
  return (
    <Link to={to} className="dt-recap-link">
      <span className="dt-recap-link-title">{title}</span>
      <span className="dt-recap-sub">{subtitle}</span>
    </Link>
  )
}
