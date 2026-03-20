import { useEffect, useRef } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, title, children, className = '' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    // Prevent body scroll
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center animate-[fade-in_0.15s_ease-out]"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* Content */}
      <div
        className={`relative bg-[hsl(var(--b5)/0.85)] backdrop-blur-xl border border-[hsl(var(--br1)/0.5)] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] w-full max-w-md mx-4 max-h-[85vh] flex flex-col animate-[solarium_0.2s_var(--ease-spring)] ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors p-1 cursor-pointer rounded-lg hover:bg-surface-hover active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
