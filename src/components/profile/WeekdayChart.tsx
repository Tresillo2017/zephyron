
interface WeekdayChartProps {
  data: { day: string; hours: number }[]
}

export function WeekdayChart({ data }: WeekdayChartProps) {
  const maxHours = Math.max(...data.map(d => d.hours))

  return (
    <div className="mb-6">
      <h3
        className="text-lg font-[var(--font-weight-bold)] mb-3"
        style={{ color: 'hsl(var(--c1))' }}
      >
        Weekday Breakdown
      </h3>
      <div className="space-y-2">
        {data.map(item => (
          <div key={item.day} className="flex items-center gap-3">
            <span
              className="text-sm font-mono w-8"
              style={{ color: 'hsl(var(--c2))' }}
            >
              {item.day}
            </span>
            <div className="flex-1 h-6 rounded" style={{ backgroundColor: 'hsl(var(--b4))' }}>
              <div
                className="h-full rounded transition-all duration-300"
                style={{
                  width: `${maxHours > 0 ? (item.hours / maxHours) * 100 : 0}%`,
                  backgroundColor: 'hsl(var(--h3))'
                }}
              />
            </div>
            <span
              className="text-sm font-mono w-12 text-right"
              style={{ color: 'hsl(var(--c1))' }}
            >
              {item.hours}h
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
