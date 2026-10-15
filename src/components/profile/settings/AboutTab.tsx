import { Link } from 'react-router'
import { Section } from '../../bleh'

const HOW_IT_WORKS = [
  { title: 'AI Detection', desc: 'Our AI analyzes YouTube descriptions, comments, and metadata to identify tracks with timestamps, then enriches them via Last.fm.' },
  { title: 'Community Corrections', desc: "Users vote on detections and submit corrections. The community's collective knowledge fills in what AI misses." },
  { title: 'Self-Improving ML', desc: 'Every correction feeds back into our detection prompts. The system gets smarter with every listen and every vote.' },
]

const BUILT_WITH = [
  { label: 'Frontend', value: 'React 19 + Vite 7' },
  { label: 'Styling', value: 'Tailwind CSS 4' },
  { label: 'Backend', value: 'Cloudflare Workers' },
  { label: 'Database', value: 'Cloudflare D1' },
  { label: 'Storage', value: 'Cloudflare R2' },
  { label: 'AI', value: 'Workers AI' },
  { label: 'Search', value: 'Vectorize' },
  { label: 'Auth', value: 'Better Auth' },
]

export function AboutTab() {
  return (
    <>
      <Section title={<>The platform built for <span style={{ color: 'oklch(var(--h3))' }}>DJ sets</span></>}>
        <div className="flex flex-col gap-3 text-sm leading-relaxed" style={{ color: 'oklch(var(--c2))' }}>
          <p>
            Zephyron exists because DJ sets deserve better. Festival mixes, club recordings,
            and radio shows are some of the most exciting music experiences out there, yet
            finding out what tracks are playing has always been a pain.
          </p>
          <p>
            We&apos;re building a curated streaming platform where every set comes with an intelligent,
            community-refined tracklist. No more Shazam-ing mid-set. No more digging through
            YouTube comments. Just press play and know what you&apos;re hearing.
          </p>
          <Link to="/app/changelog" className="font-mono text-xs no-underline hover:underline" style={{ color: 'oklch(var(--c3))' }}>
            v{__APP_VERSION__}
          </Link>
        </div>
      </Section>

      <Section title="How it works">
        <div className="grid gap-3 sm:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.title} className="card p-3">
              <h4 className="text-xs font-[var(--font-weight-medium)] mb-1" style={{ color: 'oklch(var(--c1))' }}>{item.title}</h4>
              <p className="text-xs leading-relaxed" style={{ color: 'oklch(var(--c3))' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Built with">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BUILT_WITH.map((item) => (
            <div key={item.label}>
              <p className="text-xs" style={{ color: 'oklch(var(--c3))' }}>{item.label}</p>
              <p className="text-xs font-[var(--font-weight-medium)]" style={{ color: 'oklch(var(--c1))' }}>{item.value}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Creator">
        <p className="setting-body" style={{ margin: '-4px 0 0' }}>
          Zephyron is built by a solo developer passionate about electronic music and the intersection of AI and community curation.
        </p>
        <a
          href="https://github.com/tresillo2017/zephyron/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 px-3 py-1.5 rounded-lg text-xs no-underline transition-colors"
          style={{ background: 'oklch(var(--b4) / 0.5)', color: 'oklch(var(--c1))', boxShadow: 'inset 0 0 0 1px oklch(var(--b4))' }}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Open an issue on GitHub
        </a>
      </Section>
    </>
  )
}
