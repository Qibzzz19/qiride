import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useOverlayLayer } from '../hooks/useOverlayLayer'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  eyebrow?: string
  children: ReactNode
  footer?: ReactNode
  headerRight?: ReactNode
  contentClassName?: string
  accent?: 'blue' | 'cyan' | 'red'
}

const accentLine = {
  blue: 'from-blue-500/70 via-cyan-400/40 to-transparent',
  cyan: 'from-cyan-400/70 via-blue-500/40 to-transparent',
  red: 'from-red-500/70 via-amber-400/30 to-transparent',
}

export function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  headerRight,
  contentClassName = '',
  accent = 'blue',
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useOverlayLayer(open, onClose, panelRef)

  useEffect(() => {
    if (!open) return
    // Prevent the iOS Safari behind-page from rubber-banding during touch scroll.
    const panel = panelRef.current
    if (!panel) return
    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 1) return
      const target = event.target as Node
      if (!panel.contains(target)) event.preventDefault()
    }
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => document.removeEventListener('touchmove', handleTouchMove)
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-5">
          <motion.button
            type="button"
            aria-label="Tutup panel"
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ y: '100%', opacity: 0.65 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.4 }}
            transition={{ type: 'spring', stiffness: 310, damping: 34, mass: 0.9 }}
            className="relative flex max-h-[92dvh] w-full max-w-[600px] flex-col overflow-hidden rounded-t-[30px] border border-blue-400/[0.14] bg-[#0A101B] shadow-[0_-20px_90px_-20px_rgba(0,0,0,0.95)] outline-none sm:max-h-[88dvh] sm:rounded-[30px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`h-px w-full bg-gradient-to-r ${accentLine[accent]}`} />
            <div className="flex items-center justify-center pt-2.5 pb-0.5 sm:hidden">
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup panel"
                className="flex h-6 w-20 items-center justify-center"
              >
                <span className="h-1 w-10 rounded-full bg-slate-600/70" />
              </button>
            </div>

            <header className="flex shrink-0 items-start justify-between gap-4 px-5 pt-2 pb-4 sm:pt-5">
              <div className="min-w-0">
                {eyebrow && (
                  <p className="mb-1.5 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-300/80">
                    <span className="h-1 w-1 rounded-full bg-cyan-300 shadow-[0_0_7px_rgba(34,211,238,0.8)]" />
                    {eyebrow}
                  </p>
                )}
                <h2
                  id={titleId}
                  className="text-balance text-[22px] font-bold leading-tight tracking-[-0.035em] text-white"
                >
                  {title}
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {headerRight}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Tutup"
                  className="icon-button h-11 w-11 rounded-xl"
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>
            </header>

            <div
              className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 ${contentClassName}`}
            >
              {children}
            </div>

            {footer && (
              <div className="shrink-0 border-t border-white/[0.06] bg-[#0B121F]/95 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+14px)] backdrop-blur-xl sm:pb-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
