import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../../lib/cn';
import { inputClass, textareaClass } from './inputClass';

interface FieldProps { label?: string; hint?: string; error?: string }

function Field({ id, label, hint, error, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {label && <label htmlFor={id} className="ui-field-label">{label}</label>}
      {children}
      {error ? <span className="ui-field-msg" data-error id={`${id}-msg`}>{error}</span>
        : hint ? <span className="ui-field-msg" id={`${id}-msg`}>{hint}</span> : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(
  function Input({ label, hint, error, className, id, ...props }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <Field id={inputId} label={label} hint={hint} error={error}>
        <input
          ref={ref}
          id={inputId}
          className={cn(inputClass, className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${inputId}-msg` : undefined}
          {...props}
        />
      </Field>
    );
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps>(
  function Textarea({ label, hint, error, className, id, ...props }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <Field id={inputId} label={label} hint={hint} error={error}>
        <textarea
          ref={ref}
          id={inputId}
          className={cn(textareaClass, className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${inputId}-msg` : undefined}
          {...props}
        />
      </Field>
    );
  }
);
