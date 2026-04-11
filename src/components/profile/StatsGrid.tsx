import React from 'react'

interface StatCardProps {
  value: number
  label: string
  unit?: string
  accent?: boolean
}

function StatCard({ value, label, unit, accent = false }: StatCardProps) {
  return (
    <div className="card flex flex-col items-center justify-center p-6">
      <div
        className="text-4xl font-[var(--font-weight-bold)] mb-2"
        style={{ color: accent ? 'hsl(var(--h3))' : 'hsl(var(--c1))' }}
      >
        {value.toLocaleString()}{unit ? ` ${unit}` : ''}
      </div>
      <div
        className="text-sm font-[var(--font-weight-medium)]"
        style={{ color: 'hsl(var(--c2))' }}
      >
        {label}
      </div>
    </div>
  )
}

interface StatsGridProps {
  totalHours: number
  streakDays: number
  discoveries: number
}

export function StatsGrid({ totalHours, streakDays, discoveries }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <StatCard value={totalHours} label="Total Time" unit="hrs" accent />
      <StatCard value={streakDays} label="Streak" unit="days" />
      <StatCard value={discoveries} label="Discovered" unit="artists" />
    </div>
  )
}
