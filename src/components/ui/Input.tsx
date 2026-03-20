interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-text-secondary">{label}</label>
      )}
      <input
        className={`w-full px-3 py-2 bg-surface-overlay border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/60 transition-all duration-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] ${
          error ? 'border-danger' : ''
        } ${className}`}
        style={{ transitionTimingFunction: 'var(--ease-out-custom)' }}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
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
        <label className="text-sm font-medium text-text-secondary">{label}</label>
      )}
      <textarea
        className={`w-full px-3 py-2 bg-surface-overlay border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/60 transition-all duration-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] resize-none ${
          error ? 'border-danger' : ''
        } ${className}`}
        style={{ transitionTimingFunction: 'var(--ease-out-custom)' }}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
