interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-[42px] h-[24px] rounded-full cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${
        checked ? 'bg-accent' : 'bg-[hsl(var(--b3))]'
      }`}
      style={{ transitionDuration: 'var(--trans)', transitionTimingFunction: 'var(--ease-out-custom)' }}
    >
      <span
        className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-[21px]' : 'translate-x-[3px]'
        }`}
        style={{ transitionDuration: 'var(--trans)', transitionTimingFunction: 'var(--ease-out-custom)' }}
      />
    </button>
  )
}
