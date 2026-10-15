import { Modal as BlehModal } from '../bleh/ui/Modal'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_WIDTH = { sm: 360, md: 460, lg: 580 } as const

/**
 * Legacy Zephyron modal. Same props as before; renders the bleh glass dialog
 * (scrim, rise-in, Escape / backdrop to close, focus return). Mount is driven by `isOpen`.
 */
export function Modal({ isOpen, onClose, title, children, className, size = 'md' }: ModalProps) {
  if (!isOpen) return null
  return (
    <BlehModal title={title} onClose={onClose} width={SIZE_WIDTH[size]} className={className}>
      {children}
    </BlehModal>
  )
}
