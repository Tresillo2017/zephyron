import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { inputClass, textareaClass } from '../bleh/ui/inputClass'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

/** Legacy Zephyron input: label + error wrapper around the bleh `ui-input` recipe. */
export function Input({ label, error, className, id, ...props }: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const msgId = `${inputId}-msg`
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {label && <label htmlFor={inputId} className="ui-field-label">{label}</label>}
      <input
        id={inputId}
        className={cn(inputClass, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? msgId : undefined}
        {...props}
      />
      {error && <span id={msgId} className="ui-field-msg" data-error>{error}</span>}
    </div>
  )
}

/** Legacy Zephyron textarea, same wrapper as Input. */
export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const msgId = `${inputId}-msg`
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {label && <label htmlFor={inputId} className="ui-field-label">{label}</label>}
      <textarea
        id={inputId}
        className={cn(textareaClass, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? msgId : undefined}
        {...props}
      />
      {error && <span id={msgId} className="ui-field-msg" data-error>{error}</span>}
    </div>
  )
}
