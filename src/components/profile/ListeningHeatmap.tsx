import React from 'react'

interface ListeningHeatmapProps {
  data: number[][] // 7x24 grid
}

export function ListeningHeatmap({ data }: ListeningHeatmapProps) {
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Find max value for color scaling
  const maxValue = Math.max(...data.flat())

  // Get color intensity based on value
  const getOpacity = (value: number): number => {
    if (maxValue === 0) return 0
    return value / maxValue
  }

  return (
    <div className="mb-6">
      <h3
        className="text-lg font-[var(--font-weight-bold)] mb-3"
        style={{ color: 'hsl(var(--c1))' }}
      >
        Listening Patterns
      </h3>
      <div className="card p-4">
        <div className="grid grid-cols-[auto_1fr] gap-2">
          {data.map((row, dayIndex) => (
            <React.Fragment key={dayIndex}>
              <div
                className="text-xs font-mono flex items-center justify-end pr-2"
                style={{ color: 'hsl(var(--c3))' }}
              >
                {dayLabels[dayIndex]}
              </div>
              <div className="grid grid-cols-24 gap-0.5">
                {row.map((value, hourIndex) => (
                  <div
                    key={hourIndex}
                    className="aspect-square rounded-sm"
                    style={{
                      backgroundColor: `hsl(var(--h3) / ${getOpacity(value)})`,
                      border: value === 0 ? '1px solid hsl(var(--b4) / 0.25)' : 'none'
                    }}
                    title={`${dayLabels[dayIndex]} ${hourIndex}:00 - ${value} sessions`}
                  />
                ))}
              </div>
            </React.Fragment>
          ))}
        </div>
        <div
          className="text-xs font-mono mt-2 text-center"
          style={{ color: 'hsl(var(--c3))' }}
        >
          00:00 ────────────────────── 23:00
        </div>
      </div>
    </div>
  )
}
