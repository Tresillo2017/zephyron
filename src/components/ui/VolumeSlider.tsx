import { useCallback } from 'react'

interface VolumeSliderProps {
  volume: number
  isMuted: boolean
  onVolumeChange: (v: number) => void
  onToggleMute: () => void
  /** 'bar' for PlayerBar (uses theme colors), 'fullscreen' for white-on-dark */
  variant?: 'bar' | 'fullscreen'
  className?: string
}

export function VolumeSlider({
  volume, isMuted, onVolumeChange, onToggleMute,
  variant = 'bar', className = '',
}: VolumeSliderProps) {
  const effectiveVolume = isMuted ? 0 : volume
  const percent = effectiveVolume * 100

  const isFs = variant === 'fullscreen'

  const trackBg = isFs ? 'rgba(255,255,255,0.15)' : 'hsl(var(--b3))'
  const fillBg = isFs ? 'rgba(255,255,255,0.8)' : 'hsl(var(--h3))'
  const thumbBg = 'white'
  const iconColor = isFs ? 'rgba(255,255,255,0.5)' : undefined

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(parseFloat(e.target.value))
  }, [onVolumeChange])

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Mute button */}
      <button
        onClick={onToggleMute}
        className="shrink-0 transition-colors"
        style={iconColor ? { color: iconColor } : undefined}
        onMouseEnter={isFs ? (e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.9)' } : undefined}
        onMouseLeave={isFs ? (e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)' } : undefined}
      >
        {isMuted || volume === 0 ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
        ) : volume < 0.5 ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" /></svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
        )}
      </button>

      {/* Track */}
      <div className="relative w-24 h-[6px] rounded-full group cursor-pointer" style={{ background: trackBg }}>
        {/* Filled portion */}
        <div
          className="absolute top-0 left-0 h-full rounded-full pointer-events-none"
          style={{ width: `${percent}%`, background: fillBg, transition: 'width 0.1s linear' }}
        />
        {/* Thumb */}
        <div
          className="absolute top-1/2 rounded-full opacity-0 group-hover:opacity-100 pointer-events-none"
          style={{
            width: 14, height: 14,
            left: `${percent}%`,
            transform: 'translate(-50%, -50%)',
            background: thumbBg,
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            transition: 'opacity 0.15s ease',
          }}
        />
        {/* Invisible range for interaction */}
        <input
          type="range"
          min={0} max={1} step={0.01}
          value={effectiveVolume}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  )
}
