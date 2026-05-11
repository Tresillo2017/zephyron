import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Logo } from '../components/ui/Logo'
import { fetchSets, getCoverUrl } from '../lib/api'
import type { DjSet } from '../lib/types'

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #2a1060, #5a20a0)',
  'linear-gradient(135deg, #0a1a50, #1a4090)',
  'linear-gradient(135deg, #0a2820, #1a6050)',
  'linear-gradient(135deg, #301020, #701040)',
  'linear-gradient(135deg, #1a1808, #504010)',
  'linear-gradient(135deg, #280a28, #681068)',
]

function idToGradient(id: string): string {
  return COVER_GRADIENTS[id.charCodeAt(0) % COVER_GRADIENTS.length]
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
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { featured, recent, loading }
}

function WaveformDecoration() {
  return (
    <div className="absolute bottom-28 right-0 w-1/2 h-14 flex items-center gap-0.5 opacity-20 pointer-events-none px-10">
      {Array.from({ length: 80 }, (_, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm"
          style={{
            height: `${12 + Math.abs(Math.sin(i * 0.4) * 32)}px`,
            background: 'hsl(var(--h3))',
            opacity: 0.4 + Math.abs(Math.sin(i * 0.3)) * 0.6,
          }}
        />
      ))}
    </div>
  )
}

function HeroSkeleton() {
  return (
    <section className="relative h-[560px] sm:h-[600px] overflow-hidden flex items-end">
      <div className="absolute inset-0 animate-pulse" style={{ background: 'hsl(var(--b5))' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, hsl(var(--b6)) 0%, hsl(var(--b6) / 0.7) 30%, transparent 100%)' }} />
      <div className="relative z-10 px-5 sm:px-8 lg:px-16 pb-12 w-full flex items-end justify-between gap-8">
        <div className="max-w-xl space-y-4">
          <div className="h-3 w-32 rounded-full animate-pulse" style={{ background: 'hsl(var(--b4))' }} />
          <div className="h-10 w-80 rounded-xl animate-pulse" style={{ background: 'hsl(var(--b4))' }} />
          <div className="h-10 w-64 rounded-xl animate-pulse" style={{ background: 'hsl(var(--b4))' }} />
          <div className="h-5 w-96 rounded-lg animate-pulse" style={{ background: 'hsl(var(--b4))' }} />
          <div className="flex gap-3 pt-2">
            <div className="h-11 w-36 rounded-xl animate-pulse" style={{ background: 'hsl(var(--b4))' }} />
            <div className="h-11 w-24 rounded-xl animate-pulse" style={{ background: 'hsl(var(--b4))' }} />
          </div>
        </div>
      </div>
    </section>
  )
}

function LandingSetCard({ set }: { set: DjSet }) {
  const durationMin = Math.round(set.duration_seconds / 60)

  return (
    <Link
      to={`/app/sets/${set.id}`}
      className="group flex flex-col no-underline rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: 'hsl(var(--b5))',
        boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.25)',
      }}
    >
      {/* Cover */}
      <div className="relative aspect-video overflow-hidden">
        {set.cover_image_r2_key ? (
          <img
            src={getCoverUrl(set.id)}
            alt={set.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: idToGradient(set.id) }}
          />
        )}
        {/* Hover overlay */}
        <div
          className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
          style={{ background: 'hsl(var(--b6) / 0.5)' }}
        >
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5 flex flex-col gap-1.5">
        <p className="text-sm font-semibold truncate" style={{ color: 'hsl(var(--c1))' }}>
          {set.title}
        </p>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(var(--c3))' }}>
          <span className="truncate">{set.artist}</span>
          <span>·</span>
          <span className="shrink-0">{durationMin}m</span>
        </div>
        {set.genre && (
          <span
            className="self-start px-1.5 py-0.5 text-xs font-mono rounded mt-0.5"
            style={{ background: 'hsl(var(--h3) / 0.1)', color: 'hsl(var(--h2) / 0.8)' }}
          >
            #{set.genre.toLowerCase().replace(/[\s/&]+/g, '-')}
          </span>
        )}
      </div>
    </Link>
  )
}

function GridSkeleton() {
  return (
    <section className="px-5 sm:px-8 lg:px-16 py-16">
      <div className="max-w-6xl mx-auto">
        <div className="h-3 w-32 rounded-full mb-6 animate-pulse" style={{ background: 'hsl(var(--b4))' }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ background: 'hsl(var(--b5))' }}>
              <div className="aspect-video" style={{ background: 'hsl(var(--b4))' }} />
              <div className="p-3.5 space-y-2">
                <div className="h-3 rounded-full w-3/4" style={{ background: 'hsl(var(--b4))' }} />
                <div className="h-3 rounded-full w-1/2" style={{ background: 'hsl(var(--b4))' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CatalogGrid({ sets }: { sets: DjSet[] }) {
  if (sets.length === 0) return null

  return (
    <section className="px-5 sm:px-8 lg:px-16 py-16">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-mono tracking-widest uppercase" style={{ color: 'hsl(var(--c3))' }}>
            Recently Added
          </span>
          <Link to="/register" className="text-xs no-underline transition-colors" style={{ color: 'hsl(var(--h2))' }}>
            Browse all →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sets.map((set) => (
            <LandingSetCard key={set.id} set={set} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  const features = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
        </svg>
      ),
      title: 'AI Track Detection',
      description: 'YouTube descriptions, comments, and metadata analyzed to identify every track with timestamps. Enriched via Last.fm for complete artist and release data.',
      stat: '94%',
      statLabel: 'average detection accuracy',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
        </svg>
      ),
      title: 'Community Verification',
      description: 'Users vote on detections and submit corrections. Verified tracks show consensus scores. The community fills in what AI misses.',
      stat: '12k+',
      statLabel: 'community corrections',
    },
  ]

  return (
    <section className="px-5 sm:px-8 lg:px-16 py-16" style={{ borderTop: '1px solid hsl(var(--b4) / 0.25)' }}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-xl p-6"
            style={{
              background: 'hsl(var(--b5))',
              boxShadow: 'inset 0 0 0 1px hsl(var(--b4) / 0.25)',
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
              style={{ background: 'hsl(var(--h3) / 0.12)', color: 'hsl(var(--h2))' }}
            >
              {f.icon}
            </div>
            <h3 className="text-base font-semibold mb-2" style={{ color: 'hsl(var(--c1))' }}>
              {f.title}
            </h3>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'hsl(var(--c2))' }}>
              {f.description}
            </p>
            <p className="text-2xl font-bold font-mono" style={{ color: 'hsl(var(--h2))' }}>
              {f.stat}
            </p>
            <p className="text-xs font-mono uppercase tracking-wider mt-0.5" style={{ color: 'hsl(var(--c3))' }}>
              {f.statLabel}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function CtaSection() {
  return (
    <section className="px-5 sm:px-8 lg:px-16 py-20 sm:py-28" style={{ borderTop: '1px solid hsl(var(--b4) / 0.25)' }}>
      <div className="relative max-w-2xl mx-auto text-center">
        <div
          className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none"
        >
          <div className="w-[300px] h-[200px] rounded-full mx-auto" style={{ background: 'hsl(var(--h3) / 0.06)', filter: 'blur(100px)' }} />
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold mb-4 tracking-tight" style={{ color: 'hsl(var(--c1))' }}>
          Ready to listen?
        </h2>
        <p className="leading-relaxed mb-10 max-w-md mx-auto text-sm sm:text-base" style={{ color: 'hsl(var(--c2))' }}>
          Join the community building the most complete database of DJ set tracklists.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/register"
            className="px-6 py-3 text-white font-medium rounded-xl no-underline transition-all active:scale-[0.98] text-sm"
            style={{ background: 'hsl(var(--h3))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}
          >
            Request Access
          </Link>
          <Link
            to="/login"
            className="px-6 py-3 rounded-xl no-underline transition-all active:scale-[0.98] text-sm"
            style={{ border: '1px solid hsl(var(--b3) / 0.5)', color: 'hsl(var(--c2))' }}
          >
            Sign In
          </Link>
        </div>
      </div>
    </section>
  )
}

function Hero({ featured }: { featured: DjSet | null }) {
  const hasCover = !!featured?.cover_image_r2_key

  return (
    <section className="relative h-[560px] sm:h-[600px] overflow-hidden flex items-end">

      {/* Background: cover image or gradient */}
      {hasCover ? (
        <img
          src={getCoverUrl(featured!.id)}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: featured ? idToGradient(featured.id) : 'linear-gradient(135deg, hsl(var(--b5)), hsl(var(--b6)))' }}
        />
      )}

      {/* Ambient glow */}
      <div
        className="absolute top-1/4 -left-32 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'hsl(var(--h3) / 0.12)', filter: 'blur(150px)' }}
      />

      {/* Waveform decoration */}
      <WaveformDecoration />

      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, hsl(var(--b6)) 0%, hsl(var(--b6) / 0.75) 30%, hsl(var(--b6) / 0.2) 70%, transparent 100%)' }}
      />

      {/* Content */}
      <div className="relative z-10 px-5 sm:px-8 lg:px-16 pb-12 w-full flex flex-col lg:flex-row items-end justify-between gap-8">

        {/* Bottom-left: headline + CTAs */}
        <div className="max-w-xl">
          {/* Beta badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono tracking-wider rounded-full mb-6"
            style={{ background: 'hsl(var(--h3) / 0.12)', border: '1px solid hsl(var(--h3) / 0.25)', color: 'hsl(var(--h2))' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'hsl(var(--h2))' }} />
            INVITE-ONLY BETA
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] tracking-tight mb-5"
            style={{ color: 'hsl(var(--c1))' }}
          >
            Every DJ set,<br />
            <span style={{ color: 'hsl(var(--h2))', textShadow: '0 0 80px hsl(var(--h3) / 0.4)' }}>
              every track
            </span>{' '}identified.
          </h1>

          <p className="text-base sm:text-lg leading-relaxed mb-8 max-w-lg" style={{ color: 'hsl(var(--c2))' }}>
            Curated festival and club mixes with community-verified tracklists. Find sets by artist, event, or track.
          </p>

          <div className="flex items-center gap-3">
            <Link
              to="/register"
              className="px-6 py-3 text-white font-medium rounded-xl no-underline transition-all active:scale-[0.98] text-sm"
              style={{ background: 'hsl(var(--h3))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 0 40px hsl(var(--h4) / 0.3)' }}
            >
              Request Access
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 rounded-xl no-underline transition-all active:scale-[0.98] text-sm"
              style={{ border: '1px solid hsl(var(--b3) / 0.5)', color: 'hsl(var(--c2))' }}
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Bottom-right: featured set info (hidden on mobile) */}
        {featured && (
          <Link
            to={`/app/sets/${featured.id}`}
            className="hidden lg:block text-right no-underline group shrink-0"
          >
            <p className="text-xs font-mono tracking-widest uppercase mb-1.5" style={{ color: 'hsl(var(--c3))' }}>
              Most Played
            </p>
            <p className="text-base font-semibold group-hover:underline" style={{ color: 'hsl(var(--c1))' }}>
              {featured.title}
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--c2))' }}>
              {featured.artist}
            </p>
            {featured.genre && (
              <div className="flex justify-end mt-2">
                <span
                  className="px-2 py-0.5 text-xs font-mono rounded"
                  style={{ background: 'hsl(var(--h3) / 0.15)', color: 'hsl(var(--h2))' }}
                >
                  #{featured.genre.toLowerCase().replace(/[\s/&]+/g, '-')}
                </span>
              </div>
            )}
          </Link>
        )}
      </div>
    </section>
  )
}

export function LandingPage() {
  const { featured, recent, loading } = useLandingData()

  return (
    <div className="min-h-screen flex flex-col overflow-hidden" style={{ background: 'hsl(var(--b6))' }}>

      {/* ── NAV ── */}
      <header className="flex items-center justify-between px-5 sm:px-8 lg:px-16 py-5 relative z-20">
        <div className="flex items-center gap-2.5">
          <Logo size={32} />
          <span className="text-lg font-semibold tracking-tight" style={{ color: 'hsl(var(--c1))' }}>Zephyron</span>
        </div>
        <nav className="flex items-center gap-5">
          <Link
            to="/login"
            className="text-sm no-underline transition-colors"
            style={{ color: 'hsl(var(--c2))' }}
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 text-white text-sm font-medium rounded-xl no-underline transition-all active:scale-[0.98]"
            style={{
              background: 'hsl(var(--h3))',
              boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.1), 0 0 20px hsl(var(--h3) / 0.35)',
            }}
          >
            Get Access
          </Link>
        </nav>
      </header>

      {loading ? <HeroSkeleton /> : <Hero featured={featured} />}
      {loading ? <GridSkeleton /> : <CatalogGrid sets={recent} />}
      <FeaturesSection />
      <CtaSection />

      {/* ── FOOTER ── */}
      <footer className="px-5 sm:px-8 lg:px-16 py-6 relative z-10" style={{ boxShadow: 'inset 0 1px 0 0 hsl(var(--b4) / 0.25)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs" style={{ color: 'hsl(var(--c3))' }}>
            &copy; {new Date().getFullYear()} Zephyron
          </p>
          <div className="flex items-center gap-5 text-xs">
            <Link to="/app/profile?tab=about" className="no-underline transition-colors" style={{ color: 'hsl(var(--c3))' }}>About</Link>
            <Link to="/privacy" className="no-underline transition-colors" style={{ color: 'hsl(var(--c3))' }}>Privacy</Link>
            <Link to="/terms" className="no-underline transition-colors" style={{ color: 'hsl(var(--c3))' }}>Terms</Link>
            <a href="https://github.com/tresillo2017/zephyron" target="_blank" rel="noopener noreferrer" className="no-underline transition-colors" style={{ color: 'hsl(var(--c3))' }}>GitHub</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
