interface SliderProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  label?: string
  displayValue?: string
}

export function Slider({ value, min, max, step = 1, onChange, label, displayValue }: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100

  return (
    <div className="flex items-center gap-4">
      {label && <span className="text-sm text-text-secondary shrink-0">{label}</span>}
      <div className="flex-1 relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-[6px] rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, hsl(var(--h3)) 0%, hsl(var(--h3)) ${percent}%, hsl(var(--b3)) ${percent}%, hsl(var(--b3)) 100%)`,
          }}
        />
      </div>
      {displayValue !== undefined && (
        <span className="text-sm font-mono text-text-muted w-10 text-right shrink-0">{displayValue}</span>
      )}
    </div>
  )
}
