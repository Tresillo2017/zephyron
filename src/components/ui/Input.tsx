interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--c2))' }}>{label}</label>
      )}
      <input
        className={`w-full px-3 py-2 rounded-[var(--button-radius)] text-sm placeholder:text-text-muted focus:outline-none transition-all duration-200 ${className}`}
        style={{
          background: 'hsl(var(--b4) / 0.4)',
          color: 'hsl(var(--c1))',
          boxShadow: error ? 'inset 0 0 0 1px hsl(0, 60%, 50%)' : 'none',
          transitionTimingFunction: 'var(--ease-out-custom)',
        }}
        onFocus={(e) => { e.currentTarget.style.boxShadow = 'inset 0 0 0 1px hsl(var(--h3) / 0.5)'; props.onFocus?.(e) }}
        onBlur={(e) => { e.currentTarget.style.boxShadow = error ? 'inset 0 0 0 1px hsl(0, 60%, 50%)' : 'none'; props.onBlur?.(e) }}
        {...props}
      />
      {error && <p className="text-xs" style={{ color: 'hsl(0, 60%, 55%)' }}>{error}</p>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-[var(--font-weight-medium)]" style={{ color: 'hsl(var(--c2))' }}>{label}</label>
      )}
      <textarea
        className={`w-full px-3 py-2 rounded-[var(--button-radius)] text-sm placeholder:text-text-muted focus:outline-none transition-all duration-200 resize-none ${className}`}
        style={{
          background: 'hsl(var(--b4) / 0.4)',
          color: 'hsl(var(--c1))',
          boxShadow: error ? 'inset 0 0 0 1px hsl(0, 60%, 50%)' : 'none',
          transitionTimingFunction: 'var(--ease-out-custom)',
        }}
        {...props}
      />
      {error && <p className="text-xs" style={{ color: 'hsl(0, 60%, 55%)' }}>{error}</p>}
    </div>
  )
}
