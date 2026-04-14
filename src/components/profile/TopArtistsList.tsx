
interface TopArtistsListProps {
  artists: { artist: string; hours: number }[]
}

export function TopArtistsList({ artists }: TopArtistsListProps) {
  if (artists.length === 0) {
    return null
  }

  return (
    <div className="mb-6">
      <h3
        className="text-lg font-[var(--font-weight-bold)] mb-3"
        style={{ color: 'hsl(var(--c1))' }}
      >
        Top Artists (by listening time)
      </h3>
      <div className="space-y-2">
        {artists.map((item, index) => (
          <div
            key={item.artist}
            className="flex items-center justify-between py-2"
            style={{
              borderBottom: index < artists.length - 1 ? '1px solid hsl(var(--b4) / 0.25)' : 'none'
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="text-sm font-mono font-[var(--font-weight-medium)]"
                style={{ color: 'hsl(var(--c3))' }}
              >
                {index + 1}.
              </span>
              <span
                className="font-[var(--font-weight-medium)]"
                style={{ color: 'hsl(var(--c1))' }}
              >
                {item.artist}
              </span>
            </div>
            <span
              className="text-sm font-mono"
              style={{ color: 'hsl(var(--h3))' }}
            >
              {item.hours.toFixed(1)} hrs
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
