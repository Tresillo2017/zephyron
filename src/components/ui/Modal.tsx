import { useEffect, useState } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' }

export function Modal({ isOpen, onClose, title, children, className = '', size = 'md' }: ModalProps) {
  const [rendered, setRendered] = useState(isOpen)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setRendered(true)
      setExiting(false)
    } else if (rendered) {
      setExiting(true)
      const t = setTimeout(() => { setRendered(false); setExiting(false) }, 200)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    if (!rendered) return
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [rendered, onClose])

  if (!rendered) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        exiting
          ? 'animate-[fade-out_0.15s_ease-in_forwards]'
          : 'animate-[fade-in_0.15s_ease-out]'
      }`}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      <div
        className={`relative w-full ${SIZE_CLASSES[size]} mx-4 max-h-[85vh] flex flex-col ${
          exiting
            ? 'animate-[solarium-out_0.2s_ease-in_forwards]'
            : 'animate-[solarium_0.2s_var(--ease-spring)]'
        } ${className}`}
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
