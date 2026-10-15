import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { PlayFilled, SparklesFilled, GroupFilled } from '@mingcute/react/core-filled'
import { Button } from '../components/bleh'
import { Logo } from '../components/ui/Logo'
import { fetchSets, getCoverUrl } from '../lib/api'
import type { DjSet } from '../lib/types'
import './LandingPage.css'

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #2a1060, #5a20a0)',
  'linear-gradient(135deg, #0a1a50, #1a4090)',
  'linear-gradient(135deg, #0a2820, #1a6050)',
  'linear-gradient(135deg, #301020, #701040)',
  'linear-gradient(135deg, #1a1808, #504010)',
  'linear-gradient(135deg, #280a28, #681068)',
]

const WAVE_BARS = 80

function idToGradient(id: string): string {
  return COVER_GRADIENTS[id.charCodeAt(0) % COVER_GRADIENTS.length]
}

function genreTag(genre: string): string {
  return `#${genre.toLowerCase().replace(/[\s/&]+/g, '-')}`
}

/** Staggered entrance: each item gets its own --delay so the page assembles top to bottom. */
function delay(step: number): CSSProperties {
  return { '--delay': `${0.05 + step * 0.08}s` } as CSSProperties
}

function useLandingData(): { featured: DjSet | null; recent: DjSet[]; loading: boolean } {
  const [featured, setFeatured] = useState<DjSet | null>(null)
  const [recent, setRecent] = useState<DjSet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchSets({ sort: 'popular', pageSize: 1 }),
      fetchSets({ sort: 'newest', pageSize: 6 }),
    ])
      .then(([pop, rec]) => {
        setFeatured(pop.data[0] ?? null)
        setRecent(rec.data)
      })
      .catch((err) => { console.error('[LandingPage] API error', err) })
      .finally(() => setLoading(false))
  }, [])

  return { featured, recent, loading }
}

function WaveformDecoration() {
  return (
    <div className="lp-wave" aria-hidden="true">
      {Array.from({ length: WAVE_BARS }, (_, i) => (
        <div
          key={i}
          className="lp-wave-bar"
          style={{
            height: `${12 + Math.abs(Math.sin(i * 0.4) * 32)}px`,
            opacity: 0.4 + Math.abs(Math.sin(i * 0.3)) * 0.6,
          }}
        />
      ))}
    </div>
  )
}

function Cover({ set, className }: { set: DjSet; className: string }) {
  if (set.cover_image_r2_key) {
    return <img src={getCoverUrl(set.id)} alt={set.title} className={className} loading="lazy" />
  }
  return <div className={`${className} lp-card-fallback`} style={{ background: idToGradient(set.id) }} aria-hidden="true" />
}

function HeroSkeleton() {
  return (
    <section className="lp-hero" aria-busy="true" aria-label="Loading">
      <div className="lp-hero-body">
        <div className="lp-hero-copy w-full max-w-xl space-y-4">
          <div className="lp-skel h-3 w-32 rounded-full" />
          <div className="lp-skel h-14 w-80 rounded-xl" />
          <div className="lp-skel h-14 w-64 rounded-xl" />
          <div className="lp-skel h-5 w-96 rounded-lg" />
          <div className="flex gap-3 pt-2">
            <div className="lp-skel h-9 w-36 rounded-[9px]" />
            <div className="lp-skel h-9 w-24 rounded-[9px]" />
          </div>
        </div>
      </div>
    </section>
  )
}

function GridSkeleton() {
  return (
    <section className="lp-section" aria-busy="true" aria-label="Loading sets">
      <div className="lp-section-inner">
        <div className="lp-skel mb-6 h-3 w-32 rounded-full" />
        <div className="lp-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="lp-card">
              <div className="lp-skel aspect-video rounded-none" />
              <div className="space-y-2 p-3.5">
                <div className="lp-skel h-3 w-3/4 rounded-full" />
                <div className="lp-skel h-3 w-1/2 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function LandingSetCard({ set, step }: { set: DjSet; step: number }) {
  const durationMin = Math.round(set.duration_seconds / 60)

  return (
    <Link to={`/app/sets/${set.id}`} className="lp-card animate-item" style={delay(step)}>
      <div className="lp-card-cover">
        <Cover set={set} className="lp-card-img" />
        <div className="lp-card-play" aria-hidden="true">
          <PlayFilled />
        </div>
      </div>
      <div className="lp-card-info">
        <p className="lp-card-title">{set.title}</p>
        <div className="lp-card-meta">
          <span>{set.artist}</span>
          {durationMin > 0 && <span className="shrink-0">· {durationMin}m</span>}
        </div>
        {set.genre && <span className="lp-tag">{genreTag(set.genre)}</span>}
      </div>
    </Link>
  )
}

function CatalogGrid({ sets }: { sets: DjSet[] }) {
  if (sets.length === 0) return null

  return (
    <section className="lp-section">
      <div className="lp-section-inner">
        <div className="lp-section-head">
          <h2 className="lp-section-title setting-head">Recently added</h2>
          <Link to="/register" className="lp-link">Browse all →</Link>
        </div>
        <div className="lp-grid">
          {sets.map((set, i) => (
            <LandingSetCard key={set.id} set={set} step={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

const FEATURES = [
  {
    icon: <SparklesFilled />,
    title: 'AI track detection',
    description: 'YouTube descriptions, comments, and metadata analyzed to identify every track with timestamps. Enriched via Last.fm for complete artist and release data.',
    stat: '94%',
    statLabel: 'average detection accuracy',
  },
  {
    icon: <GroupFilled />,
    title: 'Community verification',
    description: 'Users vote on detections and submit corrections. Verified tracks show consensus scores. The community fills in what AI misses.',
    stat: '12k+',
    statLabel: 'community corrections',
  },
]

function FeaturesSection() {
  return (
    <section className="lp-section">
      <div className="lp-section-inner lp-features">
        {FEATURES.map((f, i) => (
          <article key={f.title} className="lp-panel animate-item" style={delay(i)}>
            <div className="lp-panel-icon" aria-hidden="true">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.description}</p>
            <p className="lp-stat">{f.stat}</p>
            <p className="lp-stat-label">{f.statLabel}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function CtaSection() {
  return (
    <section className="lp-section lp-cta">
      <div className="lp-cta-glow" aria-hidden="true" />
      <div className="lp-section-inner">
        <h2 className="setting-head italic">Ready to listen?</h2>
        <p>Join the community building the most complete database of DJ set tracklists.</p>
        <div className="lp-actions">
          <Button to="/register" appearance="primary" label="Request access" />
          <Button to="/login" appearance="default" label="Sign in" />
        </div>
      </div>
    </section>
  )
}

function Hero({ featured }: { featured: DjSet | null }) {
  const hasCover = !!featured?.cover_image_r2_key

  return (
    <section className="lp-hero">
      {hasCover ? (
        <img src={getCoverUrl(featured!.id)} alt="" aria-hidden="true" className="lp-hero-media" />
      ) : (
        <div
          className="lp-hero-media"
          aria-hidden="true"
          style={featured ? { background: idToGradient(featured.id) } : undefined}
        />
      )}
      <div className="lp-hero-glow" aria-hidden="true" />
      <WaveformDecoration />
      <div className="lp-hero-scrim" aria-hidden="true" />

      <div className="lp-hero-body">
        <div className="lp-hero-copy animate-item" style={delay(0)}>
          <div className="lp-eyebrow">
            <span className="lp-eyebrow-dot" aria-hidden="true" />
            Invite-only beta
          </div>
          <h1 className="lp-title setting-head" style={{ fontStyle: 'normal' }}>
            Every DJ set,<br />
            <span className="lp-title-accent">every track</span> identified.
          </h1>
          <p className="lp-lede animate-item" style={delay(1)}>
            Curated festival and club mixes with community-verified tracklists. Find sets by artist, event, or track.
          </p>
          <div className="lp-actions animate-item" style={delay(2)}>
            <Button to="/register" appearance="primary" label="Request access" />
            <Button to="/login" appearance="default" label="Sign in" />
          </div>
        </div>

        {featured && (
          <Link to={`/app/sets/${featured.id}`} className="lp-feature glass-surface animate-item" style={delay(3)}>
            <span className="lp-feature-label">Most played</span>
            <span className="lp-feature-title">{featured.title}</span>
            <span className="lp-feature-artist">{featured.artist}</span>
            {featured.genre && <span className="lp-tag">{genreTag(featured.genre)}</span>}
          </Link>
        )}
      </div>
    </section>
  )
}

export function LandingPage() {
  const { featured, recent, loading } = useLandingData()

  return (
    <div className="lp-page">
      <header className="lp-nav">
        <Link to="/" className="lp-brand" aria-label="Zephyron home">
          <Logo size={32} />
          <span className="lp-brand-name">Zephyron</span>
        </Link>
        <nav className="lp-nav-links" aria-label="Account">
          <Link to="/login" className="lp-nav-link">Sign in</Link>
          <Button to="/register" appearance="primary" label="Get access" />
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        {loading ? <HeroSkeleton /> : <Hero featured={featured} />}
        {loading ? <GridSkeleton /> : <CatalogGrid sets={recent} />}
        <FeaturesSection />
        <CtaSection />
      </main>

      <footer className="lp-foot">
        <p>&copy; {new Date().getFullYear()} Zephyron</p>
        <nav className="lp-foot-links" aria-label="Legal">
          <Link to="/app/profile?tab=about">About</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <a href="https://github.com/tresillo2017/zephyron" target="_blank" rel="noopener noreferrer">GitHub</a>
        </nav>
      </footer>
    </div>
  )
}
