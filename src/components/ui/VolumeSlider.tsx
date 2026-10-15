import { Range } from '../bleh/ui/Range'
import { Tooltip } from '../bleh/ui/Tooltip'
import { VolumeFilled, VolumeOffFilled } from '@mingcute/react/core-filled'
import '../layout/PlayerBar.css'

interface VolumeSliderProps {
  volume: number
  isMuted: boolean
  onVolumeChange: (v: number) => void
  onToggleMute: () => void
  className?: string
}

/** Mute toggle + bleh Range volume slider (shared by PlayerBar and FullScreenPlayer). */
export function VolumeSlider({ volume, isMuted, onVolumeChange, onToggleMute, className = '' }: VolumeSliderProps) {
  const effectiveVolume = isMuted ? 0 : volume
  const isSilent = isMuted || volume === 0
  const label = isSilent ? 'Unmute' : 'Mute'
  const Icon = isSilent ? VolumeOffFilled : VolumeFilled

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Tooltip content={label}>
        <button
          type="button"
          onClick={onToggleMute}
          className="player-bar__icon"
          aria-label={label}
        >
          <Icon size={18} />
        </button>
      </Tooltip>
      <div className="player-bar__volume">
        <Range
          label="Volume"
          value={effectiveVolume}
          min={0}
          max={1}
          step={0.01}
          onChange={onVolumeChange}
          format={v => `${Math.round(v * 100)}%`}
        />
      </div>
    </div>
  )
}
