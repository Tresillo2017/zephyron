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
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
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
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      <div
        className={`relative w-full max-w-md mx-4 max-h-[85vh] flex flex-col animate-[solarium_0.2s_var(--ease-spring)] ${className}`}
        style={{
          background: 'hsl(var(--b5) / 0.92)',
          backdropFilter: 'var(--card-blur)',
          WebkitBackdropFilter: 'var(--card-blur)',
          borderRadius: 'var(--card-radius)',
          boxShadow: 'var(--card-border), 0 20px 60px hsl(var(--b7) / 0.5)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-base font-[var(--font-weight-bold)]" style={{ color: 'hsl(var(--c1))' }}>{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 cursor-pointer rounded-lg transition-colors"
            style={{ color: 'hsl(var(--c3))' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'hsl(var(--b3) / 0.5)'; e.currentTarget.style.color = 'hsl(var(--c1))' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'hsl(var(--c3))' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-5 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
